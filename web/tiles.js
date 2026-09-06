// Tile ids, the ASCII level alphabet, and cargo helpers.
// Transliterated from the original Processing source (rubicon 1.27).

export const XSIZE = 50;
export const YSIZE = 31;
export const TILE = 16; // source pixels per tile

export const T = {
  empty: 0,
  girder: 1,
  vertgirder: 2,
  conveyorright: 3,
  conveyorleft: 4,
  pipeup: 5,
  pipedown: 6,
  dozerright: 7,
  dozerleft: 8,
  rampright: 9,
  rampleft: 10,
  flipsign: 11,
  copierup: 12,
  copier: 13,
  winchup: 14,
  winchdown: 15,
  gate: 16,
  packer: 17,
  unpacker: 18,
  antisign: 19,
  barrel: 30,        // barrels 30..45 carry hex values 0..F
  randombarrel: 46,
  doorkey: 47,
  furnace: 48,
  trapdoor: 49,
  door: 50,
  crate: 60,         // crates 60..75 carry hex values 0..F
  randomcrate: 76,
  matchoff: 77,
  matchgreen: 78,
  matchred: 79,
  fixedblank: 88,
};

// Index == tile id. NOTE: this is deliberately not a bijection - 'T' appears at
// 77/78/79 and 'X' at 28/29/58/59/89. The original decodes with indexOf, so the
// FIRST index wins; see charToId below. Encoding is plain alphabet[id], which
// makes a round-trip lossy for those ids on purpose (match state is derived at
// runtime, never stored).
export const ALPHABET =
  " =|><MW()/\\,.:AVK+-~EQZDHSOYXXghijklmnopqrstuv!xFyzN%RBw^PXX0123456789abcdef?TTT#CLG_IJU$X";

const CHAR_TO_ID = (() => {
  const m = new Map();
  for (let i = 0; i < ALPHABET.length; i++) {
    if (!m.has(ALPHABET[i])) m.set(ALPHABET[i], i); // first index wins
  }
  return m;
})();

/** Decode one level character; unknown characters become empty space. */
export function charToId(ch) {
  const id = CHAR_TO_ID.get(ch);
  return id === undefined ? -1 : id;
}

export const idToChar = (id) => ALPHABET[id] ?? " ";

/** Cargo: crates (60..76) and barrels (30..46). */
export const isCrate = (n) => (n > 29 && n < 47) || (n > 59 && n < 77);

/** Crates only - what a target matcher compares. */
export const isActualCrate = (n) => n > 59 && n < 77;

/** Numeric value 0..15 carried by a crate or barrel. */
export const cargoValue = (n) => (n > 59 ? n - 60 : n - 30);
