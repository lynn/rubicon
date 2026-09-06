// Editing: component selection, shift-drag area selection, fill, copy/cut and
// paste. Transliterated from the original's keyPressed/mousePressed/mouseDragged.
//
// Selection boxes are stored exactly as the original's Box: {x, y, w, h} where
// w/h are INCLUSIVE spans that may be negative while a drag is in progress
// (dragging up/left). normalize() flips them positive; the renderer and every
// operation normalise first.

import { XSIZE, YSIZE, T } from "./tiles.js";

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export function normalized(b) {
  const x = Math.min(b.x, b.x + b.w);
  const y = Math.min(b.y, b.y + b.h);
  return { x, y, w: Math.abs(b.w), h: Math.abs(b.h) };
}

export class Editor {
  constructor() {
    this.drawItem = T.girder;
    this.selection = null;   // {x,y,w,h} in tile coords, w/h inclusive spans
    this.clipboard = null;   // {data: Uint8Array, w, h} - w/h inclusive spans
    this.clip = false;       // a paste is pending
    this.clipCut = false;    // pending paste should also clear the source
  }

  /** Rebind to a freshly loaded level. */
  attach(sim, available, locked) {
    this.sim = sim;
    this.available = available;
    this.locked = locked;
    this.selection = null;
    this.clip = false;
    if (!this.available[this.drawItem]) this.drawItem = T.girder;
  }

  inGrid(x, y) {
    return x >= 0 && x < XSIZE && y >= 0 && y < YSIZE;
  }

  /** A cell may be edited only if its current tile type is player-available
   *  and it isn't part of the level's locked starting machine. */
  isModifiable(x, y) {
    if (!this.inGrid(x, y)) return false;
    const i = x * YSIZE + y;
    return !!this.available[this.sim.grid[i]] && !this.locked[i];
  }

  // --- painting -------------------------------------------------------------

  paint(x, y, erase) {
    if (!this.isModifiable(x, y)) return;
    const id = erase ? 0 : this.drawItem;
    if (id !== 0 && !this.available[id]) return;
    this.sim.grid[x * YSIZE + y] = id;
  }

  // --- selection ------------------------------------------------------------

  beginSelection(x, y) {
    this.selection = { x, y, w: 0, h: 0 };
  }

  dragSelection(x, y) {
    if (!this.selection) return;
    this.selection.w = x - this.selection.x;
    this.selection.h = y - this.selection.y;
  }

  clearSelection() {
    this.selection = null;
    this.clip = false;
  }

  /** Fill the selection with `id` (0 to erase), respecting locked cells. */
  fill(id) {
    if (!this.selection) return;
    const b = (this.selection = normalized(this.selection));
    for (let dx = 0; dx <= b.w; dx++) {
      for (let dy = 0; dy <= b.h; dy++) {
        const x = b.x + dx, y = b.y + dy;
        if (this.isModifiable(x, y)) this.sim.grid[x * YSIZE + y] = id;
      }
    }
  }

  /** Copy (or cut) the selection into the clipboard, arming a paste. */
  copy(cut) {
    if (!this.selection) return;
    const b = (this.selection = normalized(this.selection));
    const data = new Uint8Array((b.w + 1) * (b.h + 1));
    for (let dx = 0; dx <= b.w; dx++) {
      for (let dy = 0; dy <= b.h; dy++) {
        data[dx * (b.h + 1) + dy] = this.sim.grid[(b.x + dx) * YSIZE + (b.y + dy)];
      }
    }
    this.clipboard = { data, w: b.w, h: b.h };
    this.clip = true;
    this.clipCut = cut;
  }

  clipAt(dx, dy) {
    return this.clipboard.data[dx * (this.clipboard.h + 1) + dy];
  }

  /**
   * Paste the clipboard with its top-left at (x,y). A cut first clears the
   * source region, then - as in the original - the selection is moved to the
   * paste point and its span clamped to the grid before the blit.
   */
  paste(x, y) {
    if (!this.clip || !this.clipboard || !this.selection) return;
    const sel = this.selection;

    if (this.clipCut) {
      for (let dx = 0; dx <= sel.w; dx++) {
        for (let dy = 0; dy <= sel.h; dy++) {
          const sx = sel.x + dx, sy = sel.y + dy;
          if (this.isModifiable(sx, sy)) this.sim.grid[sx * YSIZE + sy] = 0;
        }
      }
      sel.x = x;
      sel.y = y;
      sel.w = Math.min(sel.w, XSIZE - sel.x - 1);
      sel.h = Math.min(sel.h, YSIZE - sel.y - 1);
    }

    for (let dx = 0; dx <= sel.w; dx++) {
      for (let dy = 0; dy <= sel.h; dy++) {
        const tx = x + dx, ty = y + dy;
        const v = this.clipAt(dx, dy);
        if (this.inGrid(tx, ty) && this.isModifiable(tx, ty) && this.available[v]) {
          this.sim.grid[tx * YSIZE + ty] = v;
        }
      }
    }
    this.clip = false;
  }

  // --- keyboard component picking ------------------------------------------

  /**
   * 0-9 / a-f / ? pick cargo by value. Pressing the same key again toggles
   * between the crate and the barrel of that value, which is how the original
   * lets you reach barrels without the palette.
   */
  pickCargo(ch) {
    let n;
    if (ch >= "0" && ch <= "9") n = ch.charCodeAt(0) - 48;
    else if (ch >= "a" && ch <= "f") n = ch.charCodeAt(0) - 97 + 10;
    else if (ch >= "A" && ch <= "F") n = ch.charCodeAt(0) - 65 + 10;
    else if (ch === "?") n = 16;
    else return false;

    const crate = T.crate + n, barrel = T.barrel + n;
    if (this.available[crate] &&
        (this.drawItem < T.barrel || this.drawItem > T.barrel + 16 || this.drawItem === barrel) &&
        this.drawItem !== crate) {
      this.drawItem = crate;
    } else if (this.available[barrel]) {
      this.drawItem = barrel;
    }
    return true;
  }

  /**
   * Arrow keys walk the palette grid, skipping unavailable entries.
   * The palette is 30 wide; the original bounds the walk to columns 0..28,
   * so column 29 is unreachable this way - kept as-is.
   */
  moveDrawItem(dx, dy) {
    let px = this.drawItem % 30, py = Math.floor(this.drawItem / 30);
    for (;;) {
      px += dx;
      py += dy;
      if (px < 0 || px > 28 || py < 0 || py > 2) return false;
      const id = py * 30 + px;
      if (this.available[id]) {
        this.drawItem = id;
        return true;
      }
    }
  }
}
