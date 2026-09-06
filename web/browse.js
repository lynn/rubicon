// Level browser over the warehouse mirror.
//
// warehouse/index.json carries metadata for every archived level; the grids
// themselves are fetched lazily, only for cards that scroll into view, so
// opening the browser costs one request rather than two thousand.

import { XSIZE, YSIZE, TILE } from "./tiles.js";
import { spriteX, spriteY } from "./render.js";
import { parseLevel } from "./level.js";

const ROOT = new URL("../", import.meta.url);
const asset = (p) => new URL(p, ROOT).href;

const PAGE = 60; // cards appended per scroll batch

const TYPE_LABEL = {
  "Puzzle (1)": "Newbie",
  "Puzzle (2)": "Easy",
  "Puzzle (3)": "Medium",
  "Puzzle (4)": "Hard",
  "Puzzle (5)": "Expert",
  Solution: "Solution",
  Other: "Other",
};
const DIFFICULTY_ORDER = ["Puzzle (1)", "Puzzle (2)", "Puzzle (3)", "Puzzle (4)", "Puzzle (5)"];

const el = (id) => document.getElementById(id);

let all = [];
let shown = [];
let cursor = 0;
let sheet = null;
let observer = null;

// --- thumbnails -------------------------------------------------------------

/** Offscreen full-size buffer, downscaled into each card's canvas. */
const buffer = document.createElement("canvas");
buffer.width = XSIZE * TILE;
buffer.height = YSIZE * TILE;
const bctx = buffer.getContext("2d", { alpha: false });
bctx.imageSmoothingEnabled = false;

async function drawThumb(canvas, code) {
  const res = await fetch(asset(`warehouse/${code}.rub`));
  if (!res.ok) return;
  const { grid } = parseLevel(await res.text());

  bctx.fillStyle = "#000";
  bctx.fillRect(0, 0, buffer.width, buffer.height);
  for (let y = 0; y < YSIZE; y++) {
    for (let x = 0; x < XSIZE; x++) {
      const id = grid[x * YSIZE + y];
      if (id === 0) continue;
      bctx.drawImage(sheet, spriteX(id), spriteY(id), TILE, TILE, x * TILE, y * TILE, TILE, TILE);
    }
  }

  const ctx = canvas.getContext("2d", { alpha: false });
  // Smoothing ON here: this is a genuine downscale, where nearest-neighbour
  // would drop whole rows of tiles and misrepresent the level's shape.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(buffer, 0, 0, canvas.width, canvas.height);
  canvas.classList.add("loaded");
}

// --- filtering --------------------------------------------------------------

function applyFilters() {
  const q = el("q").value.trim().toLowerCase();
  const type = el("type").value;
  const physics = el("physics").value;
  const sort = el("sort").value;

  shown = all.filter((e) => {
    if (physics !== "any" && String(e.physics) !== physics) return false;
    if (type === "unclaimed") { if (e.archived) return false; }
    else if (type === "puzzle") { if (!DIFFICULTY_ORDER.includes(e.type)) return false; }
    else if (type !== "any" && e.type !== type) return false;
    if (!q) return true;
    return (e.title || "").toLowerCase().includes(q) ||
           (e.designer || "").toLowerCase().includes(q) ||
           e.code.includes(q);
  });

  const byText = (k) => (a, b) => (a[k] || "￿").localeCompare(b[k] || "￿");
  if (sort === "title") shown.sort(byText("title"));
  else if (sort === "designer") shown.sort(byText("designer"));
  else if (sort === "difficulty") {
    shown.sort((a, b) => DIFFICULTY_ORDER.indexOf(a.type) - DIFFICULTY_ORDER.indexOf(b.type) ||
                         (a.title || "").localeCompare(b.title || ""));
  } else if (sort === "size") shown.sort((a, b) => b.cells - a.cells);
  else shown.sort((a, b) => a.code.localeCompare(b.code));

  el("count").textContent =
    `${shown.length} of ${all.length} level${all.length === 1 ? "" : "s"}`;

  el("grid").replaceChildren();
  cursor = 0;
  appendBatch();
}

// --- rendering --------------------------------------------------------------

function card(e) {
  const a = document.createElement("a");
  a.className = "card";
  a.href = asset(`index.html?level=${e.code}`);

  const cv = document.createElement("canvas");
  cv.width = 200;
  cv.height = 124;
  cv.className = "thumb";
  a.appendChild(cv);

  const meta = document.createElement("div");
  meta.className = "meta";
  const title = document.createElement("div");
  title.className = "title";
  title.textContent = e.title || e.code;
  const sub = document.createElement("div");
  sub.className = "sub";
  const parts = [];
  if (e.designer) parts.push(e.designer);
  if (e.type) parts.push(TYPE_LABEL[e.type] || e.type);
  if (!e.archived) parts.push("unclaimed");
  sub.textContent = parts.join(" · ") || "—";
  const stats = document.createElement("div");
  stats.className = "stats";
  stats.textContent = `${e.code} · ${e.targets} target${e.targets === 1 ? "" : "s"} · physics v${e.physics}`;
  meta.append(title, sub, stats);
  a.appendChild(meta);

  a.dataset.code = e.code;
  observer.observe(a);
  return a;
}

function appendBatch() {
  const frag = document.createDocumentFragment();
  const end = Math.min(cursor + PAGE, shown.length);
  for (; cursor < end; cursor++) frag.appendChild(card(shown[cursor]));
  el("grid").appendChild(frag);
  el("more").hidden = cursor >= shown.length;
}

// --- boot -------------------------------------------------------------------

async function boot() {
  sheet = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("could not load data/blocks.gif"));
    i.src = asset("data/blocks.gif");
  });

  let res;
  try {
    res = await fetch(asset("warehouse/index.json"));
    if (!res.ok) throw new Error(String(res.status));
    all = await res.json();
  } catch {
    el("count").textContent =
      "No warehouse/index.json — run tools/fetch_levels.py, then tools/index_warehouse.mjs.";
    return;
  }

  observer = new IntersectionObserver((entries) => {
    for (const ent of entries) {
      if (!ent.isIntersecting) continue;
      observer.unobserve(ent.target);
      drawThumb(ent.target.querySelector("canvas"), ent.target.dataset.code);
    }
  }, { rootMargin: "300px" });

  // populate the designer datalist for quick filtering
  const designers = [...new Set(all.map((e) => e.designer).filter(Boolean))].sort();
  const list = el("designers");
  for (const d of designers) list.appendChild(new Option(d));

  for (const id of ["q", "type", "physics", "sort"]) {
    el(id).addEventListener(id === "q" ? "input" : "change", applyFilters);
  }
  el("more").onclick = appendBatch;
  el("random").onclick = () => {
    const pool = shown.length ? shown : all;
    location.href = asset(`index.html?level=${pool[Math.floor(Math.random() * pool.length)].code}`);
  };

  addEventListener("scroll", () => {
    if (el("more").hidden) return;
    if (window.scrollY + window.innerHeight > document.body.offsetHeight - 600) appendBatch();
  }, { passive: true });

  applyFilters();
}

boot().catch((e) => { el("count").textContent = `Failed to load: ${e.message}`; });
