// Canvas renderer. Draws the original's entire 800x600 screen - playfield and
// toolbox - rather than just the playfield, because the toolbox chrome is part
// of blocks.gif and the palette slots ARE the sheet's sprite grid. See layout.js.
//
// High-DPI from the start, because 16px tiles at 1:1 are unreadable on a 4K
// display. The strategy is integer scaling in DEVICE pixels:
//
//   backing store = 800 x 600 source px * an integer `zoom`
//   CSS size      = backing store / devicePixelRatio
//
// Sizing the backing store first and deriving the CSS size from it (rather than
// the other way round) guarantees every source pixel maps to exactly zoom x zoom
// device pixels, so nearest-neighbour sampling stays perfectly crisp instead of
// landing on fractional boundaries.

import { XSIZE, YSIZE, TILE, T } from "./tiles.js";
import { normalized } from "./editor.js";
import {
  SCREEN_W, SCREEN_H, GRID_H, PANEL_Y, BOX, MENU, contains,
  slotX, slotY, PALETTE_COLS, DRAWITEM_PREVIEW, TEXT,
} from "./layout.js";

export const VIEW_W = SCREEN_W;
export const VIEW_H = SCREEN_H;

// Sprite n lives at this offset in blocks.gif: the sheet is blitted at y=500 and
// the toolbox starts at (6,508) on a 17px pitch, so the sprite grid is that
// same grid measured in sheet coordinates.
const SPRITE_ORIGIN_X = BOX.toolbox.x;
const SPRITE_ORIGIN_Y = BOX.toolbox.y - PANEL_Y;
const SPRITE_PITCH = 17;

export const spriteX = (id) => SPRITE_ORIGIN_X + (id % PALETTE_COLS) * SPRITE_PITCH;
export const spriteY = (id) => SPRITE_ORIGIN_Y + Math.floor(id / PALETTE_COLS) * SPRITE_PITCH;

// Fallback only: if the .vlw fonts fail to load, ask CSS for the nearest thing.
const cssFont = (px) => `${px}px "Palatino Linotype","Book Antiqua",Palatino,"URW Palladio L",Georgia,serif`;

/** The original's per-component build cost, totalled in the design-mode HUD. */
function tileCost(id) {
  if ((id > 2 && id < 9) || id === T.winchup || id === T.winchdown) return 5;
  if (id > 11 && id < 20) return 10;
  return 1;
}

export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {CanvasImageSource} sheet  blocks.gif, 800x128
   * @param {Object<number, VLWFont>} fonts  the applet's .vlw fonts by size
   */
  constructor(canvas, sheet, fonts = {}) {
    this.canvas = canvas;
    this.sheet = sheet;
    this.fonts = fonts;
    this.zoom = 1;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this._dprQuery = null;
    this._buildBackdrop();
  }

  /** The original's imgEmptyGameGrid: sprite 0 (dotted black) tiled behind the level. */
  _buildBackdrop() {
    const c = document.createElement("canvas");
    c.width = SCREEN_W;
    c.height = PANEL_Y;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.fillStyle = "#000";
    g.fillRect(0, 0, SCREEN_W, PANEL_Y);
    for (let y = 0; y < YSIZE; y++) {
      for (let x = 0; x < XSIZE; x++) {
        g.drawImage(this.sheet, spriteX(0), spriteY(0), TILE, TILE, x * TILE, y * TILE, TILE, TILE);
      }
    }
    this.backdrop = c;
  }

  /**
   * Fit the view into `availW` x `availH` CSS pixels, picking the largest
   * integer device-pixel zoom that fits. Returns true if anything changed.
   */
  resize(availW, availH) {
    const dpr = window.devicePixelRatio || 1;
    const zoom = Math.max(1, Math.min(
      Math.floor((availW * dpr) / VIEW_W),
      Math.floor((availH * dpr) / VIEW_H),
    ));

    const w = VIEW_W * zoom;
    const h = VIEW_H * zoom;
    if (this.canvas.width === w && this.canvas.height === h && this.zoom === zoom) return false;

    this.zoom = zoom;
    this.dpr = dpr;
    this.canvas.width = w;
    this.canvas.height = h;
    // Derive CSS size from the backing store so the mapping stays exact.
    this.canvas.style.width = `${w / dpr}px`;
    this.canvas.style.height = `${h / dpr}px`;
    this.cssScale = zoom / dpr; // CSS px per source px, for hit-testing
    this._configure();
    this._watchDpr();
    return true;
  }

  _configure() {
    const ctx = this.ctx;
    ctx.setTransform(this.zoom, 0, 0, this.zoom, 0, 0);
    ctx.imageSmoothingEnabled = false;
    // Safari and older Firefox still read the vendor-prefixed flags.
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
    ctx.textBaseline = "alphabetic";
  }

  /**
   * devicePixelRatio changes when the window moves between monitors or the
   * user zooms; the only reliable notification is a resolution media query,
   * which must be re-armed after each change.
   */
  _watchDpr() {
    if (this._dprQuery) this._dprQuery.removeEventListener("change", this._onDpr);
    const dpr = window.devicePixelRatio || 1;
    this._dprQuery = window.matchMedia(`(resolution: ${dpr}dppx)`);
    this._onDpr = () => this.onDprChange?.();
    this._dprQuery.addEventListener("change", this._onDpr, { once: true });
  }

  /** Convert a mouse event to integer SCREEN pixel coordinates (0..800, 0..600). */
  pointFromEvent(ev) {
    const r = this.canvas.getBoundingClientRect();
    const x = Math.floor(((ev.clientX - r.left) / r.width) * SCREEN_W);
    const y = Math.floor(((ev.clientY - r.top) / r.height) * SCREEN_H);
    if (x < 0 || x >= SCREEN_W || y < 0 || y >= SCREEN_H) return null;
    return { x, y };
  }

  /** Screen point -> tile coordinates, or null if it isn't over the playfield. */
  tileFromPoint(p) {
    if (!p || p.y >= GRID_H) return null;
    return { x: Math.floor(p.x / TILE), y: Math.floor(p.y / TILE) };
  }

  // --- primitives, matching Processing's rect()/text() -----------------------

  _fillRect(x, y, w, h, style) {
    this.ctx.fillStyle = style;
    this.ctx.fillRect(x, y, w + 1, h + 1);
  }

  _strokeRect(x, y, w, h, style) {
    this.ctx.strokeStyle = style;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x + 0.5, y + 0.5, w, h);
  }

  _text(s, x, y, px, style) {
    const f = this.fonts[px];
    let ly = y;
    if (!f) this.ctx.font = cssFont(px);
    this.ctx.fillStyle = style;
    for (const line of String(s).split("\n")) {
      if (f) f.drawLine(this.ctx, line, x, ly, style);
      else this.ctx.fillText(line, x, ly);
      ly += f ? f.leading : Math.round(px * 1.2);
    }
  }

  /** Blit tile `id` at tile coordinates. */
  _sprite(id, tx, ty) {
    this.ctx.drawImage(this.sheet, spriteX(id), spriteY(id), TILE, TILE,
                       tx * TILE, ty * TILE, TILE, TILE);
  }

  /**
   * The original's Box.gameGridRect(): outline a tile range, but draw the right
   * and bottom edges only when the box isn't clipped by the grid boundary, so a
   * selection running off the edge reads as open.
   */
  _gridRect(box) {
    const b = normalized(box);
    if (b.x >= XSIZE || b.y >= YSIZE) return;
    const right = b.x + b.w + 1, bottom = b.y + b.h + 1;
    const cx = Math.min(right, XSIZE), cy = Math.min(bottom, YSIZE);
    const x0 = b.x * TILE + 0.5, y0 = b.y * TILE + 0.5;
    const x1 = cx * TILE - 0.5, y1 = cy * TILE - 0.5;
    const ctx = this.ctx;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y0); ctx.lineTo(x1, y0);
    ctx.moveTo(x0, y0); ctx.lineTo(x0, y1);
    if (right === cx) { ctx.moveTo(x1, y0); ctx.lineTo(x1, y1); }
    if (bottom === cy) { ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); }
    ctx.stroke();
  }

  // --- the screen ------------------------------------------------------------

  /**
   * Draw one frame.
   *
   * @param {object} v
   *   grid, mode ("menu"|"design"|"running"), gameplay, playingLevels, level,
   *   available, locked, selection, editor, mouse (screen px), physicsVersion,
   *   desc, frames, solved, password
   */
  draw(v) {
    const ctx = this.ctx;
    const menu = v.mode === "menu";

    if (menu) {
      this._fillRect(0, 0, SCREEN_W, PANEL_Y, "#000");
    } else {
      ctx.drawImage(this.backdrop, 0, 0);
    }
    ctx.drawImage(this.sheet, 0, PANEL_Y);

    let cost = 0;

    if (!menu) {
      const design = v.mode === "design";
      for (let y = 0; y < YSIZE; y++) {
        for (let x = 0; x < XSIZE; x++) {
          const id = v.grid[x * YSIZE + y];
          if (id === 0) continue;
          this._sprite(id, x, y);
          if (design && v.gameplay && v.locked?.[x * YSIZE + y]) {
            this._fillRect(x * TILE, y * TILE, TILE - 1, TILE - 1, "rgba(0,0,100,0.259)");
          }
          // The old physics model runs packers, unpackers and copiers a tick
          // faster; the original tints them green so you can see it.
          if (v.physicsVersion === 1 &&
              (id === T.packer || id === T.unpacker || id === T.copier || id === T.copierup)) {
            this._fillRect(x * TILE, y * TILE, TILE - 1, TILE - 1, "rgba(0,100,0,0.259)");
          }
          if (design) cost += tileCost(id);
        }
      }

      // Components this level forbids are blanked out in the palette.
      for (let row = 0; row < 3; row++) {
        const cols = row === 2 ? 29 : 28;
        for (let col = 0; col < cols; col++) {
          const id = row * PALETTE_COLS + col;
          if (v.available[id]) continue;
          this._fillRect(slotX(id), slotY(id), 15, 15, "rgb(25,25,25)");
          this._strokeRect(slotX(id), slotY(id), 15, 15, "#000");
        }
      }

      if (design) {
        const px = slotX(v.editor.drawItem), py = slotY(v.editor.drawItem);
        this._strokeRect(px - 1, py - 1, 17, 17, "#fff");
        // The original copies the selected slot into the tab beside QUIT.
        ctx.drawImage(this.sheet, px, py - PANEL_Y, TILE, TILE,
                      DRAWITEM_PREVIEW.x, DRAWITEM_PREVIEW.y, TILE, TILE);
        const desc = v.desc || "";
        const slash = desc.indexOf("/");
        if (slash > 0) {
          this._text(desc.slice(0, slash), TEXT.desc.x, TEXT.desc.y, 14, "rgb(215,215,215)");
          this._text(desc.slice(slash + 1), TEXT.descLine2.x, TEXT.descLine2.y, 14, "rgb(215,215,215)");
        } else {
          this._text(desc, TEXT.desc.x, TEXT.desc.y, 14, "rgb(215,215,215)");
        }
      } else if (v.playingLevels && v.password) {
        this._text(`The password for this level is '${v.password}'.`, 300, 580, 14, "rgb(215,215,215)");
      }
    }

    if (v.selection) {
      ctx.strokeStyle = "rgb(0,250,0)";
      this._gridRect(v.selection);

      const ed = v.editor;
      const mt = this.tileFromPoint(v.mouse);
      if (ed.clip && mt) {
        const maxDx = Math.min(ed.clipboard.w, XSIZE - mt.x - 1);
        const maxDy = Math.min(ed.clipboard.h, YSIZE - mt.y - 1);
        for (let dx = 0; dx <= maxDx; dx++) {
          for (let dy = 0; dy <= maxDy; dy++) {
            const id = ed.clipAt(dx, dy);
            if (!id || !ed.available[id]) continue;
            this._sprite(id, mt.x + dx, mt.y + dy);
          }
        }
        ctx.strokeStyle = ed.clipCut ? "rgb(250,0,250)" : "rgb(250,0,0)";
        this._gridRect({ x: mt.x, y: mt.y, w: ed.clipboard.w, h: ed.clipboard.h });
      }
    }

    if (menu) this._drawMenu(v);

    // Button highlights: the outline marks the state you are IN, so Stop is lit
    // while stopped and Play while playing.
    if (v.mode === "design") this._strokeRect(BOX.stop.x, BOX.stop.y, BOX.stop.w, BOX.stop.h, "#fff");
    if (v.mode === "running") this._strokeRect(BOX.play.x, BOX.play.y, BOX.play.w, BOX.play.h, "#fff");
    const modeBox = v.gameplay ? BOX.game : BOX.sandbox;
    this._strokeRect(modeBox.x, modeBox.y, modeBox.w, modeBox.h, "#fff");

    this._drawHud(v, cost);
  }

  _drawHud(v, cost) {
    const num = (s) => this._text(s, TEXT.hudNumRight - 4 * s.length, TEXT.hudNumY, 16, "#fff");
    if (v.playingLevels) {
      const label = v.mode === "running" && v.solved ? "Next >>" : `Level ${v.level + 1}`;
      this._text(label, TEXT.hud.x, TEXT.hud.y, 16, "#fff");
    } else if (v.mode === "running") {
      if (v.gameplay && v.solved) this._text("Solved!", TEXT.hud.x, TEXT.hud.y, 16, "#fff");
      else num(String(v.frames));
    } else if (v.mode === "design") {
      num(`$${cost}`);
    }
  }

  _drawMenu(v) {
    const b = MENU.box;
    this._fillRect(b.x, b.y, b.w, b.h, "rgb(15,15,15)");
    this._strokeRect(b.x, b.y, b.w, b.h, "rgb(75,75,75)");
    this._text("RUBICON", 325, 150, 32, "rgb(215,215,215)");

    for (const key of ["play", "load", "sandbox"]) {
      const m = MENU[key];
      const hot = v.mouse && contains(m, v.mouse.x, v.mouse.y);
      this._fillRect(m.x, m.y, m.w, m.h, hot ? "rgb(150,150,150)" : "rgb(100,100,100)");
      this._strokeRect(m.x, m.y, m.w, m.h, "#000");
      this._text(m.label, m.x + m.ox, m.y + m.oy, 16, "#fff");
    }

    this._text(`Version ${v.version}`, 725, 592, 12, "rgb(100,100,100)");
    this._fillRect(120, 422, 600, 60, "rgb(15,15,15)");
    this._strokeRect(120, 422, 600, 60, "rgb(75,75,75)");
    this._text(
      "Update: As of v1.17, several components have been altered - Packers, Unpackers and Copiers are now\n" +
      "running one tick slower. Loading in an old level will switch them back to their obsolete, fast versions,\n" +
      "which will be tinted green. See the main Rubicon page for full details.",
      125, 440, 12, "rgb(155,155,155)",
    );
  }
}
