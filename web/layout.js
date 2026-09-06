// Screen geometry, copied from the original.
//
// The whole 800x600 applet is one image: the playfield is 50x31 16px tiles
// (800x496), and everything below it - the palette, the buttons, the QUIT tab -
// is a single blit of blocks.gif at y=500. So the spritesheet is not just the
// tiles, it IS the toolbox chrome, and the palette slots are the sprites where
// they already sit in the sheet. Nothing here is redrawn or restyled; the port
// only paints the overlays the original paints (grey-out, selection outline,
// button highlights, text).

export const SCREEN_W = 800;
export const SCREEN_H = 600;
export const GRID_H = 496; // 31 * 16; the 496..500 band is dead space
export const PANEL_Y = 500; // where blocks.gif is blitted

// Boxes verbatim from the original's field initialisers. Note w/h are INCLUSIVE
// spans in Box.contains() - a 34-wide box spans 35 pixels - so hit-testing uses
// <=, exactly as the original does.
export const BOX = {
  quit: { x: 9, y: 567, w: 36, h: 16 },
  load: { x: 490, y: 506, w: 57, h: 14 },
  save: { x: 490, y: 523, w: 57, h: 14 },
  clear: { x: 558, y: 507, w: 34, h: 34 },
  stop: { x: 597, y: 507, w: 34, h: 34 },
  play: { x: 636, y: 507, w: 34, h: 34 },
  game: { x: 675, y: 507, w: 34, h: 15 },
  sandbox: { x: 675, y: 526, w: 34, h: 15 },
  next: { x: 714, y: 507, w: 74, h: 34 },
  toolbox: { x: 6, y: 508, w: 492, h: 50 },
};

/** The original's main menu, drawn over a black screen. */
export const MENU = {
  box: { x: 250, y: 100, w: 300, h: 220 },
  play: { x: 325, y: 190, w: 150, h: 24, label: "Play Base Levels", ox: 20, oy: 18 },
  load: { x: 325, y: 220, w: 150, h: 24, label: "Load a Level", ox: 35, oy: 18 },
  sandbox: { x: 325, y: 250, w: 150, h: 24, label: "Build in the Sandbox", ox: 5, oy: 18 },
};

export const contains = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

// The palette is a 30-column grid on a 17px pitch, and tile id == slot index.
export const PALETTE_COLS = 30;
export const PALETTE_PITCH = 17;

/** Screen position of the palette slot for tile `id`. */
export const slotX = (id) => BOX.toolbox.x + (id % PALETTE_COLS) * PALETTE_PITCH;
export const slotY = (id) => BOX.toolbox.y + Math.floor(id / PALETTE_COLS) * PALETTE_PITCH;

/** Tile id under a point in the toolbox, or -1. */
export function slotAt(x, y) {
  if (!contains(BOX.toolbox, x, y)) return -1;
  const col = Math.floor((x - BOX.toolbox.x) / PALETTE_PITCH);
  const row = Math.floor((y - BOX.toolbox.y) / PALETTE_PITCH);
  return col + row * PALETTE_COLS;
}

// Where the original stamps a copy of the selected component, next to QUIT.
export const DRAWITEM_PREVIEW = { x: 61, y: 567 };

// Text anchors (Processing's text() takes a left/baseline origin).
export const TEXT = {
  desc: { x: 100, y: 580 },   // tile description, second line 16px lower
  descLine2: { x: 100, y: 596 },
  hud: { x: 727, y: 530 },    // "Level 1" / "Next >>" / "Solved!"
  hudNumY: 528,               // frame count and $cost, right-aligned-ish at 751
  hudNumRight: 751,
};
