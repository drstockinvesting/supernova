"""Deterministic, independently-seeded random streams.

The dataset is version tracked, so determinism is not a nicety -- it is what makes
`git diff` meaningful. Two properties matter:

1. **Reproducibility.** The same master seed always produces byte-identical output.
2. **Locality.** Each entity's randomness derives from its own ID, so adding one
   student does not reshuffle every other student's data. Without this, changing
   the roster by one produces a thousand-file diff and the git history becomes
   worthless as a record of what actually changed.

Python's `hash()` is deliberately not used -- it is salted per process and would
break reproducibility across runs.
"""

from __future__ import annotations

import hashlib
import random
from typing import Iterable, Sequence, TypeVar

from .config import MASTER_SEED

T = TypeVar("T")


def derive_seed(*parts: str) -> int:
    """Derive a stable 64-bit seed from the master seed plus arbitrary key parts."""
    payload = "\x1f".join((MASTER_SEED, *parts)).encode("utf-8")
    digest = hashlib.sha256(payload).digest()
    return int.from_bytes(digest[:8], "big")


def stable_digits(value: str, width: int) -> str:
    """A reproducible numeric string derived from `value`.

    Used for synthetic external-system IDs. Python's built-in ``hash()`` is salted
    per process, so using it here would silently make every regeneration produce
    a different dataset.
    """
    digest = hashlib.sha256(value.encode("utf-8")).digest()
    number = int.from_bytes(digest[:8], "big") % (10**width)
    return str(number).zfill(width)


def stream(*parts: str) -> random.Random:
    """An independent RNG for one entity and one purpose.

    Call as ``stream(student_id, "attendance", school_year)``. Every distinct
    combination of parts yields an independent, reproducible sequence.
    """
    return random.Random(derive_seed(*parts))


def weighted_choice(rng: random.Random, weights: dict[str, float]) -> str:
    """Draw one key from a {key: weight} mapping."""
    keys = sorted(weights)  # sorted for determinism regardless of dict order
    values = [weights[k] for k in keys]
    return rng.choices(keys, weights=values, k=1)[0]


def sample_without_replacement(
    rng: random.Random, population: Sequence[T], k: int
) -> list[T]:
    """Sample k items, clamped to the population size."""
    k = max(0, min(k, len(population)))
    return rng.sample(list(population), k)


def jitter(rng: random.Random, value: float, spread: float) -> float:
    """Nudge a value by +/- spread, so students sharing an archetype don't look identical."""
    return value + rng.uniform(-spread, spread)


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def chance(rng: random.Random, probability: float) -> bool:
    return rng.random() < probability


def spread_across(
    rng: random.Random, items: Sequence[T], count: int, cluster: bool = False
) -> list[T]:
    """Pick `count` items from an ordered sequence, either scattered or clustered.

    Clustering matters for narrative coherence. A chronic-absenteeism student's
    absences should fall in identifiable runs -- an illness, a family disruption --
    not scatter uniformly across the year. Uniform scatter is what makes synthetic
    data read as synthetic.
    """
    count = max(0, min(count, len(items)))
    if count == 0:
        return []

    if not cluster:
        return sorted(rng.sample(list(items), count), key=lambda x: items.index(x))

    picked: list[int] = []
    remaining = count
    while remaining > 0:
        run_length = min(remaining, rng.randint(2, 5))
        latest_start = len(items) - run_length
        if latest_start <= 0:
            start = 0
            run_length = min(run_length, len(items))
        else:
            start = rng.randint(0, latest_start)
        new_indices = [i for i in range(start, start + run_length) if i not in picked]
        if not new_indices:
            # This window was already fully consumed; fall back to any free slot.
            free = [i for i in range(len(items)) if i not in picked]
            if not free:
                break
            new_indices = [rng.choice(free)]
        picked.extend(new_indices)
        remaining = count - len(picked)

    return [items[i] for i in sorted(set(picked))[:count]]


def stable_shuffle(rng: random.Random, items: Iterable[T]) -> list[T]:
    result = list(items)
    rng.shuffle(result)
    return result
