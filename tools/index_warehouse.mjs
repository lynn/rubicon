// Build warehouse/index.json - metadata for every archived level, so the port
// can offer a browsable list without parsing 1500 files at load time.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseLevel } from "../web/level.js";
import { XSIZE, YSIZE, isCrate, T } from "../web/tiles.js";

const files = readdirSync("warehouse").filter((f) => f.endsWith(".rub")).sort();
const entries = [];

for (const f of files) {
  const code = f.replace(/\.rub$/, "");
  const lv = parseLevel(readFileSync(`warehouse/${f}`, "latin1"));

  let cells = 0, targets = 0, cargo = 0;
  for (const v of lv.grid) {
    if (v) cells++;
    if (v === T.matchoff || v === T.matchgreen || v === T.matchred) targets++;
    if (isCrate(v)) cargo++;
  }

  entries.push({
    code,
    title: lv.title,
    designer: lv.designer,
    type: lv.type,
    follows: lv.follows,
    physics: lv.physicsVersion,
    archived: lv.archived,   // false = never claimed in the Warehouse
    cells, targets, cargo,
  });
}

writeFileSync("warehouse/index.json", JSON.stringify(entries, null, 1));

const by = (k) => entries.reduce((m, e) => (m[e[k] ?? "(none)"] = (m[e[k] ?? "(none)"] || 0) + 1, m), {});
console.log(`indexed ${entries.length} levels -> warehouse/index.json`);
console.log(`  archived (titled): ${entries.filter((e) => e.archived).length}`);
console.log(`  physics:`, by("physics"));
console.log(`  types:`, by("type"));
const designers = new Set(entries.map((e) => e.designer).filter(Boolean));
console.log(`  distinct designers: ${designers.size}`);
