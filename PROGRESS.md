# Supernova — Progress Tracker

Carried across working sessions. Each session appends to the decision log rather than
rewriting it, so the reasoning behind the build stays legible.

---

## Phase Status

| Phase | Status | Session |
|---|---|---|
| **1. Synthetic data generation** | Complete | 2026-08-16 |
| 2. UI / UX build | Not started | — |
| 3. Permissions enforcement | Not started | — |
| 4. Visual design system | Not started | — |
| 5. Research context layer | Not started | — |

---

## Phase 1 Checklist

- [x] Repo initialized, docs organized
- [x] Data structures addendum written
- [x] Standards catalog built (593 real standards, 6 frameworks)
- [x] Generator core (config, rng, calendar, archetypes)
- [x] Organization + curriculum entities
- [x] Seven student data streams
- [x] Longitudinal years + aggregates
- [x] JSON schemas + validation suite
- [x] Full generation passing validation
- [x] Determinism verified (two runs, byte-identical)
- [x] Pushed to GitHub, tagged `v0.1-data`

---

## Decision Log

### 2026-08-16 — Session 1

**Repo lives in iCloud Drive, in place.** Chosen over a local-only repo for convenience.
Accepted risk: `.git` internals sync through iCloud, which can corrupt a repo if two machines
write at once. Mitigation — push to GitHub after every session so the remote is the real
backup; never work the repo from two machines simultaneously.

**Generator is Python 3, stdlib only.** No Node on this machine, and no install step wanted.
Emits JSON, which keeps data generation cleanly decoupled from whatever the UI is built in.
If the UI session wants shared types, TypeScript interfaces can be emitted alongside later.

**District scoped to 3 schools / ~1,100 students / 3 years.** Large enough that district- and
board-level dashboards have something real to aggregate, small enough to regenerate quickly
while iterating.

**Elementary and secondary are modeled differently.** Nova Elementary is self-contained (one
teacher, all six subjects); Meridian and Constellation are departmentalized (six subject
sections per student). This changes what a "classroom card" means at each school and exercises
the fractal architecture against two genuinely different structures instead of one.

**Standards are real, curated.** Authentic codes and text from CCSS, NGSS, C3, NCAS, and SHAPE
America — roughly 8–12 per subject per grade. A domain expert reviewing this as a portfolio
piece would immediately spot invented standards.

**Schema extended via addendum, originals untouched.** The UI/UX doc describes dashboard
elements with no backing record type in `supernova-data-structures.md` — teachers, sections,
curriculum units, interruptions, homework completion, user roles, guardians, the school
calendar, and research citations. These are defined in
`docs/supernova-data-structures-addendum.md` as an additive, reviewable change. The five
original spec documents are not edited.

**Archetypes restructured into three axes** (tier × trajectory × situation) instead of the
flat seven-archetype list. Tier maps directly onto the `evidenceStrength` enum already in the
schema: High Achiever produces substantial evidence across nearly all standards, Typical
produces moderate evidence on most, Underachiever produces insubstantial evidence in many
places and often none at all. Trajectory absorbs "Late Start, Strong Finish" as an
Underachiever who is Rising — the same student moving, rather than a separate kind of student.
Situation drives the non-academic streams and determines *where* gaps localize; tier determines
*how deep* they run. Tier is drawn conditional on situation so implausible pairings (a High
Achiever with severe chronic absenteeism) don't occur.

**Full evidence artifacts for the current year only.** Prior years carry mastery records with
evidence counts plus benchmark and screener results — which is what `PriorAchievementRecord`
specifies, not a shortcut. Keeps the dataset around 60MB rather than several hundred.

### 2026-08-16 — Session 1, later decisions

**High school uses one fixed course per subject per grade.** Algebra I / Geometry /
Algebra II / Pre-Calculus, Biology / Chemistry / Physics / Environmental Science, and
so on. Real high schools branch into pathways, but branching would make "which grade
is strongest in mathematics" unanswerable, and both the administrator and board
dashboards depend on that comparison.

**Grade-banded frameworks are split across their grades.** CCSS ELA (9-10, 11-12),
NGSS middle and high, C3, NCAS, and SHAPE all publish in bands rather than by grade.
Assigning a whole band to both its grades would leave every 10th and 12th grader with
a pre-mastered standard set, because mastery is permanent. Each band is split by
strand or domain instead.

**The dataset is viewed as of 10 February 2025, not end of year.** Everything stops
there: no evidence, attendance, or incidents are dated later. Units not yet reached
are recorded as tracked-but-unevidenced; the in-progress unit accumulates evidence
and mastery scaled by how far through it actually is. Mastery rates are computed over
standards *taught to date* — counting untaught fourth-quarter content against a
student makes every mid-year rate meaninglessly low and identical across students.

**Attendance stores exceptions only.** A year is ~180 rows, 90% of them "present".
The default is recoverable from the school calendar, and absence dates aligned to the
instructional timeline is what the UI actually needs.

**Evidence artifacts live in a companion file per student.** They are roughly three
quarters of a student's data but are only needed when drilling into a specific
standard. Splitting them keeps the profile loadable on its own.

**Mastery penalties are multiplicative, not subtractive.** Found by hand-inspecting a
generated student: subtracting flat penalties drove an underachieving chronic absentee
to zero mastery across all 41 standards. That is neither believable nor useful — the
guidelines call for "early signs of mastery catching up", and a student pinned at zero
shows none.

**Research citations all carry `needs_human_review`.** The claims are stated
correlationally with explicit confidence notes. None should appear in a
stakeholder-facing view until someone verifies the source says what the claim says.

---

## Phase 1 Results

- **593 standards** across CCSS Math, CCSS ELA, NGSS, C3, NCAS, and SHAPE America
- **1,102 students**, 86 staff, 1,271 guardians, 2,101 user accounts
- **252 sections**, 1,368 curriculum units, 252 interruption records
- **112,325 mastery records**, 99,402 evidence artifacts across three school years
- **178 MB** total; profiles average 98 KB with a 62 KB evidence companion
- Generation runs in about 5 seconds; validation passes with zero errors
- Determinism verified: two consecutive runs produce byte-identical output

Measured correlations (see `data/validation-report.md`):

| Check | Result |
|---|---|
| Absence-to-mastery | 25.8% → 16.7% → 11.7% → 5.1% mastery as unit absences rise |
| Behavioral localization | focus subject 21.6 pts below the student's own other subjects |
| Rising trajectory | back-half engagement 28.2 pts above front-half |
| Transfer honesty | 73 of 73 flagged, 0 given an invented full history |

---

## Open Questions

Carried forward from `docs/lms-vision-document.md` and not resolved in Phase 1:

- How does mastery mapping integrate with standardized testing requirements?
- What behavioral data should be visible to parents? (sensitivity balance)
- What role does student self-assessment play in validating mastery?
- How does the system handle skill prerequisites and interdependencies?
- What research sources are authoritative for the context layer? *(Phase 1 seeds a starter
  citation library; it needs review before it appears in any stakeholder-facing view.)*

Raised during Phase 1:

- Should mastery "re-demonstration" be surfaced in the UI as a distinct visual state, or is it
  invisible detail? The data supports either.
- Community dashboard shows aggregates only — but with three schools, a single-school
  aggregate may still be small enough to be identifying at the extremes. Worth a threshold
  rule in Phase 3.

---

## Notes for the Next Session

Phase 2 (UI/UX) should start by reading `docs/supernova-data-structures-addendum.md`
alongside the original data structures doc, then `data/manifest.json` for what actually
exists. Every UI element named in the addendum's gap table has data behind it.

Useful entry points:

- `data/aggregates/current-year.json` — precomputed rollups for every zoom level, with
  a `suppressForPublicDisplay` flag already computed per cell
- `data/district/sections.json` + `curriculum-units.json` — everything the
  administrator classroom card needs, including pacing and interruption counts
- `data/students/{schoolId}/{studentId}.json` — one student's full longitudinal
  profile; evidence artifacts are in the `.evidence.json` companion
- `schema/supernova.schema.json` — all 20 record types, verified against real output

Two things Phase 2 will need to decide:

1. Records omit fields at their default (absent `metadata` means no quality flags).
   The UI should read defensively rather than assuming every key is present.
2. `masteryRate` is over standards **taught to date**, not the full year.
   `standardsNotYetTaught` is reported separately so the mastery map can render
   untaught content as genuinely dark rather than as failure.
