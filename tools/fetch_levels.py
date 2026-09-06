#!/usr/bin/env python3
"""Fetch Rubicon warehouse levels by candidate ID, politely and resumably.

Level IDs are seven letters, consonant/vowel alternating, so they can't be
enumerated (~7.3e8 space). Instead we mine them from forum text and probe each
candidate against kevan.org's loader. Misses return the literal "NOT FOUND".

Usage:  tools/fetch_levels.py candidates.txt [outdir]

State lives in <outdir>/_status.tsv so the run can be interrupted and resumed;
already-probed IDs are skipped on restart.
"""
import sys, os, time, urllib.request, urllib.error

LOADER = "https://kevan.org/rubicon/rubiload.php?filename="
DELAY = 0.35          # seconds between requests - be kind to a small server
TIMEOUT = 30
UA = "rubicon-archive/1.0 (level preservation; contact via kevan.org/rubicon forum)"


def load_status(path):
    seen = {}
    if os.path.exists(path):
        with open(path) as f:
            for line in f:
                parts = line.rstrip("\n").split("\t")
                if len(parts) >= 2:
                    seen[parts[0]] = parts[1]
    return seen


def fetch(level_id):
    req = urllib.request.Request(LOADER + level_id, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return r.read().decode("latin-1")


def main():
    cand_file = sys.argv[1]
    outdir = sys.argv[2] if len(sys.argv) > 2 else "warehouse"
    os.makedirs(outdir, exist_ok=True)
    status_path = os.path.join(outdir, "_status.tsv")

    candidates = [l.strip() for l in open(cand_file) if l.strip()]
    seen = load_status(status_path)
    todo = [c for c in candidates if c not in seen]

    hits = sum(1 for v in seen.values() if v == "FOUND")
    print(f"{len(candidates)} candidates, {len(seen)} already probed "
          f"({hits} found), {len(todo)} to go", flush=True)

    with open(status_path, "a") as status:
        for i, cid in enumerate(todo, 1):
            try:
                body = fetch(cid)
            except urllib.error.HTTPError as e:
                state = f"HTTP{e.code}"
            except Exception as e:
                # transient: don't record, so a resume retries this ID
                print(f"  [{i}] {cid}: transient error {e!r}, backing off", flush=True)
                time.sleep(5)
                continue
            else:
                if body.startswith("NOT FOUND"):
                    state = "MISS"
                else:
                    state = "FOUND"
                    with open(os.path.join(outdir, cid + ".rub"), "w") as f:
                        f.write(body)
                    hits += 1
                    print(f"  [{i}/{len(todo)}] FOUND {cid} ({hits} total)", flush=True)

            status.write(f"{cid}\t{state}\n")
            status.flush()
            if i % 250 == 0:
                print(f"  ...{i}/{len(todo)} probed, {hits} found", flush=True)
            time.sleep(DELAY)

    print(f"done: {hits} levels in {outdir}/", flush=True)


if __name__ == "__main__":
    main()
