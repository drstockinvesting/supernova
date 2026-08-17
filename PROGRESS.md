# Supernova — Progress Tracker

Carried across working sessions. Each session appends to the decision log rather than
rewriting it, so the reasoning behind the build stays legible.

---

## Phase Status

| Phase | Status | Session |
|---|---|---|
| **1. Synthetic data generation** | Complete | 2026-08-16 |
| **2. UI / UX build** | In progress — student and family layers built | 2026-08-16 |
| 3. Permissions enforcement | Not started | — |
| 4. Visual design system | Not started | — |
| 5. Research context layer | Not started | — |

---

## Phase 2 Checklist

Built from the inside out — the student profile is the atom every outer view
aggregates, so it comes first and the rollups above it summarise something already
known to be true.

- [x] Stage 0 — Node toolchain, Vite + React + TypeScript app at `app/`
- [x] Stage 1 — types from schema, data client, router, persona switcher, design baseline
- [x] Stage 2 — student layer: mastery constellation, evidence drill-down, context layers
- [x] Stage 3 — guardian layer: own children, narrowed by real guardian permissions
- [ ] Stage 4 — teacher layer (`/section/:id`); needs per-section context rollups
- [ ] Stage 5 — administrator layer (building grid, district)
- [ ] Stage 6 — board and community layer

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

### 2026-08-16 — Session 2 (Phase 2 begins)

**Built from the student outward, not the district inward.** The UI/UX document
details the administrator path most fully, so starting there was the obvious move. We
started at the student profile instead. It is the base of the fractal: a classroom's
mastery rate, a school's attendance, a district trend are all aggregates of it, and
building the rollups first would have meant summarising something unproven. It also
front-loads the hardest design problem — making mastery read as light against dark —
rather than deferring it.

**React + Vite + TypeScript, with Node installed for the purpose.** Phase 1 chose
Python stdlib because no Node was on the machine. For a five-dashboard app with shared
components and drill-down state, hand-rolled DOM would have cost more than the install.
The generator stays untouched: it still emits JSON, and the app reads that JSON over
HTTP exactly as any client would.

**`node_modules` is excluded from iCloud with an extended attribute.** The first
attempt symlinked it outside iCloud Drive; npm replaced the symlink with a real
directory on install, putting 84MB of small files back into sync. The working approach
is `xattr -w "com.apple.fileprovider.ignore#P" 1 node_modules`, reapplied by a
`postinstall` script so a fresh `npm install` cannot undo it.

**TypeScript types are generated from the JSON Schema, not hand-written.**
`scripts/emit_types.py` emits `app/src/types/supernova.ts` from
`schema/supernova.schema.json`. Hand-writing them would have created a second contract
that drifts from the one `validate.py` checks; deriving them means a generator change
surfaces as a type error rather than as `undefined` at runtime.

**Permissions shape views now; they do not enforce yet.** The persona switcher signs
in as any of the 2,101 real accounts, and every view asks the account's own permission
list — a guardian holds `view_attendance_detail` and `view_evidence_artifacts` but not
behaviour or health, so those layers are absent from the family view rather than empty.
A typed URL still reaches a student outside the viewer's scope. `withinScope` in
`app/src/session/roles.ts` is written against real `scopeIds` so Phase 3 closes that in
one place.

**Untaught is not the same as unmastered, and absent is not the same as zero.** Two
distinctions the constellation is built around. A standard whose unit the class has not
reached renders as an outline, not a dark star. And a school year the profile holds no
mastery records for now says so explicitly instead of reporting 0.0% — see the finding
below.

### Phase 1 defects found by building the UI

Three, all of which validation passed over because they were internally consistent:

**Dates ran past the as-of date.** `AS_OF_DATE` (10 Feb 2025) was applied to
attendance, behaviour, mastery, health, and family engagement, but not to benchmark or
screener results, nor to assignment due dates. 426 benchmarks and 97 assignments across
150 sampled profiles were dated after it — `stu-con-0001` carried a Spring Benchmark
dated April 2025. Fixed by filtering after the draw rather than skipping it, so the
random stream is unchanged and prior years stay byte-identical.

**Curriculum unit ids were not unique.** A self-contained elementary section teaches
all six subjects, and the id `unit-{section}-{sequence}` collided across all of them:
72 ids reused, 1,008 unique ids for 1,368 units. Every elementary mastery record's
`curriculumUnitId` therefore resolved to an arbitrary one of six units — the UI showed
PE's unit names under Math. Unit ids for self-contained sections now include the
subject. A uniqueness check was added to `validate.py`; the existing reference check
passed happily on the broken data, because every id did exist.

**586 prior student-years hold attendance but no mastery records.** Sections are built
from a student's *current* school, so a year spent in a different building — a sixth
grader's fifth-grade year — carries attendance and nothing else. 393 students are
affected. The UI now names the gap rather than rendering the summary's 0.0%. Whether
the generator should build prior-year sections at the school matching the grade is an
open question below.

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

Raised during Phase 2:

- **Should prior years at a different building be generated?** 393 students have a
  prior year with attendance but no coursework, because that year was spent at another
  school in the district. The longitudinal constellation — "no evidence of mastery in
  fractions in third grade, currently rebuilding it in fourth" — is one of the design's
  named features, and it cannot be shown for a student who changed buildings. The UI is
  honest about the gap; filling it means generating sections at the school matching each
  prior grade.
- **A student account cannot see its own attendance.** The `student` role carries only
  `view_individual_students` and `view_evidence_artifacts`, so the student view shows
  mastery and evidence but not the attendance record. Deliberate or an oversight in the
  role definition, worth deciding before Phase 3 enforces it.
- The guardian view answers Phase 1's open question about parent-visible behaviour data
  by omitting it entirely, since the guardian role holds no `view_behavior_detail`.
  Worth confirming that is the intended answer rather than the default one.

---

## Notes for the Next Session

Phase 2 continues at **Stage 4, the teacher layer** (`/section/:id`). The route exists
and renders a placeholder.

It needs one generator addition first: `aggregates/current-year.json` carries section
**mastery** only, so a classroom grid would have to load every roster member's profile
to show class attendance, homework, behaviour flags, pacing, and interruption counts.
`generator/aggregates.py` already walks every profile and buckets by section — extend it
and emit `data/aggregates/sections-context.json`.

Running the app:

```bash
npm --prefix app run dev
```

`app/public/data` is a symlink to `data/`, so the dev server serves the dataset at
`/data/...`. It is gitignored — do not commit a second copy of 178MB.

Useful entry points:

- `app/src/views/StudentView.tsx` — the composed student profile; the family view
  reuses it through `StudentProfileScreen` with a narrower audience
- `app/src/views/student/MasteryConstellation.tsx` — the four star states and how
  records are grouped by subject and unit
- `app/src/session/roles.ts` — roles, permissions, `withinScope` (the Phase 3 hook)
- `app/src/data/client.ts` — every dataset read, with the eager/lazy split
- `scripts/emit_types.py` — regenerate TypeScript types after any schema change

Two things that stay true:

1. Records omit fields at their default (absent `metadata` means no quality flags).
   The UI reads defensively rather than assuming every key is present.
2. `masteryRate` is over standards **taught to date**, not the full year.
   `standardsNotYetTaught` is reported separately so the mastery map can render
   untaught content as genuinely dark rather than as failure.
