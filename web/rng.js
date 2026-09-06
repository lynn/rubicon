// An exact reimplementation of java.util.Random, so the port can reproduce the
// original's random cargo sequences bit for bit. This is what makes the
// differential test meaningful on the ~75% of warehouse levels that use random
// crates or barrels; it also gives us seeded, replayable runs in the browser.
//
// Processing 1.x: random(f) == internalRandom.nextFloat() * f  (retrying while
// the product equals f, which cannot happen for our f=16).

const MASK = (1n << 48n) - 1n;
const MULT = 0x5deece66dn;
const ADD = 0xbn;

export class JavaRandom {
  constructor(seed = Date.now()) {
    this.setSeed(seed);
  }

  setSeed(seed) {
    this.seed = (BigInt(seed) ^ MULT) & MASK;
  }

  next(bits) {
    this.seed = (this.seed * MULT + ADD) & MASK;
    return Number(this.seed >> (48n - BigInt(bits)));
  }

  /** java.util.Random.nextFloat(): next(24) / 2^24, in float32. */
  nextFloat() {
    return Math.fround(this.next(24) / (1 << 24));
  }

  /** Processing's random(high), in float32. */
  random(high) {
    return Math.fround(this.nextFloat() * high);
  }
}

/**
 * Reproduces `(int)(base + random(16.0f))` including float32 rounding.
 * 60 + a 20-bit fraction needs 26 mantissa bits, so the addition really does
 * round in float32 - computing this in float64 gives different tiles.
 */
export function randomCargo(rng, base) {
  return Math.trunc(Math.fround(base + rng.random(16.0)));
}
