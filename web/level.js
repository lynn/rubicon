// Parsing and serialising Rubicon levels.
//
// A level is 31 lines of up to 50 characters, one character per tile (see
// tiles.js). Warehouse levels may be preceded by `* Key:value` metadata lines,
// which are interleaved with - not necessarily before - the grid rows, so the
// parser filters rather than slices.

import { XSIZE, YSIZE, charToId, idToChar } from "./tiles.js";

/**
 * @returns {{grid: Uint8Array, physicsVersion: number, title: string|null,
 *            designer: string|null, type: string|null, follows: string|null,
 *            archived: boolean, badChars: number}}
 */
export function parseLevel(text) {
  const lines = text.split(/\r\n|\r|\n/);
  const meta = {
    // The original defaults user levels to the OLD physics model and only
    // upgrades on an explicit "* Physics:2" header. Base levels set 2 directly.
    physicsVersion: 1,
    title: null,
    designer: null,
    type: null,
    follows: null,
  };
  const rows = [];

  for (const line of lines) {
    if (rows.length >= YSIZE) break;
    if (line.startsWith("*")) {
      if (line.startsWith("* Title:")) meta.title = line.slice(8);
      else if (line.startsWith("* Designer:")) meta.designer = line.slice(11) || "Anonymous";
      else if (line.startsWith("* Follows:")) meta.follows = line.slice(10);
      else if (line === "* Physics:2") meta.physicsVersion = 2;
      else if (line === "* Physics:1") meta.physicsVersion = 1;
      else if (line.startsWith("* Type:")) meta.type = line.slice(7) || "Unknown";
      else {
        // legacy freeform header: "* <title>*<designer>"
        const parts = line.slice(1).trim().split("*");
        if (parts.length > 1) {
          meta.title = parts[0];
          meta.designer = parts[1];
        } else if (meta.title === null) {
          meta.title = "Corrupted Level";
          meta.designer = "Unknown";
        }
      }
    } else {
      rows.push(line);
    }
  }

  const grid = new Uint8Array(XSIZE * YSIZE);
  let badChars = 0;
  for (let y = 0; y < YSIZE; y++) {
    const row = rows[y] ?? "";
    for (let x = 0; x < XSIZE; x++) {
      // short or missing rows pad with empty space
      const id = x < row.length ? charToId(row[x]) : 0;
      if (id === -1) badChars++;
      grid[x * YSIZE + y] = id === -1 ? 0 : id;
    }
  }

  return { grid, ...meta, archived: meta.title !== null, badChars };
}

/** Grid -> 31 lines of 50 characters (no metadata header). */
export function gridToLines(grid) {
  const out = [];
  for (let y = 0; y < YSIZE; y++) {
    let s = "";
    for (let x = 0; x < XSIZE; x++) s += idToChar(grid[x * YSIZE + y]);
    out.push(s);
  }
  return out;
}

/** The original's on-the-wire save format: "* Physics:N@" + rows joined by "@". */
export function serializeLevel(grid, physicsVersion) {
  return `* Physics:${physicsVersion}@` + gridToLines(grid).map((l) => l + "@").join("");
}

/**
 * Mirror of the original setGameplay(): works out which tile types the player
 * may use on this level, and which existing cells are undeletable.
 *
 * A level restricts the palette by placing "anti sign" tiles - every tile type
 * in the 3x3 neighbourhood of an anti sign becomes unavailable. Cargo,
 * doors/trapdoors and decorative blocks are never player-placeable.
 *
 * @returns {{available: Uint8Array, locked: Uint8Array}}
 */
export function computeGameplayState(grid) {
  const available = new Uint8Array(90).fill(1);
  available[28] = 0;
  available[58] = 0;

  for (let y = 0; y < YSIZE; y++) {
    for (let x = 0; x < XSIZE; x++) {
      if (grid[x * YSIZE + y] !== 19 /* antisign */) continue;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= XSIZE || ny < 0 || ny >= YSIZE) continue;
          available[grid[nx * YSIZE + ny]] = 0;
        }
      }
    }
  }

  for (let i = 19; i < 30; i++) available[i] = 0;
  for (let i = 49; i < 60; i++) available[i] = 0;
  for (let i = 60; i < 90; i++) available[i] = 0;
  available[0] = 1;

  const locked = new Uint8Array(XSIZE * YSIZE);
  for (let i = 0; i < grid.length; i++) locked[i] = grid[i] > 0 && available[grid[i]] ? 1 : 0;

  return { available, locked };
}
