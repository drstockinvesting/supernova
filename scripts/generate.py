#!/usr/bin/env python3
"""Generate the Supernova synthetic dataset.

    python3 scripts/generate.py

Deterministic: the same master seed produces byte-identical output. After a
regeneration with no generator changes, `git diff` must be empty.
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from generator.emit import DATA_DIR, emit
from generator.pipeline import AS_OF_DATE, generate


def main() -> int:
    start = time.time()

    print("Supernova synthetic data generation")
    print(f"  viewing date: {AS_OF_DATE.isoformat()}")
    print()

    print("  generating...", flush=True)
    dataset = generate()

    print("  writing...", flush=True)
    manifest = emit(dataset)

    elapsed = time.time() - start
    print()
    print(f"  wrote {manifest['approximateBytes'] / 1_000_000:.1f} MB to {DATA_DIR}")
    print(f"  completed in {elapsed:.1f}s")
    print()

    width = max(len(k) for k in manifest["counts"])
    for key, value in manifest["counts"].items():
        print(f"    {key:>{width}}  {value:>8,}")

    print()
    print("  population distribution:")
    for axis in ("tier", "trajectory", "situation"):
        print(f"    {axis}:")
        for key, share in manifest["populationDistribution"][axis].items():
            print(f"      {key:32} {share:6.1%}")

    print()
    print("  next: python3 scripts/validate.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
