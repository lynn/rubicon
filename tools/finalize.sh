#!/usr/bin/env bash
# Wait for the warehouse scrape to finish, then build an index of the archive
# and run the full differential test over every level we hold.
set -uo pipefail
cd "$(dirname "$0")/.."

# The bracket keeps this pattern from matching this script's own command line.
while pgrep -f "[f]etch_levels.py" > /dev/null; do sleep 20; done
echo "scrape finished: $(ls warehouse/*.rub | wc -l) levels"

node tools/index_warehouse.mjs
echo "--- full differential test ---"
node tools/difftest.mjs --ticks 200 data/level*.rub warehouse/*.rub
