# Rubicon — implementation notes

A JavaScript port of Kevan Davis's Rubicon (Processing 1.x applet, v1.27), plus a mirror of
the community level archive. `src/rubicon.java` is the decompiled original and is the
reference for every behavioural question: when in doubt, read it, don't guess.

No build step, no dependencies, no framework. ES modules served as files; the page can sit
at the repo root (which is what makes the Pages URL clean) because assets resolve against
`import.meta.url`, not the page URL.

## Module map

| File | Role |
| --- | --- |
| `web/sim.js` | The simulation. Pure, DOM-free, both physics models. |
| `web/tiles.js` | Tile ids, the ASCII alphabet, cargo helpers |
| `web/level.js` | `.rub` parsing, serialisation, palette/lock rules |
| `web/editor.js` | Selection, fill, copy/cut/paste, pipette, keyboard picking |
| `web/layout.js` | Screen geometry: the original's button boxes and palette grid |
| `web/render.js` | The whole 800×600 screen, HiDPI |
| `web/vlw.js` | Processing `.vlw` bitmap fonts |
| `web/rng.js` | Exact `java.util.Random` reimplementation |
| `web/share.js` | `?level=` encoding, clipboard |
| `web/main.js` | Modes, input, the toolbox actions |
| `web/browse.js` | Level browser: filtering, lazy thumbnails |

## The screen is a replica

The applet is one 800×600 image: a 50×31 grid of 16px tiles (800×496), then `blocks.gif`
blitted at y=500. That blit is the toolbox — the palette slots, LOAD/SAVE, Clear/Stop/Play,
Game/Sandbox, the level display, the QUIT tab are all *in the spritesheet*, and the palette
is the sheet's own 30-column, 17px-pitch sprite grid. So the port draws the sheet and paints
only the overlays the original paints: greyed-out unavailable slots, the white box on the
selected component, button highlights, HUD text.

`web/layout.js` holds those coordinates verbatim from the original's field initialisers.
Note `Box.contains()` treats `w`/`h` as **inclusive** spans, so hit-testing uses `<=`.

Text uses the applet's own Palatino `.vlw` bitmap fonts out of `data/` (`web/vlw.js`), not a
CSS font stack. This is not fussiness: with a substituted serif every string ends up a few
pixels wide of the original, and with the real glyphs the port is a **pixel-for-pixel match
to an applet screenshot** — 0 differing pixels across the whole screen. Two things that
matter when touching `vlw.js`: the files carry no space glyph (they start at `!`), and
`PFont.width()` charges a space the width of an `i`; glyphs are 8-bit coverage tinted with
the current fill colour, so each (glyph, colour) pair is cached as a small canvas.

The renderer scales by **integer factors in device pixels**, deriving the CSS size from the
backing store rather than the other way round, so every source pixel maps to exactly
`zoom × zoom` device pixels and nearest-neighbour sampling never lands on a fractional
boundary. `devicePixelRatio` changes are caught with a re-armed `(resolution: Ndppx)` media
query — the only reliable signal.

## Deliberate quirks — do not "fix"

- `grid()` returns **girder** out of bounds, so the playfield has solid walls.
- The `moved` array is one cell larger than the grid in each direction; rules on the bottom
  row read `moved[x][y+1]` and rely on that slack.
- The `copierup` rule checks `moved[x][y+1]` while writing `moved[x][y-1]`. It looks like a
  typo in the original, but archived levels were designed against it.
- **Both physics models ship.** The November 2006 change made copiers, packers and unpackers
  wait a tick. Levels select the old model with a `* Physics:1` header, and user levels
  *default to v1* — only an explicit `* Physics:2` opts in. Dropping v1 would silently break
  a large share of the archive. The models differ in exactly three places, so `sim.js`
  branches rather than duplicating 290 lines.
- The tile alphabet is **not a bijection** and decoding is first-index-wins: `'T'` is 77/78/79
  (target off/green/red), `'X'` is 28/29/58/59/89. Inverting an id→char map instead would
  load saved targets in the wrong state.
- Painting is suppressed while any key is held (the original's `!keyPressed` guard).
- Arrow-key palette walking is bounded to columns 0–28, leaving column 29 mouse-only.
- Editing respects the level: locked starting cells resist fill, erase and paste, and a paste
  drops any tile the level doesn't make available, so a chunk of another level can't smuggle
  in forbidden components. The pipette obeys the same rule.
- `frameRate(10)` while running, 60 when shift-clicking Play — hence `TICK_MS = 100`.

## Additions to the original

Kept deliberately small, and none of them change the simulation:

- **Ctrl-click** is a pipette (the original had no way to pick up a placed component).
- **Space** runs/stops.
- `SAVE` builds a share link instead of posting to kevan.org; `LOAD` reads the local mirror.
- The applet's modal alerts are a `prompt`/`confirm` plus the status line under the canvas.

## Levels in the URL

kevan.org sends **no `Access-Control-Allow-Origin` header**, so a browser cannot fetch
`rubiload.php` at all; warehouse codes resolve against the local mirror. Two forms:

```
?level=lupebik        seven-letter code -> warehouse/lupebik.rub
?level=eNp1kMFuw...   base64url of zlib-deflated level text (78-374 chars)
```

They can't be confused: a compressed level never deflates to seven lowercase letters.
Compression uses the platform `CompressionStream`, so there's no library to bundle.

## The archive

`tools/fetch_levels.py` probes candidate codes mined from the old forum (codes are seven
letters, consonant/vowel alternating, ~7.3e8 of them — not enumerable). State lives in
`warehouse/_status.tsv`, so a run resumes after an interruption; `tools/index_warehouse.mjs`
rebuilds `warehouse/index.json`, which is the single request the browser page needs.

```sh
tools/fetch_levels.py tools/candidates.txt warehouse   # polite, 0.35s apart, resumable
node tools/index_warehouse.mjs                         # rebuild index.json
```

Worth doing next: the new SMF forum and the Wayback snapshots of the dead
`stardrifter.org/rubisearch/` almost certainly hold codes the old forum doesn't.

## Verification

The risk in porting a cellular automaton is subtle rule-ordering divergence: the scan runs
bottom-to-top and mutates in place, so a flipped loop bound looks fine and desyncs 200 ticks
later. So the port is **diffed against the original Java, tick by tick**.
`tools/Oracle.java` loads a level into the real `rubicon` class and dumps the grid every
tick — it never calls `setup()`, since `physics()` only touches field-initialised arrays, so
it needs no graphics, fonts or applet context.

```sh
node tools/difftest.mjs --ticks 200 data/level*.rub   # base levels
node tools/difftest.mjs --ticks 200 warehouse/*.rub   # the archive
node tools/editor_test.mjs                            # editor unit tests
node tools/ui_probe.mjs                               # UI, in headless Chromium over CDP
```

Last full run (2026-09-06): **all 13 files in `data/` and all 6158 warehouse levels
identical for 200 ticks**, across both physics models, 0 failures, 0 skipped. The archive
sweep takes ~6 minutes at `-P 8`:

```sh
ls warehouse/*.rub | xargs -P 8 -n 40 node tools/difftest.mjs --ticks 200
```

Random cargo is covered because `web/rng.js` reimplements `java.util.Random` exactly and both
sides are seeded identically. Processing computes `(int)(60.0f + random(16.0f))` in
**float32**, and 60 plus a 20-bit fraction needs 26 mantissa bits — the addition genuinely
rounds, so float64 yields different crates. Hence `Math.fround` at each step.

`tools/ui_probe.mjs` serves the repo, drives Chromium over the DevTools protocol and reads
pixels back off the canvas. It needs a real clock: the draw loop is a `requestAnimationFrame`
and `--virtual-time-budget` starves it. Checks poll rather than assuming a frame has landed.
