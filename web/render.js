// Canvas renderer for the Rubicon playfield.
//
// High-DPI from the start, because 16px tiles at 1:1 are unreadable on a 4K
// display. The strategy is integer scaling in DEVICE pixels:
//
//   backing store = 800 x 496 source px * an integer `zoom`
//   CSS size      = backing store / devicePixelRatio
//
// Sizing the backing store first and deriving the CSS size from it (rather than
// the other way round) guarantees every source pixel maps to exactly zoom x zoom
// device pixels, so nearest-neighbour sampling stays perfectly crisp instead of
// landing on fractional boundaries. On a 4K screen at dpr 2 this typically picks
// zoom 4-6, i.e. 2-3 CSS px per source pixel.

import { XSIZE, YSIZE, TILE } from "./tiles.js";
import { normalized } from "./editor.js";

export const VIEW_W = XSIZE * TILE; // 800
export const VIEW_H = YSIZE * TILE; // 496

// Sprite n lives at this offset in blocks.gif. Derived from the original, which
// drew the sheet at y=500 and blitted the toolbox palette out of it at a 17px
// pitch starting (6,508) - so the sheet itself is laid out on that grid.
const SPRITE_ORIGIN_X = 6;
const SPRITE_ORIGIN_Y = 8;
const SPRITE_PITCH = 17;
const SPRITE_COLS = 30;

export const spriteX = (id) => SPRITE_ORIGIN_X + (id % SPRITE_COLS) * SPRITE_PITCH;
export const spriteY = (id) => SPRITE_ORIGIN_Y + Math.floor(id / SPRITE_COLS) * SPRITE_PITCH;

export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {CanvasImageSource} sheet  blocks.gif, 800x128
   */
  constructor(canvas, sheet) {
    this.canvas = canvas;
    this.sheet = sheet;
    this.zoom = 1;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this._dprQuery = null;
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

  /** Convert a mouse event to integer tile coordinates, or null if outside. */
  tileFromEvent(ev) {
    const r = this.canvas.getBoundingClientRect();
    const x = Math.floor(((ev.clientX - r.left) / r.width) * XSIZE);
    const y = Math.floor(((ev.clientY - r.top) / r.height) * YSIZE);
    if (x < 0 || x >= XSIZE || y < 0 || y >= YSIZE) return null;
    return { x, y };
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
    ctx.beginPath();
    ctx.moveTo(x0, y0); ctx.lineTo(x1, y0);
    ctx.moveTo(x0, y0); ctx.lineTo(x0, y1);
    if (right === cx) { ctx.moveTo(x1, y0); ctx.lineTo(x1, y1); }
    if (bottom === cy) { ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); }
    ctx.stroke();
  }

  /**
   * Draw the whole grid.
   *   locked  - tints undeletable starting components blue (design mode)
   *   selection - {x,y,w,h} outlined green
   *   clip    - pending paste: {editor, mouse} draws a ghost of the clipboard
   *             under the cursor, outlined magenta for a cut, red for a copy
   */
  draw(grid, { locked = null, selection = null, clip = null } = {}) {
    const ctx = this.ctx;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    for (let y = 0; y < YSIZE; y++) {
      for (let x = 0; x < XSIZE; x++) {
        const id = grid[x * YSIZE + y];
        if (id === 0) continue;
        ctx.drawImage(this.sheet, spriteX(id), spriteY(id), TILE, TILE,
                      x * TILE, y * TILE, TILE, TILE);
        if (locked && locked[x * YSIZE + y]) {
          ctx.fillStyle = "rgba(0,0,100,0.26)";
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        }
      }
    }

    if (selection) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgb(0,250,0)";
      this._gridRect(selection);

      if (clip && clip.editor.clip && clip.mouse) {
        const ed = clip.editor;
        const { x: mx, y: my } = clip.mouse;
        const maxDx = Math.min(ed.clipboard.w, XSIZE - mx - 1);
        const maxDy = Math.min(ed.clipboard.h, YSIZE - my - 1);
        for (let dx = 0; dx <= maxDx; dx++) {
          for (let dy = 0; dy <= maxDy; dy++) {
            const id = ed.clipAt(dx, dy);
            if (!id || !ed.available[id]) continue;
            ctx.drawImage(this.sheet, spriteX(id), spriteY(id), TILE, TILE,
                          (mx + dx) * TILE, (my + dy) * TILE, TILE, TILE);
          }
        }
        ctx.strokeStyle = ed.clipCut ? "rgb(250,0,250)" : "rgb(250,0,0)";
        this._gridRect({ x: mx, y: my, w: ed.clipboard.w, h: ed.clipboard.h });
      }
    }
  }
}
