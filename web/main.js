// Rubicon - glue between the simulation, the editor, the renderer and the page.

import { XSIZE, YSIZE, T } from "./tiles.js";
import { Sim } from "./sim.js";
import { Renderer, spriteX, spriteY } from "./render.js";
import { parseLevel, gridToLines, computeGameplayState } from "./level.js";
import { Editor } from "./editor.js";
import { resolveLevelParam, buildShareURL, copyToClipboard } from "./share.js";

const TICK_MS = 1000 / 12;

// Assets are resolved against this module's own URL, not the page's, so the
// HTML can live at the repo root (for GitHub Pages) or anywhere else.
const ROOT = new URL("../", import.meta.url);
const asset = (p) => new URL(p, ROOT).href;

const el = (id) => document.getElementById(id);
const canvas = el("view");

let sim = new Sim();
let renderer = null;
let editor = new Editor();
let tileInfo = [];
let running = false;
let lastTick = 0;
let designGrid = null;   // grid as it was before pressing Play
let sourceText = null;   // the level as loaded, for Reset
let sourcePhysics = null; // its physics override, so Reset doesn't lose it
let mouseTile = null;    // last hovered tile, for the paste ghost
let keyHeld = false;     // the original suppresses painting while a key is down

// --- level loading ---------------------------------------------------------

async function fetchWarehouse(code) {
  // Our own static mirror - kevan.org sends no CORS headers, so a browser
  // cannot fetch rubiload.php. See tools/fetch_levels.py.
  const r = await fetch(asset(`warehouse/${code}.rub`));
  if (!r.ok) throw new Error(`Level "${code}" is not in the local warehouse mirror.`);
  return r.text();
}

/**
 * @param physicsOverride  base levels carry no "* Physics:" header but are
 *   authored for the current model; the original's loadLevel() sets 2 directly,
 *   while user levels default to 1. Callers say which they are.
 */
function applyLevel(text, physicsOverride = null) {
  const level = parseLevel(text);
  if (physicsOverride !== null) level.physicsVersion = physicsOverride;

  sim = new Sim();
  sim.grid.set(level.grid);
  sim.physicsVersion = level.physicsVersion;
  sourceText = text;
  sourcePhysics = physicsOverride;

  const { available, locked } = computeGameplayState(sim.grid);
  editor.attach(sim, available, locked);

  designGrid = sim.grid.slice();
  running = false;
  syncButtons();
  buildPalette();

  const bits = [];
  if (level.title) bits.push(`"${level.title}"`);
  if (level.designer) bits.push(`by ${level.designer}`);
  if (level.type) bits.push(level.type);
  bits.push(`physics v${level.physicsVersion}`);
  if (level.badChars) bits.push(`${level.badChars} unrecognised characters`);
  setStatus(bits.join(" · "));
}

async function loadBase(n) {
  applyLevel(await (await fetch(asset(`data/level${n}.rub`))).text(), 2);
}

// --- status ----------------------------------------------------------------

/** Solved when at least one target is green and none are red or unlit. */
function solvedState() {
  let anyGreen = false, allMatched = true;
  for (const v of sim.grid) {
    if (v === T.matchgreen) anyGreen = true;
    else if (v === T.matchred || v === T.matchoff) allMatched = false;
  }
  return anyGreen && allMatched;
}

function setStatus(text, solved = false) {
  const s = el("status");
  s.textContent = text;
  s.classList.toggle("solved", solved);
}

function syncButtons() {
  el("play").disabled = running;
  el("stop").disabled = !running;
  el("step").disabled = running;
  el("play").classList.toggle("on", running);
}

// --- palette ---------------------------------------------------------------

function buildPalette() {
  const p = el("palette");
  p.replaceChildren();

  const eraser = document.createElement("button");
  eraser.className = "swatch eraser" + (editor.drawItem === 0 ? " sel" : "");
  eraser.textContent = "✕";
  eraser.title = "Erase";
  eraser.onclick = () => { editor.drawItem = 0; buildPalette(); };
  p.appendChild(eraser);

  for (let id = 1; id < 90; id++) {
    if (!editor.available[id]) continue;
    const b = document.createElement("button");
    b.className = "swatch" + (id === editor.drawItem ? " sel" : "");
    // 2x scale, hence doubled offsets against the 1600x256 background-size
    b.style.backgroundPosition = `-${spriteX(id) * 2}px -${spriteY(id) * 2}px`;
    b.title = tileInfo[id]?.desc || `Tile ${id}`;
    b.onclick = () => { editor.drawItem = id; buildPalette(); };
    p.appendChild(b);
  }
}

// --- main loop -------------------------------------------------------------

function frame(now) {
  if (running && now - lastTick >= TICK_MS) {
    lastTick = now;
    sim.step();
    const solved = solvedState();
    setStatus(solved ? "Solved!" : "Running…", solved);
  }
  renderer.draw(sim.grid, {
    locked: running ? null : editor.locked,
    selection: running ? null : editor.selection,
    clip: { editor, mouse: mouseTile },
  });
  requestAnimationFrame(frame);
}

function fit() {
  renderer.resize(
    Math.max(320, Math.min(window.innerWidth - 24, 1600)),
    Math.max(200, window.innerHeight - 250),
  );
}

// --- input -----------------------------------------------------------------

function onPointerDown(e) {
  if (running) return;
  const t = renderer.tileFromEvent(e);
  if (!t) return;
  const right = e.button === 2;

  if (!right && editor.clip && editor.selection) {
    editor.paste(t.x, t.y);
  } else if (e.shiftKey && !right) {
    editor.beginSelection(t.x, t.y);
  } else if (!keyHeld) {
    editor.paint(t.x, t.y, right);
  }

  if (right) editor.clearSelection();
}

function onPointerMove(e) {
  const t = renderer.tileFromEvent(e);
  mouseTile = t;

  if (t && !e.buttons) {
    const id = sim.grid[t.x * YSIZE + t.y];
    el("hint").textContent = id ? (tileInfo[id]?.desc || `Tile ${id}`) : `(${t.x}, ${t.y})`;
  }
  if (running || !t || !e.buttons) return;

  if (e.shiftKey && editor.selection) {
    editor.dragSelection(t.x, t.y);
  } else if (!keyHeld) {
    editor.paint(t.x, t.y, (e.buttons & 2) !== 0);
  }
}

function onKeyDown(e) {
  if (e.target.matches("input, select, textarea")) return;
  keyHeld = true;
  const k = e.key;

  if (k === "p" || k === "P") {
    sim.physicsVersion = sim.physicsVersion === 2 ? 1 : 2;
    setStatus(`Physics model v${sim.physicsVersion}.`);
    return;
  }
  if (k === "s" || k === "S") { doStep(); return; }
  if (k === "Escape") { editor.clearSelection(); setStatus("Selection cleared."); return; }
  if (running) return;

  if (editor.selection) {
    if (k === "Delete" || k === "Backspace") {
      editor.fill(0);
      setStatus("Selection cleared.");
      e.preventDefault();
      return;
    }
    if (k === "f" || k === "F") {
      editor.fill(editor.drawItem);
      setStatus("Selection filled.");
      return;
    }
    if (k === "c" || k === "C" || k === "x" || k === "X") {
      const cut = k === "x" || k === "X";
      editor.copy(cut);
      setStatus(`${cut ? "Cut" : "Copied"} ${editor.clipboard.w + 1}×${editor.clipboard.h + 1} — click to place.`);
      return;
    }
  } else if (editor.pickCargo(k)) {
    buildPalette();
    return;
  }

  const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (arrows[k]) {
    if (editor.moveDrawItem(...arrows[k])) buildPalette();
    e.preventDefault();
  }
}

function doStep() {
  if (running) return;
  sim.step();
  const solved = solvedState();
  setStatus(solved ? "Solved!" : "Stepped one tick.", solved);
}

// --- boot ------------------------------------------------------------------

async function boot() {
  const [sheet, tiles] = await Promise.all([
    new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error("could not load data/blocks.gif"));
      img.src = asset("data/blocks.gif");
    }),
    fetch(new URL("tiles.json", import.meta.url)).then((r) => r.json()),
  ]);
  tileInfo = tiles;

  renderer = new Renderer(canvas, sheet);
  renderer.onDprChange = fit;
  fit();
  addEventListener("resize", fit);

  const picker = el("levelPick");
  for (let n = 1; n <= 12; n++) picker.add(new Option(`Level ${n}`, String(n)));
  picker.add(new Option("Sandbox", "0"));
  picker.onchange = () => loadBase(Number(picker.value));

  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerleave", () => { mouseTile = null; });
  addEventListener("keydown", onKeyDown);
  addEventListener("keyup", () => { keyHeld = false; });
  addEventListener("blur", () => { keyHeld = false; });

  el("play").onclick = () => {
    if (running) return;
    designGrid = sim.grid.slice();
    editor.clearSelection();
    running = true;
    lastTick = 0;
    syncButtons();
  };
  el("stop").onclick = () => {
    running = false;
    if (designGrid) sim.grid.set(designGrid);
    syncButtons();
    setStatus("Stopped — machine restored to the state before Play.");
  };
  el("step").onclick = doStep;
  el("clear").onclick = () => {
    if (sourceText) applyLevel(sourceText, sourcePhysics);
    setStatus("Level reset.");
  };
  el("share").onclick = async () => {
    const text = `* Physics:${sim.physicsVersion}\n` + gridToLines(sim.grid).join("\n") + "\n";
    const url = await buildShareURL(text);
    const ok = await copyToClipboard(url);
    setStatus(ok ? `Link copied (${url.length} characters).`
                 : "Could not reach the clipboard — link is in the address bar.");
    if (!ok) history.replaceState(null, "", url);
  };

  const param = new URLSearchParams(location.search).get("level");
  if (param) {
    try {
      applyLevel(await resolveLevelParam(param, fetchWarehouse));
      picker.value = "";
    } catch (err) {
      setStatus(err.message);
      await loadBase(1);
    }
  } else {
    await loadBase(1);
  }

  requestAnimationFrame(frame);
}

boot().catch((e) => setStatus(`Failed to start: ${e.message}`));
