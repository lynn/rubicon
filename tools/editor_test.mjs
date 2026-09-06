// Unit tests for the editor operations (selection, fill, copy/cut/paste,
// keyboard component picking). The Editor is DOM-free, so this runs in Node.
//
//   node tools/editor_test.mjs

import { Sim } from "../web/sim.js";
import { Editor, normalized } from "../web/editor.js";
import { XSIZE, YSIZE, T } from "../web/tiles.js";
import { computeGameplayState } from "../web/level.js";

let pass = 0, fail = 0;
const check = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`ok   ${name}`); }
  else { fail++; console.log(`FAIL ${name}${detail ? "  " + detail : ""}`); }
};

const at = (sim, x, y) => sim.grid[x * YSIZE + y];

/** A blank sandbox: everything available, nothing locked. */
function sandbox() {
  const sim = new Sim();
  const ed = new Editor();
  const available = new Uint8Array(90).fill(1);
  ed.attach(sim, available, new Uint8Array(XSIZE * YSIZE));
  return { sim, ed };
}

// --- normalize --------------------------------------------------------------
{
  const b = normalized({ x: 10, y: 10, w: -3, h: -2 });
  check("normalize flips a negative drag", b.x === 7 && b.y === 8 && b.w === 3 && b.h === 2,
        JSON.stringify(b));
}

// --- painting ---------------------------------------------------------------
{
  const { sim, ed } = sandbox();
  ed.drawItem = T.girder;
  ed.paint(3, 4, false);
  check("paint places the current component", at(sim, 3, 4) === T.girder);
  ed.paint(3, 4, true);
  check("right-click erases", at(sim, 3, 4) === 0);
}

// --- selection + fill -------------------------------------------------------
{
  const { sim, ed } = sandbox();
  ed.drawItem = T.conveyorright;
  ed.beginSelection(5, 5);
  ed.dragSelection(8, 7);              // inclusive 4x3
  ed.fill(ed.drawItem);
  let filled = 0;
  for (let x = 5; x <= 8; x++) for (let y = 5; y <= 7; y++) if (at(sim, x, y) === T.conveyorright) filled++;
  check("fill covers the inclusive span", filled === 12, `${filled}/12`);
  check("fill does not spill outside", at(sim, 9, 7) === 0 && at(sim, 4, 5) === 0);

  ed.fill(0);
  let cleared = 0;
  for (let x = 5; x <= 8; x++) for (let y = 5; y <= 7; y++) if (at(sim, x, y) === 0) cleared++;
  check("delete clears the selection", cleared === 12);
}

// --- backwards drag ---------------------------------------------------------
{
  const { sim, ed } = sandbox();
  ed.drawItem = T.girder;
  ed.beginSelection(9, 9);
  ed.dragSelection(6, 7);              // dragged up-left: negative w/h
  ed.fill(ed.drawItem);
  let n = 0;
  for (let x = 6; x <= 9; x++) for (let y = 7; y <= 9; y++) if (at(sim, x, y) === T.girder) n++;
  check("fill works on an up-left drag", n === 12, `${n}/12`);
}

// --- copy / paste -----------------------------------------------------------
{
  const { sim, ed } = sandbox();
  sim.grid[2 * YSIZE + 2] = T.girder;
  sim.grid[3 * YSIZE + 2] = T.conveyorright;
  ed.beginSelection(2, 2);
  ed.dragSelection(3, 2);
  ed.copy(false);
  check("copy arms a paste", ed.clip === true && ed.clipCut === false);
  check("clipboard has the right span", ed.clipboard.w === 1 && ed.clipboard.h === 0);

  ed.paste(20, 10);
  check("paste writes the clipboard", at(sim, 20, 10) === T.girder && at(sim, 21, 10) === T.conveyorright);
  check("copy leaves the source intact", at(sim, 2, 2) === T.girder);
  check("paste disarms the clip", ed.clip === false);
}

// --- cut / paste ------------------------------------------------------------
{
  const { sim, ed } = sandbox();
  sim.grid[2 * YSIZE + 2] = T.girder;
  sim.grid[3 * YSIZE + 2] = T.conveyorright;
  ed.beginSelection(2, 2);
  ed.dragSelection(3, 2);
  ed.copy(true);
  ed.paste(20, 10);
  check("cut clears the source", at(sim, 2, 2) === 0 && at(sim, 3, 2) === 0);
  check("cut writes at the destination", at(sim, 20, 10) === T.girder && at(sim, 21, 10) === T.conveyorright);
}

// --- paste clipping at the grid edge ----------------------------------------
{
  const { sim, ed } = sandbox();
  sim.grid[0 * YSIZE + 0] = T.girder;
  sim.grid[1 * YSIZE + 0] = T.girder;
  ed.beginSelection(0, 0);
  ed.dragSelection(1, 0);
  ed.copy(false);
  ed.paste(XSIZE - 1, 0);              // second cell falls off the right edge
  check("paste clips at the grid edge", at(sim, XSIZE - 1, 0) === T.girder);
  check("paste did not wrap around", at(sim, 0, 1) === 0);
}

// --- locked cells are respected ---------------------------------------------
{
  const sim = new Sim();
  // a girder is a player-available type, so as part of a level it becomes locked
  sim.grid[10 * YSIZE + 10] = T.girder;
  const { available, locked } = computeGameplayState(sim.grid);
  const ed = new Editor();
  ed.attach(sim, available, locked);
  check("existing available components are locked", locked[10 * YSIZE + 10] === 1);

  ed.paint(10, 10, true);
  check("locked cells resist erasing", at(sim, 10, 10) === T.girder);

  ed.drawItem = T.girder;
  ed.beginSelection(9, 9);
  ed.dragSelection(11, 11);
  ed.fill(0);
  check("fill skips locked cells", at(sim, 10, 10) === T.girder);
  check("fill still clears unlocked neighbours", at(sim, 9, 9) === 0);
}

// --- unavailable tiles cannot be pasted -------------------------------------
{
  const sim = new Sim();
  sim.grid[5 * YSIZE + 5] = 61;         // a crate: never player-placeable
  const { available, locked } = computeGameplayState(sim.grid);
  const ed = new Editor();
  ed.attach(sim, available, locked);
  ed.beginSelection(5, 5);
  ed.dragSelection(5, 5);
  ed.copy(false);
  ed.paste(30, 20);
  check("paste refuses unavailable tiles", at(sim, 30, 20) === 0);
}

// --- keyboard cargo picking -------------------------------------------------
{
  const { ed } = sandbox();
  ed.drawItem = T.girder;
  ed.pickCargo("3");
  check("digit picks the crate", ed.drawItem === T.crate + 3, `got ${ed.drawItem}`);
  ed.pickCargo("3");
  check("same digit again toggles to the barrel", ed.drawItem === T.barrel + 3, `got ${ed.drawItem}`);
  ed.pickCargo("3");
  check("and back to the crate", ed.drawItem === T.crate + 3, `got ${ed.drawItem}`);
  ed.pickCargo("b");
  check("hex letters work", ed.drawItem === T.crate + 11, `got ${ed.drawItem}`);
  ed.pickCargo("?");
  check("? picks the random crate", ed.drawItem === T.randomcrate, `got ${ed.drawItem}`);
  check("non-cargo keys are ignored", ed.pickCargo("z") === false);
}

// --- arrow-key palette walking ----------------------------------------------
{
  const { ed } = sandbox();
  ed.drawItem = 1;
  ed.moveDrawItem(1, 0);
  check("right arrow advances", ed.drawItem === 2, `got ${ed.drawItem}`);
  ed.moveDrawItem(0, 1);
  check("down arrow moves a palette row", ed.drawItem === 32, `got ${ed.drawItem}`);
  ed.drawItem = 0;
  check("left arrow stops at the edge", ed.moveDrawItem(-1, 0) === false);
}

// --- pipette ----------------------------------------------------------------
{
  const { sim, ed } = sandbox();
  sim.grid[7 * YSIZE + 8] = T.conveyorleft;
  ed.drawItem = T.girder;
  check("ctrl-click picks up the component under the cursor",
        ed.pick(7, 8) === true && ed.drawItem === T.conveyorleft, `got ${ed.drawItem}`);
  check("picking empty space selects the eraser", ed.pick(1, 1) === true && ed.drawItem === 0);
  check("picking outside the grid does nothing", ed.pick(-1, 0) === false);

  // A component the level forbids stays unpickable, or the palette rules could
  // be walked around by pipetting the level's own locked machinery.
  const restricted = new Uint8Array(90).fill(1);
  restricted[T.copier] = 0;
  ed.attach(sim, restricted, new Uint8Array(XSIZE * YSIZE));
  sim.grid[9 * YSIZE + 9] = T.copier;
  ed.drawItem = T.girder;
  check("unavailable components cannot be picked up",
        ed.pick(9, 9) === false && ed.drawItem === T.girder);
}

// --- clear ------------------------------------------------------------------
{
  const { sim, ed } = sandbox();
  sim.grid[3 * YSIZE + 3] = T.girder;
  sim.grid[4 * YSIZE + 4] = T.girder;
  ed.clearAll();
  check("clear blanks the grid", sim.grid.every((v) => v === 0));

  const locked = new Uint8Array(XSIZE * YSIZE);
  locked[5 * YSIZE + 5] = 1;
  ed.attach(sim, new Uint8Array(90).fill(1), locked);
  sim.grid[5 * YSIZE + 5] = T.girder;
  sim.grid[6 * YSIZE + 6] = T.girder;
  ed.clearAll();
  check("clear leaves the locked starting machine alone",
        at(sim, 5, 5) === T.girder && at(sim, 6, 6) === 0);
}

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
