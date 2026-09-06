// Differential test: run each level through the original Java simulation and the
// JS port, and compare tick by tick.
//
//   node tools/difftest.mjs [--ticks N] <level.rub>...
//
// Both sides are seeded with the same value and the JS port reimplements
// java.util.Random exactly (web/rng.js), so levels with random cargo are
// compared too rather than skipped. Both physics models are covered.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { Sim } from "../web/sim.js";
import { JavaRandom } from "../web/rng.js";
import { parseLevel, gridToLines } from "../web/level.js";
import { XSIZE, YSIZE } from "../web/tiles.js";

const CP = "tools:original/rubicon.jar:original/core.jar";
const SEED = 12345; // must match Oracle.SEED

const args = process.argv.slice(2);
let ticks = 150;
const ti = args.indexOf("--ticks");
if (ti !== -1) { ticks = Number(args[ti + 1]); args.splice(ti, 2); }

function javaTicks(path) {
  const out = execFileSync("java", ["-cp", CP, "Oracle", path, String(ticks)],
                           { encoding: "latin1", maxBuffer: 1 << 28 });
  const lines = out.split("\n").filter(Boolean);
  const physics = Number(lines[0].split(" ")[1]);
  return { physics, frames: lines.slice(1).map((l) => l.slice(l.indexOf(" ") + 1)) };
}

function jsTicks(path, physics) {
  const text = readFileSync(path, "latin1");
  const { grid } = parseLevel(text);
  const sim = new Sim(new JavaRandom(SEED));
  sim.grid.set(grid);
  sim.physicsVersion = physics;
  const flat = () => {
    const rows = gridToLines(sim.grid);
    return rows.join("");
  };
  const frames = [flat()];
  for (let t = 1; t <= ticks; t++) { sim.step(); frames.push(flat()); }
  return frames;
}

let pass = 0, fail = 0, skip = 0;
for (const path of args) {
  const { physics, frames: jf } = javaTicks(path);
  let js;
  try { js = jsTicks(path, physics); }
  catch (e) { fail++; console.log(`FAIL ${path}: ${e.message}`); continue; }

  let bad = -1;
  for (let t = 0; t < jf.length; t++) if (jf[t] !== js[t]) { bad = t; break; }
  if (bad === -1) { pass++; console.log(`ok   ${path} (${jf.length - 1} ticks identical)`); }
  else {
    fail++;
    console.log(`FAIL ${path}: diverges at tick ${bad}`);
    const a = jf[bad], b = js[bad];
    for (let i = 0; i < a.length && i < b.length; i++) {
      if (a[i] !== b[i]) {
        const y = Math.floor(i / XSIZE), x = i % XSIZE;
        console.log(`       first cell (${x},${y}): java='${a[i]}' js='${b[i]}'`);
        break;
      }
    }
  }
}
console.log(`\n${pass} pass, ${fail} fail, ${skip} skipped`);
process.exit(fail ? 1 : 0);
