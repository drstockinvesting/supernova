# Supernova: The Best and the Brightest

A mastery-based K–12 learning management system prototype. Supernova replaces grades with
evidence-backed mastery mapping, and repeats the same visual language at every zoom level —
from a single lesson to an entire community.

> Supernova reveals and enables the best and brightest in every student, at every level.

See [`docs/supernova-vision.md`](docs/supernova-vision.md) for the full vision.

---

## Current Phase

**Phase 1 — Synthetic Data Generation.** No UI exists yet, by design. The dashboards described
in [`docs/supernova-ui-ux-design.md`](docs/supernova-ui-ux-design.md) depend on data that tells a
believable story; independently randomized fields would leave every correlation and narrative
feature with nothing real to surface. So the data comes first.

Track progress and decisions in [`PROGRESS.md`](PROGRESS.md).

---

## Repository Layout

| Path | Contents |
|---|---|
| `docs/` | Source design documents, plus the schema addendum |
| `schema/` | JSON Schema for every record type |
| `generator/` | The synthetic data generator (Python 3, stdlib only) |
| `scripts/` | Entry points — `generate.py`, `validate.py` |
| `data/` | Generated dataset, committed |

---

## Regenerating the Dataset

Requires Python 3.9+. No dependencies to install.

```bash
python3 scripts/generate.py
```

```bash
python3 scripts/validate.py
```

Generation is **deterministic**: the same master seed always produces byte-identical output.
After regenerating, `git diff` should be empty unless the generator itself changed. If it isn't,
seeding is broken — see `generator/rng.py`.

The master seed and all district-shape knobs live in [`generator/config.py`](generator/config.py).

---

## The Dataset

Constellation Area School District — three schools, ~1,100 students, three school years
(2022–2023 through 2024–2025).

| School | Grades | Model |
|---|---|---|
| Nova Elementary | K–5 | Self-contained — one teacher, all subjects |
| Meridian Middle | 6–8 | Departmentalized |
| Constellation High | 9–12 | Departmentalized |

Every student is seeded on three axes before any field-level data is generated, then all seven
data streams are generated *from* that seed so they stay mutually consistent:

- **Achievement tier** — High Achiever / Typical / Underachiever, mapped onto the `evidenceStrength`
  thresholds (6+ artifacts substantial, 3–5 moderate, 1–2 insubstantial)
- **Trajectory** — Steady / Rising / Dipping, across marking periods
- **Situation** — IEP, chronic absenteeism recovery, behavioral cluster, family engagement gap,
  transfer, health factor, or none

Tier is drawn *conditional* on situation, so the dataset never produces a combination a teacher
wouldn't recognize. The method is described in
[`docs/supernova-data-generation-guidelines.md`](docs/supernova-data-generation-guidelines.md).

`data/validation-report.md` is the artifact demonstrating the dataset is narratively coherent,
not merely well-formed.

---

## A Note on the Data

Every student in this repository is synthetic. No real student record, name, or artifact appears
anywhere in the dataset.
