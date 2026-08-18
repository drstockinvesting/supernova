# Supernova: The Best and the Brightest

A mastery-based K–12 learning management system prototype. Supernova replaces grades with
evidence-backed mastery mapping, and repeats the same visual language at every zoom level —
from a single lesson to an entire community.

> Supernova reveals and enables the best and brightest in every student, at every level.

See [`docs/supernova-vision.md`](docs/supernova-vision.md) for the full vision.

---

## Current Phase

**Phase 5 — Research Context Layer.** Phases 1 through 4 are complete: the synthetic
dataset, the dashboards described in
[`docs/supernova-ui-ux-design.md`](docs/supernova-ui-ux-design.md) built on top of it,
permissions enforced at the route boundary, and the visual design system.

The interface was built from the inside out — the student profile, then the family view,
then teacher, administrator, and finally the board and community layer. The student profile
is the atom every other view aggregates, so each rollup above it summarises something
already proven. All ten roles land on a built view.

Through Phase 2, permissions **shaped** views without enforcing them: a view rendered only
what the viewer's scope contained, but a typed URL still reached data outside it. Phase 3
closed that. Every route is now decided by the account's real permission set *and* its real
scope, because neither is sufficient alone — a board member holds district scope over every
id in the district and may open nothing but the public page, while a nurse holds named
students at their building and none of the aggregates that building page is made of. A
refused address returns the viewer to their own dashboard with one neutral line, and nothing
about what was on the other side.

Phase 4 made the fractal real. Until then one view had the constellation and everything
above it was cards and tables; now the same picture is drawn at five zoom levels, under one
rule — **a star is the smallest thing this viewer is allowed to see, and its brightness is
the share of mastery demonstrated inside it.** So a star is a standard on a student, a
student's unit on a classroom, a classroom on a building and on the district, and a grade on
the public page. The sky gets coarser as entitlement narrows; it never gets replaced by
something else. Brightness is absolute at every level, never shaded against the neighbouring
stars, because the alternative turns a mastery map into a league table.

The design system renders itself at [`/design`](http://localhost:5173/design) — every swatch
reads the same custom property the app reads, so it breaks when a token drifts.

Track progress and decisions in [`PROGRESS.md`](PROGRESS.md).

---

## Repository Layout

| Path | Contents |
|---|---|
| `docs/` | Source design documents, plus the schema addendum |
| `schema/` | JSON Schema for every record type |
| `generator/` | The synthetic data generator (Python 3, stdlib only) |
| `scripts/` | Entry points — `generate.py`, `validate.py`, `emit_types.py` |
| `data/` | Generated dataset, committed |
| `app/` | The interface — React and TypeScript, built with Vite |

---

## Running the App

Requires Node. `app/public/data` is a symlink to `data/`, so the dev server serves the
generated dataset at `/data/...` without copying it.

```bash
npm --prefix app install
```

```bash
npm --prefix app run dev
```

The app opens on a student account. The control in the top right signs in as any of the
district's 2,101 real accounts, and each one's actual role, scope, and permission list decides
both what renders and what can be reached — a guardian carries `view_attendance_detail` and
`view_evidence_artifacts` but not behaviour or health, so those layers are absent from the
family view rather than empty, and typing another family's child into the address bar returns
them to their own.

Beside it, **Auto / Sky / Paper** switches the theme. Dark is the base — the product's claim
is that mastery is light against dark, so the sky is the default reading surface — and light
is a first-class alternate for print and for a projector in a bright room. The constellation
panel stays dark in both.

TypeScript types are generated from the JSON Schema rather than hand-written, so a generator
change surfaces as a type error instead of as `undefined` at runtime. After any schema change:

```bash
python3 scripts/emit_types.py
```

**macOS and iCloud Drive:** `node_modules` is excluded from sync with an extended attribute,
reapplied by a `postinstall` script. Without it iCloud syncs tens of thousands of package files
and leaves conflict copies — which is not cosmetic. A duplicated `generator/standards/*.json`
silently doubled the standards catalog once already.

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
