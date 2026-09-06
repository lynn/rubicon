// Rubicon simulation core: a cellular automaton over a 50x31 tile grid.
// Faithful transliteration of physicsv2() from the original Processing source.
//
// No DOM, no canvas, no imports beyond tile constants - so this runs in Node for
// tick-by-tick differential testing against the original Java build.
//
// Fidelity notes (deliberate, do not "fix"):
//   * grid() returns GIRDER out of bounds, so the playfield has solid walls.
//   * The `moved` flag array is one cell larger than the grid in each direction,
//     matching the original's int[xsize+1][ysize+1]; several rules read moved at
//     y+1 on the bottom row and rely on that slack.
//   * The copierup rule checks moved[x][y+1] while writing moved[x][y-1]. That
//     looks like a typo in the original, but archived levels were designed
//     against this behaviour, so it is preserved exactly.

import { XSIZE, YSIZE, T, isCrate, isActualCrate } from "./tiles.js";
import { JavaRandom, randomCargo } from "./rng.js";

const MW = XSIZE + 1; // moved/doorNorthWest stride
const MH = YSIZE + 1;

export class Sim {
  constructor(rng = new JavaRandom()) {
    this.xsize = XSIZE;
    this.ysize = YSIZE;
    this.grid = new Uint8Array(XSIZE * YSIZE);
    this.moved = new Uint8Array(MW * MH);
    this.doorNorthWest = new Uint8Array(MW * MH);
    this.physicsVersion = 2;
    this.rng = rng;
  }

  // --- accessors -----------------------------------------------------------

  /** Tile at (x,y); out of bounds reads as a girder (solid wall). */
  g(x, y) {
    if (x > -1 && x < XSIZE && y > -1 && y < YSIZE) return this.grid[x * YSIZE + y];
    return T.girder;
  }

  set(x, y, v) {
    this.grid[x * YSIZE + y] = v;
  }

  mv(x, y) {
    return this.moved[x * MH + y];
  }

  setMv(x, y, v) {
    this.moved[x * MH + y] = v;
  }

  dnw(x, y) {
    return this.doorNorthWest[x * MH + y] === 1;
  }

  setDnw(x, y, v) {
    this.doorNorthWest[x * MH + y] = v ? 1 : 0;
  }

  // --- simulation ----------------------------------------------------------

  step() {
    this.physics();
  }

  /**
   * The two physics models differ in only three places (the November 2006
   * change: "Copiers, Packers and Unpackers were all processing their inputs
   * immediately, rather than waiting a click"). Rather than duplicate 290
   * lines, the three sites branch on `v1`:
   *   1. the pipeup scan stops at row 1 instead of row 0;
   *   2. copiers run in pass C (v2) or at the head of pass E (v1);
   *   3. v1 copiers/packers/unpackers skip the `moved` guards, so they can act
   *      on cargo that already moved this tick - hence "one click faster".
   */
  physics() {
    const { xsize, ysize } = this;
    const v1 = this.physicsVersion === 1;
    let x, y, n;

    // Pass A: reset move flags, clear locked blanks, and open doors whose key
    // is now covered on one side.
    for (y = 0; y < ysize; y++) {
      for (x = 0; x < xsize; x++) {
        this.setMv(x, y, 0);
        if (this.g(x, y) === T.fixedblank) this.set(x, y, 0);

        if (this.g(x, y) === T.doorkey && this.g(x, y - 1) === 0 && this.mv(x, y - 1) === 0 &&
            this.g(x, y + 1) === T.door && this.dnw(x, y + 1)) {
          this.set(x, y + 1, 0);
          this.setMv(x, y + 1, 1);
        }
        if (this.g(x, y) === T.doorkey && this.g(x, y + 1) === 0 && this.mv(x, y + 1) === 0 &&
            this.g(x, y - 1) === T.door && !this.dnw(x, y - 1)) {
          this.set(x, y - 1, 0);
          this.setMv(x, y - 1, 1);
        }
        if (this.g(x, y) === T.doorkey && this.g(x - 1, y) === 0 && this.mv(x - 1, y) === 0 &&
            this.g(x + 1, y) === T.trapdoor && this.dnw(x + 1, y)) {
          this.set(x + 1, y, 0);
          this.setMv(x + 1, y, 1);
        }
        if (this.g(x, y) === T.doorkey && this.g(x + 1, y) === 0 && this.mv(x + 1, y) === 0 &&
            this.g(x - 1, y) === T.trapdoor && !this.dnw(x - 1, y)) {
          this.set(x - 1, y, 0);
          this.setMv(x - 1, y, 1);
        }
      }
    }

    // Pass B: extrude new doors/trapdoors from keys, and burn cargo in furnaces.
    for (y = 0; y < ysize; y++) {
      for (x = 0; x < xsize; x++) {
        if (!(y >= ysize - 1 || this.g(x, y) !== T.doorkey || this.g(x, y - 1) !== 0 ||
              this.g(x, y + 1) <= 0 || this.mv(x, y + 1) !== 0 ||
              (this.g(x, y + 1) === T.door && this.dnw(x, y + 1)))) {
          this.set(x, y - 1, T.door);
          this.setMv(x, y - 1, 1);
          this.setDnw(x, y - 1, false);
        }
        if (y > 0 && this.g(x, y) === T.doorkey && this.g(x, y + 1) === 0 &&
            this.g(x, y - 1) > 0 && this.mv(x, y - 1) === 0 &&
            (this.g(x, y - 1) !== T.door || this.dnw(x, y - 1))) {
          this.set(x, y + 1, T.door);
          this.setMv(x, y + 1, 1);
          this.setDnw(x, y + 1, true);
        }
        if (!(x >= xsize - 1 || this.g(x, y) !== T.doorkey || this.g(x - 1, y) !== 0 ||
              this.g(x + 1, y) <= 0 || this.mv(x + 1, y) !== 0 ||
              (this.g(x + 1, y) === T.trapdoor && this.dnw(x + 1, y)))) {
          this.set(x - 1, y, T.trapdoor);
          this.setMv(x - 1, y, 1);
          this.setDnw(x - 1, y, false);
        }
        if (x > 0 && this.g(x, y) === T.doorkey && this.g(x + 1, y) === 0 &&
            this.g(x - 1, y) > 0 && this.mv(x - 1, y) === 0 &&
            (this.g(x - 1, y) !== T.trapdoor || this.dnw(x - 1, y))) {
          this.set(x + 1, y, T.trapdoor);
          this.setMv(x + 1, y, 1);
          this.setDnw(x + 1, y, true);
        }

        if (this.g(x, y) === T.furnace) {
          if (isCrate(this.g(x, y - 1))) this.set(x, y - 1, 0);
          if (isCrate(this.g(x + 1, y))) this.set(x + 1, y, 0);
          if (isCrate(this.g(x - 1, y))) this.set(x - 1, y, 0);
          if (isCrate(this.g(x, y + 1))) this.set(x, y + 1, 0);
        }
      }
    }

    // Pass C (bottom-up): randomisers, gravity, ramps, pipes, winches, copiers.
    for (y = ysize - 1; y >= 0; y--) {
      for (x = 0; x < xsize; x++) {
        if (this.g(x, y) === T.randomcrate && this.g(x, y + 1) !== T.copier &&
            this.g(x, y - 1) !== T.copierup) {
          this.set(x, y, randomCargo(this.rng, 60));
        }
        if (this.g(x, y) === T.randombarrel && this.g(x, y + 1) !== T.copier &&
            this.g(x, y - 1) !== T.copierup) {
          this.set(x, y, randomCargo(this.rng, 30));
        }

        if (this.mv(x, y) !== 0) continue;

        // fall straight down
        if ((isCrate(this.g(x, y)) || this.g(x, y) === T.dozerright ||
             this.g(x, y) === T.dozerleft) && this.g(x, y + 1) === 0) {
          this.set(x, y + 1, this.g(x, y));
          this.set(x, y, 0);
          this.setMv(x, y + 1, 1);
        }
        // slide down-left off a right ramp
        if ((isCrate(this.g(x, y)) || this.g(x, y) === T.dozerleft) &&
            this.g(x, y + 1) === T.rampright && this.g(x - 1, y + 1) === 0 &&
            this.g(x - 1, y) === 0) {
          this.set(x - 1, y + 1, this.g(x, y));
          this.set(x, y, 0);
          this.setMv(x - 1, y + 1, 1);
        }
        // slide down-right off a left ramp
        if ((isCrate(this.g(x, y)) || this.g(x, y) === T.dozerright) &&
            this.g(x, y + 1) === T.rampleft && this.g(x + 1, y + 1) === 0 &&
            this.g(x + 1, y) === 0) {
          this.set(x + 1, y + 1, this.g(x, y));
          this.set(x, y, 0);
          this.setMv(x + 1, y + 1, 1);
        }
        // suck up through a pipe
        if (isCrate(this.g(x, y)) && this.g(x, y - 1) === T.pipeup) {
          for (n = y - 2; v1 ? n > 0 : n >= 0; n--) {
            if (this.g(x, n) === 0) {
              this.set(x, n, this.g(x, y));
              this.set(x, y, 0);
              this.setMv(x, n, 1);
              n = 0;
            } else if (this.g(x, n) !== T.pipeup) {
              n = 0;
            }
          }
        }
        // drop down through a pipe
        if (isCrate(this.g(x, y)) && this.g(x, y + 1) === T.pipedown) {
          for (n = y + 2; n < ysize; n++) {
            if (this.g(x, n) === 0) {
              this.set(x, n, this.g(x, y));
              this.set(x, y, 0);
              this.setMv(x, n, 1);
              n = ysize;
            } else if (this.g(x, n) !== T.pipedown) {
              n = ysize;
            }
          }
        }
        // winches: carry one cell and flip direction
        if (isCrate(this.g(x, y)) && this.g(x, y + 1) === T.winchdown && this.g(x, y + 2) === 0) {
          this.set(x, y + 2, this.g(x, y));
          this.set(x, y, 0);
          this.set(x, y + 1, T.winchup);
          this.setMv(x, y + 2, 1);
        }
        if (isCrate(this.g(x, y)) && this.g(x, y - 1) === T.winchup && this.g(x, y - 2) === 0) {
          this.set(x, y - 2, this.g(x, y));
          this.set(x, y, 0);
          this.set(x, y - 1, T.winchdown);
          this.setMv(x, y - 2, 1);
        }
        // copiers (v2 only - v1 runs these at the head of pass E instead)
        if (!v1) {
          if (isCrate(this.g(x, y - 1)) && this.g(x, y) === T.copier &&
              this.g(x, y + 1) === 0 && this.mv(x, y + 1) === 0) {
            this.set(x, y + 1, this.g(x, y - 1));
            this.setMv(x, y + 1, 1);
          }
          if (isCrate(this.g(x, y + 1)) && this.g(x, y) === T.copierup &&
              this.g(x, y - 1) === 0 && this.mv(x, y + 1) === 0) { // sic: y+1, see header
            this.set(x, y - 1, this.g(x, y + 1));
            this.setMv(x, y - 1, 1);
          }
        }
      }
    }

    // Pass D (bottom-up): conveyors and dozers.
    for (y = ysize - 1; y >= 0; y--) {
      for (x = 0; x < xsize; x++) {
        if (this.mv(x, y) !== 0) continue;

        if (isCrate(this.g(x, y)) && this.g(x, y + 1) === T.conveyorright) this.pushCrate(x, y, 1);
        if (isCrate(this.g(x, y)) && this.g(x, y + 1) === T.conveyorleft) this.pushCrate(x, y, -1);

        if (this.g(x, y) === T.dozerright && this.g(x + 1, y - 1) === T.flipsign) {
          this.set(x, y, T.dozerleft);
          this.setMv(x, y, 1);
        } else if (this.g(x, y) === T.dozerright && this.g(x + 1, y) === 0 && this.g(x, y + 1) > 0) {
          this.set(x + 1, y, this.g(x, y));
          this.set(x, y, 0);
          this.setMv(x + 1, y, 1);
        } else if (this.g(x, y) === T.dozerright && this.g(x + 1, y) === T.rampright &&
                   this.g(x + 1, y - 1) === 0 && this.g(x, y - 1) === 0) {
          this.set(x + 1, y - 1, this.g(x, y));
          this.set(x, y, 0);
          this.setMv(x + 1, y - 1, 2);
        } else if (this.g(x, y) === T.dozerright && this.g(x + 1, y) === T.rampright &&
                   isCrate(this.g(x + 1, y - 1)) && this.g(x, y - 1) === 0) {
          if (this.pushCrate(x + 1, y - 1, 1)) {
            this.set(x + 1, y - 1, this.g(x, y));
            this.set(x, y, 0);
            this.setMv(x + 1, y - 1, 2);
          }
        } else if (this.g(x, y) === T.dozerright && isCrate(this.g(x + 1, y))) {
          if (this.pushCrate(x + 1, y, 1)) {
            this.set(x + 1, y, this.g(x, y));
            this.set(x, y, 0);
            this.setMv(x + 1, y, 1);
          }
        } else if (this.g(x, y) === T.dozerleft && this.g(x - 1, y - 1) === T.flipsign) {
          this.set(x, y, T.dozerright);
          this.setMv(x, y, 1);
        } else if (this.g(x, y) === T.dozerleft && this.g(x - 1, y) === 0 && this.g(x, y + 1) > 0) {
          this.set(x - 1, y, this.g(x, y));
          this.set(x, y, 0);
          this.setMv(x - 1, y, 1);
        } else if (this.g(x, y) === T.dozerleft && this.g(x - 1, y) === T.rampleft &&
                   this.g(x - 1, y - 1) === 0 && this.g(x, y - 1) === 0) {
          this.set(x - 1, y - 1, this.g(x, y));
          this.set(x, y, 0);
          this.setMv(x - 1, y - 1, 2);
        } else if (this.g(x, y) === T.dozerleft && this.g(x - 1, y) === T.rampleft &&
                   isCrate(this.g(x - 1, y - 1)) && this.g(x, y - 1) === 0) {
          if (this.pushCrate(x - 1, y - 1, -1)) {
            this.set(x - 1, y - 1, this.g(x, y));
            this.set(x, y, 0);
            this.setMv(x - 1, y - 1, 2);
          }
        } else if (this.g(x, y) === T.dozerleft && isCrate(this.g(x - 1, y)) &&
                   this.pushCrate(x - 1, y, -1)) {
          this.set(x - 1, y, this.g(x, y));
          this.set(x, y, 0);
          this.setMv(x - 1, y, 1);
        }
      }
    }

    // Pass E (bottom-up): gates, target matchers, packers and unpackers.
    for (y = ysize - 1; y >= 0; y--) {
      for (x = 0; x < xsize; x++) {
        if (this.mv(x, y) !== 0) continue;
        let a, b, isBarrel;

        // v1 copiers: same rules, but without the `moved` guards and run here
        // rather than in pass C.
        if (v1) {
          if (isCrate(this.g(x, y - 1)) && this.g(x, y) === T.copier &&
              this.g(x, y + 1) === 0) {
            this.set(x, y + 1, this.g(x, y - 1));
            this.setMv(x, y + 1, 1);
          }
          if (isCrate(this.g(x, y + 1)) && this.g(x, y) === T.copierup &&
              this.g(x, y - 1) === 0) {
            this.set(x, y - 1, this.g(x, y + 1));
            this.setMv(x, y - 1, 1);
          }
        }

        // gate: route the crate above left or right by comparing it to the one below
        if (this.g(x, y) === T.gate && isCrate(this.g(x, y - 1)) &&
            isCrate(this.g(x, y + 1)) && this.mv(x, y - 1) === 0) {
          a = this.g(x, y + 1);
          a = a > 59 ? a - 60 : a - 30;
          b = this.g(x, y - 1);
          b = b > 59 ? b - 60 : b - 30;
          if (a >= b && this.g(x - 1, y - 1) === 0) {
            this.set(x - 1, y - 1, this.g(x, y - 1));
            this.set(x, y - 1, 0);
            this.setMv(x - 1, y - 1, 1);
          } else if (a < b && this.g(x + 1, y - 1) === 0) {
            this.set(x + 1, y - 1, this.g(x, y - 1));
            this.set(x, y - 1, 0);
            this.setMv(x + 1, y - 1, 1);
          }
        }

        // target matcher
        const t = this.g(x, y);
        if ((t === T.matchgreen || t === T.matchred || t === T.matchoff) &&
            isActualCrate(this.g(x, y - 1)) && isActualCrate(this.g(x, y + 1))) {
          this.set(x, y, this.g(x, y + 1) === this.g(x, y - 1) ? T.matchgreen : T.matchred);
        }
        if (!((this.g(x, y) !== T.matchgreen && this.g(x, y) !== T.matchred) ||
              (isActualCrate(this.g(x, y - 1)) && isActualCrate(this.g(x, y + 1))))) {
          this.set(x, y, T.matchoff);
        }

        // packer / unpacker: combine the two cargo below into one to the right
        if (this.g(x, y) === T.packer && isCrate(this.g(x - 1, y + 1)) &&
            isCrate(this.g(x, y + 1)) && this.g(x + 1, y + 1) === 0 &&
            (v1 || (this.mv(x - 1, y + 1) === 0 && this.mv(x, y + 1) === 0))) {
          isBarrel = false;
          a = this.g(x - 1, y + 1);
          if (a > 59) a -= 60; else { a -= 30; isBarrel = true; }
          b = this.g(x, y + 1);
          if (b > 59) b -= 60; else { b -= 30; isBarrel = true; }
          a = (a + b) % 16;
          this.set(x - 1, y + 1, 0);
          this.set(x, y + 1, 0);
          this.set(x + 1, y + 1, isBarrel ? 30 + a : 60 + a);
          this.setMv(x + 1, y + 1, 1);
        } else if (this.g(x, y) === T.unpacker && isCrate(this.g(x - 1, y + 1)) &&
                   isCrate(this.g(x, y + 1)) && this.g(x + 1, y + 1) === 0 &&
                   (v1 || (this.mv(x - 1, y + 1) === 0 && this.mv(x, y + 1) === 0))) {
          isBarrel = false;
          a = this.g(x - 1, y + 1);
          if (a > 59) a -= 60; else { a -= 30; isBarrel = true; }
          b = this.g(x, y + 1);
          if (b > 59) b -= 60; else { b -= 30; isBarrel = true; }
          a = (16 + a - b) % 16;
          this.set(x - 1, y + 1, 0);
          this.set(x, y + 1, 0);
          this.set(x + 1, y + 1, isBarrel ? 30 + a : 60 + a);
          this.setMv(x + 1, y + 1, 1);
        }
      }
    }
  }

  /**
   * Try to shove the cargo at (x,y) one cell in direction dx (+1/-1),
   * recursively pushing whatever is in the way and climbing ramps.
   * Returns true if the push succeeded (and performs the move).
   */
  pushCrate(x, y, dx) {
    let ok = false;
    if (this.g(x + dx, y) === 0) {
      ok = true;
    } else if (this.g(x + dx, y) === T.rampright && isCrate(this.g(x + dx, y - 1)) &&
               this.g(x, y - 1) === 0 && dx === 1) {
      ok = this.pushCrate(x + dx, y - 1, dx);
    } else if (this.g(x + dx, y) === T.rampleft && isCrate(this.g(x + dx, y - 1)) &&
               this.g(x, y - 1) === 0 && dx === -1) {
      ok = this.pushCrate(x + dx, y - 1, dx);
    } else if (this.g(x + dx, y) === T.rampright && this.g(x + dx, y - 1) === 0 &&
               this.g(x, y - 1) === 0 && dx === 1) {
      ok = true;
    } else if (this.g(x + dx, y) === T.rampleft && this.g(x + dx, y - 1) === 0 &&
               this.g(x, y - 1) === 0 && dx === -1) {
      ok = true;
    } else if (isCrate(this.g(x + dx, y))) {
      ok = this.pushCrate(x + dx, y, dx);
    }

    if (ok) {
      if ((this.g(x + dx, y) === T.rampright && this.g(x + dx, y - 1) === 0 && dx === 1) ||
          (this.g(x + dx, y) === T.rampleft && this.g(x + dx, y - 1) === 0 && dx === -1)) {
        this.set(x + dx, y - 1, this.g(x, y));
        this.set(x, y, 0);
        this.setMv(x + dx, y - 1, 1);
      } else {
        this.set(x + dx, y, this.g(x, y));
        this.set(x, y, 0);
        this.setMv(x + dx, y, 1);
      }
    }
    return ok;
  }
}
