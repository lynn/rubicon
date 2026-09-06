// Rubicon - glue between the simulation, the editor, the renderer and the page.
//
// The screen is the original's: a menu, then a 50x31 playfield above a toolbox
// drawn from blocks.gif, with the same buttons in the same places (layout.js).
// Everything the applet did in a modal alert - loading a level by name, the
// "are you sure" on Clear, the level password - happens in a prompt/confirm or
// on the status line below the canvas instead.

import { XSIZE, YSIZE, T } from "./tiles.js";
import { Sim } from "./sim.js";
import { Renderer } from "./render.js";
import { parseLevel, gridToLines, computeGameplayState } from "./level.js";
import { Editor } from "./editor.js";
import { resolveLevelParam, buildShareURL, copyToClipboard, isWarehouseCode } from "./share.js";
import { BOX, MENU, GRID_H, PANEL_Y, contains, slotAt } from "./layout.js";
import { VLWFont } from "./vlw.js";

const VERSION = "1.27";
const TICK_MS = 100;      // the applet's frameRate(10) while running
const FAST_MS = 1000 / 60; // ...and frameRate(60) when shift-clicking Play

// The original's base-level passwords, in order. Typing one into Load jumps
// straight to that level, which is how the applet let you resume.
const PASSWORDS = ["abalone", "origami", "unaware", "anenome", "edifice", "acolyte",
                   "analogy", "ocarina", "acetate", "oregano", "ukelele", "awesome"];

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

let mode = "menu";        // "menu" | "design" | "running"
let gameplay = true;      // false = sandbox: every component, nothing locked
let playingLevels = false;
let level = 0;            // 0-based index into PASSWORDS
let frames = 0;
let solvedFrames = -1;
let singleStepping = false;
let doSingleStep = false;
let fastForward = false;

let unstarted = null;     // grid as it was before Play, restored by Stop
let mouse = null;         // last screen-pixel position, for the paste ghost
let keyHeld = false;      // the original suppresses painting while a key is down
let waitForRelease = false; // ...and painting after a click in the toolbox
let lastTick = 0;

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
  const parsed = parseLevel(text);
  if (physicsOverride !== null) parsed.physicsVersion = physicsOverride;

  sim = new Sim();
  sim.grid.set(parsed.grid);
  sim.physicsVersion = parsed.physicsVersion;
  mode = "design";
  setGameplay(true);
  unstarted = sim.grid.slice();
  return parsed;
}

/** The original's setGameplay(): recompute the palette and the locked cells. */
function setGameplay(on) {
  gameplay = on;
  if (on) {
    const { available, locked } = computeGameplayState(sim.grid);
    editor.attach(sim, available, locked);
  } else {
    // Sandbox: everything except the two unused sheet slots, nothing locked.
    const available = new Uint8Array(90).fill(1);
    available[28] = 0;
    available[58] = 0;
    editor.attach(sim, available, new Uint8Array(XSIZE * YSIZE));
  }
}

async function loadBase(n) {
  const text = await (await fetch(asset(`data/level${n + 1}.rub`))).text();
  applyLevel(text, 2);
  level = n;
  playingLevels = true;
  el("levelPick").value = String(n);
  setStatus(`Level ${n + 1} of ${PASSWORDS.length}. Password: ${PASSWORDS[n]}`);
}

async function loadSandbox() {
  applyLevel(await (await fetch(asset("data/level0.rub"))).text(), 2);
  playingLevels = false;
  setGameplay(false);
  el("levelPick").value = "sandbox";
  setStatus("Sandbox: every component unlocked, nothing to solve.");
}

/** Load by seven-letter name: a base-level password, or a warehouse code. */
async function loadByName(name) {
  const code = name.trim().toLowerCase();
  const pw = PASSWORDS.indexOf(code);
  if (pw >= 0) return loadBase(pw);
  if (!isWarehouseCode(code)) {
    setStatus("Level not found. (Level names are exactly seven letters.)");
    return;
  }
  try {
    describe(applyLevel(await fetchWarehouse(code)), code);
    playingLevels = false;
  } catch (err) {
    setStatus(err.message);
  }
}

/** The applet's post-load alert, on the status line. */
function describe(parsed, code = null) {
  const bits = [];
  if (parsed.title) bits.push(`"${parsed.title}"`);
  else bits.push("Unarchived level");
  if (parsed.designer) bits.push(`by ${parsed.designer}`);
  if (parsed.type) bits.push(parsed.type);
  if (code) bits.push(code);
  bits.push(`physics v${parsed.physicsVersion}`);
  if (parsed.badChars) bits.push(`${parsed.badChars} unrecognised characters`);
  setStatus(bits.join(" · "));
}

// --- state -----------------------------------------------------------------

function setStatus(text) {
  el("status").textContent = text;
}

/** Solved when at least one target is green and none are red or unlit. */
function solvedState() {
  let anyGreen = false, allMatched = true;
  for (const v of sim.grid) {
    if (v === T.matchgreen) anyGreen = true;
    else if (v === T.matchred || v === T.matchoff) allMatched = false;
  }
  return anyGreen && allMatched;
}

function startRunning() {
  mode = "running";
  frames = -1;
  solvedFrames = -1;
  unstarted = sim.grid.slice();
  editor.clearSelection();
  lastTick = 0;
}

function stopRunning() {
  mode = "design";
  singleStepping = false;
  if (unstarted) sim.grid.set(unstarted);
}

function tick() {
  if (frames >= 0) sim.step();
  frames++;
  if (solvedState()) {
    if (solvedFrames < 0) solvedFrames = frames;
  } else {
    solvedFrames = -1;
  }
}

// --- input -----------------------------------------------------------------

function onPointerDown(e) {
  const p = renderer.pointFromEvent(e);
  if (!p) return;
  const right = e.button === 2;

  if (mode === "menu") {
    if (contains(MENU.play, p.x, p.y)) loadBase(level);
    else if (contains(MENU.load, p.x, p.y)) doLoad();
    else if (contains(MENU.sandbox, p.x, p.y)) { mode = "design"; playingLevels = false; setGameplay(false); }
    waitForRelease = true;
    return;
  }

  if (p.y > PANEL_Y) {
    onPanelClick(p, e);
    return;
  }
  if (p.y >= GRID_H || mode === "running") return;

  const t = renderer.tileFromPoint(p);
  if (e.ctrlKey && !right) {
    // Pipette: adopt whatever is under the cursor (empty space picks the eraser).
    if (editor.pick(t.x, t.y)) setStatus(describeTile(editor.drawItem));
    else setStatus("That component is not available on this level.");
  } else if (!right && editor.clip && editor.selection) {
    editor.paste(t.x, t.y);
  } else if (e.shiftKey && !right) {
    editor.beginSelection(t.x, t.y);
  } else if (!keyHeld) {
    editor.paint(t.x, t.y, right);
  }

  if (right) editor.clearSelection();
}

function onPanelClick(p, e) {
  editor.clearSelection();
  waitForRelease = true;

  if (contains(BOX.quit, p.x, p.y)) {
    if (mode === "running") stopRunning();
    mode = "menu";
    return;
  }
  if (mode === "design") {
    if (contains(BOX.load, p.x, p.y)) return void doLoad();
    if (contains(BOX.save, p.x, p.y)) return void doSave();
    if (contains(BOX.clear, p.x, p.y)) {
      const msg = gameplay
        ? "Clearing the level will remove all the machinery you have built. Are you sure?"
        : "Clearing the level will blank the entire screen. Are you sure?";
      if (confirm(msg)) {
        editor.clearAll();
        setStatus("Cleared.");
      }
      return;
    }
  }
  if (contains(BOX.stop, p.x, p.y) && mode === "running") stopRunning();
  if (contains(BOX.play, p.x, p.y)) {
    if (mode === "design") startRunning();
    singleStepping = false;
    fastForward = e.shiftKey;
  }
  if (contains(BOX.game, p.x, p.y) && !gameplay) {
    setGameplay(true);
    setStatus("Game mode: only this level's components, starting machine locked.");
  }
  if (contains(BOX.sandbox, p.x, p.y) && gameplay) {
    playingLevels = false;
    setGameplay(false);
    setStatus("Sandbox: every component unlocked, nothing locked.");
  }
  if (contains(BOX.next, p.x, p.y) && playingLevels && mode === "running" && solvedFrames !== -1) {
    if (level + 1 < PASSWORDS.length) loadBase(level + 1);
    else setStatus("All twelve levels solved. The factory floor is yours.");
  }
  const slot = slotAt(p.x, p.y);
  if (slot >= 0 && slot < 90 && editor.available[slot]) {
    editor.drawItem = slot;
    setStatus("");
  }
}

function onPointerMove(e) {
  mouse = renderer.pointFromEvent(e);
  if (mode !== "design" || !mouse || !e.buttons || waitForRelease) return;
  const t = renderer.tileFromPoint(mouse);
  if (!t) return;

  if (e.shiftKey && editor.selection) {
    editor.dragSelection(t.x, t.y);
  } else if (!keyHeld && !e.ctrlKey) {
    editor.paint(t.x, t.y, (e.buttons & 2) !== 0);
  }
}

const describeTile = (id) => tileInfo[id]?.desc || `Tile ${id}`;

function onKeyDown(e) {
  // e.target is the focused node, which is not always an element (and is the
  // window itself for a synthesised event), so ask before matching.
  if (e.target instanceof Element && e.target.matches("input, select, textarea")) return;
  keyHeld = true;
  const k = e.key;

  if (k === " ") {
    // Space starts and stops, the one binding the applet never had and wants.
    if (mode === "running") stopRunning();
    else if (mode === "design") { startRunning(); singleStepping = false; fastForward = false; }
    e.preventDefault();
    return;
  }
  if (k === "p" || k === "P") {
    sim.physicsVersion = sim.physicsVersion === 2 ? 1 : 2;
    setStatus(`Physics model v${sim.physicsVersion}.`);
    return;
  }
  if (k === "s" || k === "S") {
    // As in the original: S from the editor starts the machine paused.
    if (mode === "design") startRunning();
    singleStepping = true;
    doSingleStep = true;
    return;
  }
  if (k === "Escape") { editor.clearSelection(); return; }
  if (mode !== "design") return;

  if (editor.selection) {
    if (k === "Delete" || k === "Backspace") {
      editor.fill(0);
      e.preventDefault();
      return;
    }
    if (k === "f" || k === "F") { editor.fill(editor.drawItem); return; }
    if (k === "c" || k === "C" || k === "x" || k === "X") {
      const cut = k === "x" || k === "X";
      editor.copy(cut);
      setStatus(`${cut ? "Cut" : "Copied"} ${editor.clipboard.w + 1}×${editor.clipboard.h + 1} — click to place.`);
      return;
    }
  } else if (editor.pickCargo(k)) {
    return;
  }

  const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (arrows[k]) {
    editor.moveDrawItem(...arrows[k]);
    e.preventDefault();
  }
}

// --- toolbox actions --------------------------------------------------------

async function doLoad() {
  const name = prompt("Load an existing level:\n\nSeven letters - a warehouse code, or a base-level password.");
  if (name) await loadByName(name);
}

async function doSave() {
  // The applet posted to kevan.org; we put the whole level in the URL instead.
  const text = `* Physics:${sim.physicsVersion}\n` + gridToLines(sim.grid).join("\n") + "\n";
  const url = await buildShareURL(text);
  const ok = await copyToClipboard(url);
  setStatus(ok ? `Share link copied (${url.length} characters).`
               : "Could not reach the clipboard — the link is in the address bar.");
  if (!ok) history.replaceState(null, "", url);
}

// --- main loop -------------------------------------------------------------

function frame(now) {
  if (mode === "running") {
    if (singleStepping) {
      if (doSingleStep) { tick(); doSingleStep = false; }
    } else if (now - lastTick >= (fastForward ? FAST_MS : TICK_MS)) {
      lastTick = now;
      tick();
    }
  }

  renderer.draw({
    grid: sim.grid,
    mode,
    gameplay,
    playingLevels,
    level,
    version: VERSION,
    available: editor.available,
    locked: editor.locked,
    selection: mode === "design" ? editor.selection : null,
    editor,
    mouse,
    physicsVersion: sim.physicsVersion,
    desc: describeTile(editor.drawItem),
    frames: Math.max(frames, 0),
    solved: solvedFrames !== -1,
    password: playingLevels ? PASSWORDS[level] : null,
  });
  requestAnimationFrame(frame);
}

function fit() {
  renderer.resize(
    Math.max(320, Math.min(window.innerWidth - 24, 1600)),
    Math.max(240, window.innerHeight - 120),
  );
}

// --- boot ------------------------------------------------------------------

async function boot() {
  const FONT_SIZES = [12, 14, 16, 32];
  const [sheet, tiles, ...fontList] = await Promise.all([
    new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error("could not load data/blocks.gif"));
      img.src = asset("data/blocks.gif");
    }),
    fetch(new URL("tiles.json", import.meta.url)).then((r) => r.json()),
    // The applet's own Palatino bitmaps; a missing one just falls back to CSS.
    ...FONT_SIZES.map((px) =>
      VLWFont.load(asset(`data/PalatinoLinotype-Roman-${px}.vlw`)).catch(() => null)),
  ]);
  tileInfo = tiles;
  const fonts = {};
  FONT_SIZES.forEach((px, i) => { if (fontList[i]) fonts[px] = fontList[i]; });

  renderer = new Renderer(canvas, sheet, fonts);
  renderer.onDprChange = fit;
  fit();
  addEventListener("resize", fit);
  setGameplay(false); // the menu's empty grid, before anything is loaded

  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  addEventListener("pointerup", () => { waitForRelease = false; });
  canvas.addEventListener("pointerleave", () => { mouse = null; });
  addEventListener("keydown", onKeyDown);
  addEventListener("keyup", () => { keyHeld = false; });
  addEventListener("blur", () => { keyHeld = false; });

  const picker = el("levelPick");
  for (let n = 0; n < PASSWORDS.length; n++) picker.add(new Option(`Level ${n + 1}`, String(n)));
  picker.add(new Option("Sandbox", "sandbox"));
  picker.onchange = () => {
    if (picker.value === "sandbox") loadSandbox();
    else loadBase(Number(picker.value));
    picker.blur();
  };

  const param = new URLSearchParams(location.search).get("level");
  if (param) {
    try {
      describe(applyLevel(await resolveLevelParam(param, fetchWarehouse)),
               isWarehouseCode(param) ? param : null);
    } catch (err) {
      setStatus(err.message);
    }
  }

  requestAnimationFrame(frame);
}

boot().catch((e) => setStatus(`Failed to start: ${e.message}`));
