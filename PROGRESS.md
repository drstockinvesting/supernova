# Supernova — Progress Tracker

Carried across working sessions. Each session appends to the decision log rather than
rewriting it, so the reasoning behind the build stays legible.

---

## Phase Status

| Phase | Status | Session |
|---|---|---|
| **1. Synthetic data generation** | Complete | 2026-08-16 |
| **2. UI / UX build** | Complete — student through board and community | 2026-08-17 |
| **3. Permissions enforcement** | Complete — enforced at the route boundary | 2026-08-17 |
| **4. Visual design system** | Complete — one constellation at every zoom level | 2026-08-17 |
| **5. Research context layer** | Complete — the library is a checked contract | 2026-08-17 |
| **6. The caseload view** | Complete — three roles have a home | 2026-08-18 |
| **7. The research review** | Sources checked, 16 claims revised — nothing signed off | 2026-08-18 |

---

## Phase 7 Checklist

- [x] Every one of the 18 sources fetched and checked against the claim it backs
- [x] Findings written up claim by claim — `docs/supernova-research-review.md`
- [x] A source check and a sign-off separated, because only the second can verify
- [x] `reviewStatus` retired; a review now carries a checker, a date, and findings
- [x] `review.status` derived from the two records, never written by hand
- [x] A claim added without a review record reports `unreviewed`, not as clean
- [x] The finding shown next to the claim at `/research`, and on the flag a teacher hovers
- [x] The type emitter dropped `| null`; found by the schema's first nullable object
- [x] All 16 claims revised: 13 by correcting the record, 3 by resourcing or restating
- [x] `publicationYear` optional, `accessedDate` added — a living page has no year
- [x] A check records the sentence it checked; rewording a claim retires the verdict
- [x] 9 new tests, 98 total; build clean, lint at the recorded baseline of 11
- [ ] **Nothing is verified.** All 18 are checked and sourced; none is signed

---

## Phase 6 Checklist

- [x] Caseload index emitted per building — `aggregates/caseload/{schoolId}.json`, generator side
- [x] A stream is a permission, not a role — four streams, and no role check anywhere in the view
- [x] `/caseload/:schoolId` decided by the *opposite* permission pair to `/school/:schoolId`
- [x] Nurse, counselor, and special education teacher all land on a page built for them
- [x] The special education teacher had no dashboard at all, and nothing said so
- [x] A star is a student here — the zoom level the fractal was missing, brightness unchanged
- [x] Thresholds named in one place and printed on the page, with the same admission `/research` makes
- [x] 27 new tests, 89 total; build clean, lint at the recorded baseline of 11

---

## Phase 5 Checklist

- [x] Measured first — the firing matrix across ten roles and 1,102 students, before edits
- [x] Metric vocabulary declared with scale — `ui/research.ts`, plain TypeScript
- [x] `between` implemented, half-open, the comparator the addendum specified in Phase 1
- [x] Count and rate triggers separated; aggregate claims keyed to rates that travel
- [x] Library grown 12 → 18; every one of the ten roles now tagged
- [x] Views supply metrics through builders, not by hand at six call sites
- [x] Student bag gated by permission — the research layer was a second path to the record
- [x] Three coverage states given three shapes; silence no longer means three things
- [x] Library audit at `/research`, outside the guard, with a measured coverage table
- [x] 21 research tests including the library-to-app contract; 62 total, build and lint clean

---

## Phase 4 Checklist

- [x] Dark-first tokens — `ui/theme.css`, one light block, resolved in JS not CSS
- [x] Brand mark and theme control; no flash before first paint
- [x] Scale-agnostic constellation — `ui/Constellation.tsx`, vocabulary in `ui/stars.ts`
- [x] Star models as pure functions — `views/constellations.ts`
- [x] Constellations at classroom, building, district, and public
- [x] Continuous absolute brightness for aggregates; four named steps kept for evidence
- [x] The three enforcement states designed: redirect notice, `UnlitSky`, rules-with-state
- [x] Living style guide at `/design`, outside the guard
- [x] 10 constellation tests; 41 total, build clean, lint below its recorded baseline

---

## Phase 3 Checklist

- [x] Access model as pure functions — `app/src/session/access.ts`, no React, no fetch
- [x] Scope expansion against the data — `app/src/session/scope.ts`, viewer's scope only
- [x] Every route wrapped at one boundary — `app/src/session/Guard.tsx`
- [x] Refusal returns the viewer home with one neutral line, never a wall
- [x] Board / public asymmetry resolved: the board's limit is individuals, not buildings
- [x] Student role granted `view_attendance_detail` over its own record; dataset regenerated
- [x] Building page gated internally on `view_aggregate_mastery` (the nurse case)
- [x] 19 access tests across all ten roles; 31 tests total, build and lint clean

---

## Phase 2 Checklist

Built from the inside out — the student profile is the atom every outer view
aggregates, so it comes first and the rollups above it summarise something already
known to be true.

- [x] Stage 0 — Node toolchain, Vite + React + TypeScript app at `app/`
- [x] Stage 1 — types from schema, data client, router, persona switcher, design baseline
- [x] Stage 2 — student layer: mastery constellation, evidence drill-down, context layers
- [x] Stage 3 — guardian layer: own children, narrowed by real guardian permissions
- [x] Stage 4 — teacher layer: section index (`/teacher`) and classroom drill-down (`/section/:id`)
- [x] Stage 5 — administrator layer: building (`/school/:id`) and district (`/district`)
- [x] Stage 6 — board and community layer (`/community`), two audiences, one route

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

### 2026-08-16 — Session 3 (Phase 2, Stage 4)

**The repo has moved out of iCloud Drive to `~/Desktop/Supernova`.** Session 1 accepted
the sync risk on `.git` internals for convenience; that is now retired rather than
mitigated. Verified after the move: the working tree is clean, `origin` is reachable and
both branches match their remote refs, `app/public/data → ../../data` is a *relative*
symlink and still resolves, and no `.icloud` placeholder stubs or broken links remain.
Two artifacts of the old arrangement were cleaned up — an empty `constellation-high 2/`
sync-conflict directory under `data/students/`, and the `postinstall` xattr script in
`app/package.json` that existed only to keep `node_modules` out of iCloud sync.

**A teacher lands on an index of their own sections, not on one of them.** 36 teachers
hold four sections and 18 hold five. `homePathFor` returned `scopeIds[0]`, which silently
dropped the rest of the job. `/teacher` lists all of them as classroom cards, and
`ClassroomCard` takes a `SectionContext` and nothing about who is looking at it — the
building administrator's grid in Stage 5 iterates the same component over the same file.

**Section context is precomputed, and split the way profiles are.** The classroom view
needs attendance, homework, behaviour, pacing, and interruptions per section;
`aggregates/current-year.json` carries section mastery only. Computing the rest in the
browser would mean fetching every roster member's profile — about 2MB per section, and
Stage 5 multiplies that by twenty sections per building page. `build_sections_context`
emits it at generation time.

The first cut put everything in one file and came out at 2.4MB, too heavy to load
eagerly. It now splits exactly as profiles and evidence do: `sections-context.json` is
a 615KB index any classroom-grid view loads once, and `aggregates/sections/{id}.json`
carries one section's roster and full unit list, fetched only when that classroom opens
(~35KB). Rosters are the bulk of it and are duplicated across a secondary student's six
sections, so keeping them out of the index is what keeps the index small.

**The classroom view is scoped to a unit, because the correlation is.**
`keyInstructionDates` are per-unit, so "three students missed the day this unit opened"
only resolves inside a unit window. A departmentalized section opens on the unit it is
teaching. A self-contained elementary section is teaching six at once — one per subject —
so it opens on the year to date instead and offers the units grouped by subject. Naming
one of six as "the current unit" would have been arbitrary.

**Three things the view says out loud, because the data does not support the alternative:**

- *Attendance is a school-day record, not a period one.* For a departmentalized section,
  the class attendance rate is the roster's whole-day attendance; a student marked present
  may still have missed that period. The SIS has no period-level record and inventing one
  would be worse than naming the limit.
- *Behaviour cannot always be attributed to a class.* Incidents carry a nullable `subject`.
  A self-contained section is the student's whole day so every incident belongs to it; a
  departmentalized section claims only incidents naming its own subject, and the remainder
  are reported as unattributable rather than assigned by guesswork. This is not rare — the
  Art II section sampled during the build has 27 roster incidents and none attributable.
- *A roster place with no participation record is absent, not zero.* The same distinction
  the student view already draws for a school year holding no mastery records.

**The analytics summary is composed, not templated.** `views/section/narrative.ts` is a
pure function over the section's real numbers, so the reasoning is readable against the
data it describes. It states only factors that are present: a class with no interruptions
and nobody absent through key instruction gets a shorter paragraph, not a sentence with
zeroes in it. A dashboard that always finds something to blame teaches its reader to stop
believing it.

**Defect found by building the UI: a teacher teaches five classes at once.**
`generator/entities/organization.py:460` sets a departmentalized section's period to
`str((SUBJECTS.index(subject) % 7) + 1)` — a function of subject alone. Every Math section
is period 1, every ELA section period 2. So all of a teacher's sections share one period:
234 of 252 sections are in a teacher/period collision, and Jeremiah Duarte's five cards on
`/teacher` all read "period 1". Invisible until five sections were put side by side.

Not fixed here, because the correct fix is a two-sided constraint rather than a one-line
change: no teacher may hold two sections in one period, *and* each student's six subject
sections must land in six distinct periods. The current formula satisfies the second by
construction, which is why the first was never noticed. Assigning periods in a post-pass
would keep the RNG stream untouched and the rest of the dataset byte-identical; section
names would change, since they embed the period. Tracked separately.

**Validation now checks that both files agree.** Two places state a section's mastery —
`current-year.json` for the district rollup and `sections-context.json` for the classroom
view. `validate_sections_context` checks that they match, that every roster row is a
student the section actually enrolls, and that unit totals sum to the section. A teacher
and their principal reading different numbers for the same class is worse than either
being wrong alone. All 252 sections reconcile exactly.

### 2026-08-17 — Session 4 (Phase 2, Stage 5)

**No generator change was needed.** The first stage where that was true. Everything the
building and district views ask for was already emitted — `aggregates/current-year.json`
carries the grade, school, and district rollups, and `sections-context.json` carries every
section a building contains. Stage 4's `ClassroomCard` was written to take a
`SectionContext` and nothing about the viewer, so the building's classroom grid is that
component over a filtered list. A principal and a teacher looking at the same class see
the same card, which was the point of the fractal architecture rather than a convenience.

**The district view leads with where the variation is, not with a building ranking.**
The three buildings sit within 1.1 points of each other on mastery (sd 0.48). Grades span
10.3 (sd 2.84) and classrooms span 34.7 (sd 6.11). A district dashboard that ranks three
buildings a point apart is reading noise and inviting action on it, so the view states the
three spreads and sends the reader inward instead. `views/admin/compare.ts` holds the
computation as a pure function, because that paragraph is an argument rather than a layout.

**The teacher comparison says what it is.** The UI/UX document asks for comparison across
teachers within a building, and the building view provides it — ranked, with an attendance
column beside it and the building rate marked on every bar. It carries an explicit caveat
that it ranks classes rather than teaching: rosters are not equivalent, and a low row is a
place to open the classroom and read its context layers. Building the ranking without
that sentence would have been the easier and worse choice.

**A section is not the same unit of thing at both levels.** Nova Elementary has 18
sections and Constellation High has 144, and printing those side by side invites a
comparison that means nothing — an elementary section is one teacher and a child's whole
day, a high school section is one subject for one period. The building cards say
"self-contained classes" or "subject sections" accordingly.

**No year-over-year trend is shown, and the district view says why.** The document asks
for trend indicators at both levels. Rollups are computed for the current year only, and
prior years are held per student rather than per building — a student now at Meridian may
have spent last year at Nova. Aggregating those would compare a cohort against itself
rather than a building against itself. Labelling that "improving" would be inventing a
finding, so nothing is labelled at all.

**Two defects found in this stage, both fixed:** the views render from two files of very
different sizes, and the section index arrives about four times later than the aggregates.
The building view briefly showed a ranked teacher table with no rows under a heading
promising staff, and the district narrative briefly claimed classrooms span 0.0 points.
Both now wait for the data the claim depends on. A loading state that asserts something
false is worse than a spinner.

**Shared where the third use appeared.** `ui/ComparisonTable.tsx` was extracted when
ranked-rows-with-bars was needed for a fourth time (student subjects, section subjects,
grades, teachers). The classroom breadcrumb became role-aware in the same pass: a
classroom is reached from three directions now, and the trail has to lead back where the
viewer actually came from.

### 2026-08-17 — Session 5 (Phase 2, Stage 6) — Phase 2 complete

**The only layer built by subtraction.** No generator change and no new rollup: every
number on `/community` was already in `aggregates/current-year.json` and had already been
rendered one layer in with names attached. The stage's whole content is what must *not*
appear, so the rules live in `views/community/disclosure.ts` as pure functions rather than
as conditions inside JSX. A disclosure rule that cannot be read on its own cannot be
reviewed, and this is the one part of the app whose correctness a reader cannot check by
looking at the page.

**A grade level names a school, so the board view cannot show one.** This is the finding
the stage turned on. Nova teaches K–5, Meridian 6–8, Constellation 9–12 — all 13 grade
levels sit in exactly one building, so "Grade 7 mastery is 39.1%" *is* Meridian's figure
whether or not Meridian is named. The addendum gives a board member aggregates with no
school identifiers; a grade breakdown would defeat that through the back door. The board
view therefore stops at district totals, the subject breakdown, and the evidence mix, and
says in place of the grade table exactly why the grade table is absent.

The check is computed from the data (`gradeDimensionNamesBuildings`), not written into the
page. Whether a grade label identifies a building is a property of how a district is
organised, not a fact about grades — in a district with two K–5 buildings the breakdown is
publishable, and the view would show it.

**Suppressing one cell out of a published total hides nothing.** `PUBLIC_SUPPRESSION_THRESHOLD`
was the flag Stage 6 was supposed to start honouring, and honouring it literally would have
been wrong. If the district publishes its own figure and twelve of thirteen grades, the
thirteenth is arithmetic. `discloseCells` applies the generator's flag and then applies
complementary suppression: a lone primary suppression against a published total takes the
next-smallest cell with it. Standard practice in education reporting, and absent from the
generator's flag, which is per-cell and cannot see the group.

**On this dataset none of it fires, which is why it is tested rather than eyeballed.**
The smallest grade cell holds 59 students against a threshold of 10 — nearly six times
over — so nothing is suppressed and the screen looks identical whether the rule works or
not. That is the condition under which a rule quietly rots, so
`views/community/disclosure.test.ts` exercises it against districts the generator does not
produce. Ten cases, `node --test` plus Node's own type stripping, no new dependency;
tests are their own TS project (`tsconfig.test.json`) so Node's globals stay out of the
browser app. `npm --prefix app test`.

The public view states the negative result rather than hiding it: "No grade level is
withheld. The suppression rule applies below 10 students, and the smallest grade in the
district holds 59." A reader cannot otherwise distinguish a rule that found nothing from
a rule that is not running.

**The community view has no links at all.** Verified in the browser: zero anchors inside
`<main>`. A community member has no scope on a building's classrooms, teachers, or
students, and the addendum's rule is that boundaries are invisible rather than blocked —
so the school card is where the view ends, and it ends without announcing it. This is a
subtraction the earlier layers did not have to make, since every one of them had somewhere
legitimate to send the reader.

**The evidence mix is on the page because a governance audience is the right one for it.**
`evidenceStrengthCounts` sits on every aggregate and no view had read it. Of 40,331
standards taught so far, 10.4% rest on substantial evidence and 30.0% carry no recorded
artifact at all. A mastery rate is a count of judgements; a board asked to act on 39.4%
should see what those judgements rest on. The board's framing says so plainly — where
evidence is thin the rate measures recording practice as much as learning.

**Two defects fixed in passing.** The board view's own explanation of the no-school-
identifiers rule named all three schools; an explanation that breaks the rule it is
explaining is worse than none, and the sentence works without them. And
`ComparisonTable`'s benchmark caption lowercased its label, which was harmless while every
caller passed "the district rate" and produced "the district rate in ela" the moment a
subject appeared in it. Removed — every caller already writes a label that reads
mid-sentence.

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

### 2026-08-17 — Session 6 (Phase 3) — permissions enforcement

**Enforcement is a permission set and a scope, and both have to agree.** Phase 2 left
`withinScope` in `roles.ts` as the hook Phase 3 would call. Phase 3 deleted it instead.
It matched a candidate id against `scopeIds` by `scopeType`, which cannot answer the
question the boundary actually asks: a teacher's scope is *sections*, so "is this
student mine?" is a question about rosters, and a synchronous predicate over `scopeIds`
can only answer it by declaring every student out of scope — locking 72 teachers out of
their own classes. The model that replaced it resolves an account's scope into concrete
ids (`session/scope.ts`) and decides against them (`session/access.ts`), and it checks
permissions as well as scope because the district issues counterexamples to each on its
own. A board member holds district scope — every id in the district is inside it — and
only `view_aggregate_mastery`. A nurse is the mirror image: named students, attendance,
and health at their building, and no aggregate at all. A role comparison gets both wrong.

**Scope is expanded from the viewer, never from the record.** A teacher's student list
is built by fetching their own four or five rosters, not by reading the requested
student's profile to see who teaches them. Reading the record to decide whether the
record may be read is how an authorization check quietly becomes no check; it also
fetches the protected file before deciding. Building and district accounts expand to
nothing at all — a district scope is a flag, and a building scope is answered by
comparing the target's own `schoolId` against three.

**A refused address returns the viewer home with one line.** The addendum's integrity
rule says boundaries are invisible rather than blocked, which is written about links,
and it still holds — no view offers one out of scope. It says nothing about a typed
address, and there silence is the wrong answer: a redirect with nothing said is
indistinguishable from a broken link, in an app whose whole voice is that absent is not
the same as zero. So: back to their own dashboard, one neutral sentence, and nothing
about the other side. An unknown id and an out-of-scope id are refused identically, so
the boundary cannot be used to enumerate the district. The addendum records both the
clarification and the two-part rule above.

**The guard failed open across an account switch, and that is the defect worth
remembering.** The first implementation resolved scope and target in two `useAsync`
hooks and decided from whatever they held. An async value in state survives one render
past the change that invalidated it, so switching accounts rendered the *new* session
against the *previous* account's scope — which showed up as a teacher being refused
their own student, and would have shown up as a guardian briefly seeing a student
profile inherited from a district administrator's scope. Both halves of the check are
now resolved together under one key, and a result stamped with a different key is
discarded rather than used. Verified in the browser by switching from a district
administrator viewing a Nova student to a guardian: it lands on `/family`, showing only
their own child.

**The board's row meant "aggregates, not individuals".** Stage 6's literal reading —
no school identifiers — put an elected body behind an anonymous visitor, which was
recorded as the highest-value open question and is now closed in that direction. Both
audiences read the same figures. What the board gets instead is the *method*: the
suppression threshold, the complementary rule, what the grade dimension reveals, and
the fact that none of that machinery has ever fired on this district. A body governing
by these numbers is owed how they were made. The two functions Stage 6 wrote to detect
re-identification through the grade dimension are still called — they now explain a
published breakdown rather than justify a withheld one.

**A student can see their own attendance.** `view_attendance_detail` at student scope
is the right to read one's own record, which the guardian already held. Regenerating
changed `users.json` and the manifest's byte total and nothing else, which is the
determinism guarantee doing its job.

**Enforcement exposed a role with no view of its own job.** A nurse is scoped to a
building and holds no `view_aggregate_mastery` — and the building page is aggregates
end to end. Refusing the route would leave the role with nowhere to land, so the page
now renders the building header and says what is absent and why. What it cannot do is
give a nurse the thing they actually hold: named students with attendance and health at
their school, which no view in the app indexes. That is an honest gap, recorded below.

### 2026-08-17 — Session 7 (Phase 4) — the visual design system

**The fractal was a claim, not a feature.** The vision document opens by promising one
visual language at every zoom level, and through Phase 3 exactly one view had it: the
student profile. Everything above was cards and ranked tables that happened to share a
palette. Phase 4's central piece is `ui/Constellation.tsx` — the same picture with the
student taken out of it — plus `views/constellations.ts`, which decides what a star *is*
at each level. The rule it applies:

> A star is the smallest thing this viewer is allowed to see at this level, and its
> brightness is the share of mastery demonstrated inside it.

Which gives one star per standard on a student, per student-in-a-unit on a classroom,
per classroom on a building and on the district, and per grade on the public page. The
sky gets coarser as entitlement narrows, which is the honest version of "permission
boundaries are invisible": the picture is always whole, it is just made of larger pieces.

**Dark is the ground, not a preference.** `theme.css` was inverted so `:root` carries
the dark palette and light is the override. The product's argument is that mastery is
light against dark; a light-by-default app makes the constellation a decorated panel
rather than the thing the interface is about. Light stays first-class for the two places
a school actually needs it — paper, and a projector in a bright room — and the
constellation panel stays dark in both, because the sky does not become paper when the
chrome does. `--lit-ink` carries the lit gold darkened enough to survive on white, for
the one place a lit colour lands on the chrome: the mark.

**There is one light block, because two would have drifted.** The first version had the
light palette twice — once under `prefers-color-scheme`, once under `[data-theme]` — and
the file's own comment warned that a token added to one and forgotten in the other is a
bug. Rather than trust the warning, `ThemeToggle` now resolves "follow this device" to a
concrete value in JS and always stamps the attribute, so the media query is consulted in
exactly one place and the stylesheet needs one rule. An inline script in `index.html`
does the same resolution before first paint, so a light-preferring reader never sees a
dark frame.

**The banded ramp could not describe an aggregate, and the data proved it.** The first
aggregate encoding reused the four evidence steps with `masteryTone`'s thresholds. Then
the numbers: every grade-by-subject cell in this district falls between 30.3% and 49.6%,
sd 3.7 — the entire 78-cell matrix inside a single band. The public sky rendered 78
identical stars and would have rendered 78 identical stars whatever the data said. So
aggregates now take a continuous `intensity` from 0 to 1, mixed in oklab so equal steps
of the number are roughly equal steps to the eye. Evidence strength keeps its four named
steps, because that quantity genuinely has four values.

**The ramp is absolute, and that is the load-bearing decision.** Shading each sky against
its own spread would have made the variation pop — and would have turned a district that
is genuinely even into a league table, which is the exact reading the district view spends
a paragraph arguing against. A star lit at 40% is the same brightness alone and among
brighter company, and there is a test that says so. The cost is a mid-February district
that looks uniformly mid-lit. That is what it is.

**The classroom sky is the student profile transposed.** On a student the grid runs
standards across one learner; on a classroom it runs learners across one unit. The roster
is sorted once and reused for every cluster, so a student holds the same position in every
unit's field and reading across the units follows one child through the year. That
property is a single sort call in the right place, invisible in a screenshot, and tested.

**The three states enforcement created got their own shapes.** The redirect notice was a
generic `Notice` in the page flow, which made it the same object as "no year-over-year
trend is shown" — a remark about the page, when it is the system answering something the
viewer just did. It now sits tight under the header and arrives with a short movement,
the only cue separating "this just happened" from "this was always here". The nurse's
building page became `UnlitSky`: the constellation frame, kept intact and dark. A page
that drops the panel and prints a paragraph says there is nothing here; the frame left
standing says there is something here and it is not yours, which is the true statement
and one the product's grammar already had a word for. The board's disclosure panel became
a list of rules that each carry their state — enforced, or in force and never fired —
because a protection that has never run has been reasoned about, not proven, and a body
governing under it is owed that distinction.

**`/design` is outside the guard, deliberately.** It holds no district data, only the
language the data is drawn in. Every swatch reads the same custom property the app reads
and every star is the real component, so a renamed token breaks the page in the same
commit rather than being discovered on a student profile months later.

### Defects found while building Phase 4

- **Both filter rows rendered as a centred vertical column.** The grade filter on the
  building page and the subject filter on the community page were written as
  `row unit-switch`, borrowing the unit selector's button styling — but `.unit-switch`
  sets `flex-direction: column` for its own stack of subject rows, and app.css loads
  after theme.css, so it won silently. Both now use `.filter-row`.
- **A full-viewport fixed layer to draw one gradient.** The page wash was a
  `position: fixed` pseudo-element on `body`, which promoted a compositing layer over the
  whole app and cost a `z-index` on `#root` to climb back out from under. It is a
  fixed-attachment background on the body now.
- **`export *` from a component module.** Re-exporting the star vocabulary through
  `Constellation.tsx` was convenient and broke Fast Refresh in a way the linter could not
  reason about at all. Views import the picture from `Constellation` and the words for it
  from `stars.ts`. The vocabulary lives in a plain `.ts` file for a second reason: Node's
  test runner strips types but does not transform JSX, so nothing a test touches can live
  in a `.tsx`.
- **The page title was `app`.** Vite's default, never changed.

---

### 2026-08-17 — Session 8 (Phase 5) — the research context layer

**The phase began by measuring the thing it was meant to extend, and the measurement
changed the work.** The brief carried forward from Stage 6 was that the citation library
was admin-shaped and needed public-facing claims. That was true and it was the smaller
half. Counted against the shipped dataset:

| | Before |
|---|---|
| Roles with no claim tagged at all | 4 of 10 — student, sped teacher, counselor, nurse |
| A student's own page | 0 claims, on 1,102 of 1,102 students |
| A community member | 0, on every page, always |
| A school board member | 1 |
| Claims that could never fire anywhere | 6 of 12 |
| Guardian or teacher on a student | nothing on 52.5% of students |

The last row of that table is the one that reframed the phase. Six citations named a metric
no view ever supplied — `totalMinutesLost`, `hasActiveIEP`, `priorYearMasteryRate`,
`missedKeyInstructionDays`, `suspensionCount`, `evidenceCount`. They were spelled correctly,
they meant something real, they had been written in Phase 1 and reviewed in prose twice
since, and they were dead. The matching was a string lookup against a bag assembled by hand
at six call sites, which makes a typo and an unimplemented metric the same event, and makes
neither of them visible in a build, in a test, or on a screen.

**So the vocabulary is now the contract.** `METRICS` in `ui/research.ts` declares every
metric the layer knows. A citation may only trigger on a name in it; a view may only supply
names in it, through `groupMetrics` and `studentMetrics` rather than an object literal; and
the test suite asserts both directions, including that each metric is actually produced by a
builder at the scale its claims need. Adding a citation with a new metric now means adding
the metric first, and forgetting to wire it up fails `npm test` rather than rendering
nothing forever.

**A trigger has to survive a change of scale, and that is the load-bearing decision.** The
board's single citation was `disciplineReferralCount above 3` — a sentence about a child,
firing because the district logged 558 referrals. A threshold over a count is a threshold
over the size of the thing counted, so aggregate claims are now keyed to rates: referrals
per 100 students, the share of students chronically absent.

Rates are not automatically safe either, which took longer to see. "Students who miss 10
percent or more of the school year" is a claim about people, and a district averaging 93.4%
attendance carries no information about how many people that is. A functioning district's
average attendance is essentially never below 90, so a claim keyed to it is dead on every
aggregate view *by construction* — the public page was silent partly because it was being
asked a question it could not answer. The honest aggregate of that same fact is chronic
absenteeism, 14.9% here, which the community page had been displaying in a metric card the
whole time and had never once handed to the library. Metrics therefore declare a scale,
bags declare a scale, and the selector refuses to match across them. There is a test that a
group bag cannot satisfy an individual-scale metric *even when the number is present*.

**`between` exists because a district lives in the middle.** The addendum specified four
comparators in Phase 1 and the code implemented three, and the missing one turned out to be
the one the public page needed: every attendance claim in the library triggered at an
extreme, above 95 or below 90, and this district sits at 93.4 — squarely in the gap, which
is where a school spends every ordinary day of its life. The band is half-open,
`threshold ≤ v < upper`, so a value on a boundary belongs to one band rather than to a band
and an `above` claim at once. That is asserted rather than assumed.

**The research layer was a second, unguarded path to the record.** Phase 3 put every route
behind one boundary and every panel behind a permission, and then `ResearchContext` was
handed a metric bag built straight off the student's summary — including
`disciplineReferralCount`, on a page rendered for a guardian who holds no
`view_behavior_detail`. Nothing leaked, because no behaviour claim happened to be tagged for
guardians; the protection was a coincidence of tagging rather than a rule. It matters
because **a triggered citation is itself a disclosure**: a claim appears precisely when a
metric crosses a threshold, so its presence on the page publishes that the threshold was
crossed. The bag is now built from what the account may see, not from what the record holds
— `canSeeBehavior ? summary.disciplineReferralCount : null` — which is the same rule the
panels above it already follow.

**Silence meant three different things and had one shape.** The component returned `null`
when nothing fired, so "the library has claims for you and none of them bear on these
figures" looked exactly like "the library has nothing for your role at all" looked exactly
like "nobody put the layer on this page." The first is the ordinary case and the whole point
of triggering; the second is the defect that survived four phases; the third is a missing
feature. They now have three shapes — a card, a quiet line naming how many claims were
considered, and a caution — on the same reasoning as the board's disclosure rules that carry
*in force · never fired*: a thing that has never announced itself is not thereby absent.

**A trigger threshold is not a finding, and the record makes them look like one.** `claim` is
what the source says. `triggerConditions` is an editorial judgement about when the claim is
worth showing and carries no authority from the source whatsoever — "above 25 referrals per
100 students" is a decision made in this repository, not a rate the PBIS literature
identifies as high. The two sit in one record and read as one statement, so `/research`
separates them explicitly and `generator/research.py` opens by saying so.

**What the student is shown was chosen, not defaulted.** The innermost ring had no research
context at all, and the obvious fix — tag the existing attendance claim for students — is the
wrong one. `cite-attendance-01` says students missing a tenth of the year are less likely to
graduate on time, and putting that in front of the fourteen-year-old it describes is the
punitive reading of a product whose first principle is the opposite. It stays tagged for the
adults responsible for support. What the student gets instead is the actionable half of the
same subject: `cite-attendance-02`, on which days carried the most new instruction, which the
app can actually point at because units already carry key instruction dates; the mobility
claim, which tells a transfer that a thin record is a fact about paperwork rather than about
them; and study technique, which is about a method the reader controls. A claim attached to a
child should be about something they can do, not about a probability attached to them.

**One good citation was left out because it had no metric to key on.** NCES publishes
statistical-disclosure guidance that is precisely the research behind the board's suppression
panel, and there is no figure on that page it could trigger from — the honest trigger would
be a small-cell count, and this district has none. Adding it with a contrived condition, or
with none, would have been the first crack in *nothing is shown because its topic seemed
relevant*, which is the rule the whole layer rests on. It stays out.

**Two triggers were rejected for reasons the data supplied.** Mastery rate cannot be a
trigger at all this year: the community and district pages spend paragraphs arguing that a
mid-February rate of 39.4% is a year in progress rather than a level of achievement, so a
claim firing on "mastery below 50" would have the product contradicting itself one panel
apart. And `priorYearMasteryRate` is only passed when the prior year holds mastery records —
a year spent at another building summarises as 0.0%, which would have fired the
prerequisite-gaps claim on every transfer in the district on the strength of a number
meaning "not recorded here."

**`/research` is outside the guard, and for a stronger reason than `/design` was.** The
addendum's case for storing citations as records rather than sentences was that the sourcing
would be auditable. For four phases it was auditable in principle and unauditable in fact:
the only way to see what the library held was to read the generator, and the only way to see
what a role got from it was to sign in as that role and scroll. This phase opened by writing
a script to answer "what does a community member see?" — the page now answers it without one,
and a claim that auditability is a feature does not survive the audit being available only to
people with accounts.

Where it ended up, on the same figures:

| | Before | After |
|---|---|---|
| Community member, district page | 0 | 5 |
| School board member | 1 | 5 |
| Nurse, on an otherwise unlit building page | 0 | 2 |
| Roles with no claim tagged | 4 | 0 |
| Claims that can never fire | 6 | 0 |
| Student, on their own page | nothing for 100% | nothing for 21.6% |
| Guardian, on a child | nothing for 52.5% | nothing for 12.7% |
| Teacher, on a student | nothing for 52.5% | nothing for 7.5% |

### Defects found while building Phase 5

- **Half the library could not fire.** Six of twelve citations triggered on a metric name no
  view supplied. Fixed by wiring the metrics up — the classroom now supplies the interruption
  minutes its claim has wanted since Phase 1 — and by the contract test that makes it
  impossible to reintroduce.
- **A count threshold applied across scales.** `disciplineReferralCount above 3`, written for
  one student, was the only research a school board ever saw, because 558 > 3.
- **A per-standard threshold fed a per-year total.** `evidenceCount below 3` was written about
  one standard's artifacts and the only page supplying `evidenceCount` handed it a year total
  of 200. It is now a share of standards carrying no artifact, which means the same thing on
  one student and on a district — and which finally gives the "what the rate rests on" panel
  the claim it was arguing.
- **The metric bag ignored permissions.** Built from the record rather than from entitlement,
  on a page whose every other panel is gated. No leak in practice; no rule preventing one.
- **An individual-scale metric was passed by five aggregate views.** `attendanceRate` was
  handed over by the section, building, district, teacher, and community pages, where it
  means the average of a group and the claims reading it mean one child.
- **Double hyphens rendered as double hyphens.** The generator's prose convention leaked into
  four strings that are displayed to stakeholders. Rephrased rather than re-punctuated.

---

### 2026-08-18 — Session 9 (Phase 6) — the caseload view

The gap Phase 3 named, Phase 4 made honest about, and Phase 5 furnished with two research
claims. None of those built *the students at my building, filtered to the stream I am
responsible for*, which is the sentence this session implemented more or less literally.

**The roles were not two, they were three, and the third was worse off in a way nothing
reported.** Phase 3 recorded the gap as a nurse and a counselor. A special education teacher
turns out to hold `school` scope — not sections, which is the natural assumption and the wrong
one — so `/teacher` refused them for holding no sections, redirected them to their own home,
which is `/teacher`, and landed on the branch in `Guard` that exists solely to stop a redirect
loop. That branch prints *this account has no dashboard it can open*, and calls it a
configuration gap. It was not a configuration gap. Three of the district's accounts had been
reading an honest report of a missing view for three phases, and the wording made it sound
like somebody had mis-provisioned them.

**A stream is a permission, not a role.** The four streams — attendance, health, behaviour,
special services — are each keyed to the permission that gates them, and `streamsFor` takes
the permission predicate rather than the session. That is not tidiness: the three roles landing
here hold three different subsets, and no two are nested. A nurse has attendance and health; a
special education teacher has attendance, behaviour, and services and no health at all; a
counselor has all four. Any role check would have to enumerate them and would be wrong the
moment the district issued a fifth account.

The property worth stating is what a lacked stream looks like: **absent**. Not greyed, not
withheld, not counted. `concernsOf` filters per stream at the top of each block rather than
filtering the assembled list, so a stream the viewer does not hold is never computed and cannot
leak through a later change to the sort, the summary, or a timestamp. There is no "3 behaviour
flags hidden" anywhere on the page, because a count of what is being kept from you is a
disclosure of it — the same argument the public sky makes for drawing suppressed cells, run in
the opposite direction, and the difference is that the public reader can count the row and this
one cannot.

**The route needs the opposite permissions to the building page, and that is the whole rule.**
`/school/:schoolId` requires `view_student_names`; `/caseload/:schoolId` requires
`view_individual_students` and `view_student_names` and deliberately *not*
`view_aggregate_mastery`. Same scope question, same answer, different requirement — which is
the addendum's rule (a role is a permission set, a scope is a set of ids, both must agree) with
its two halves varying independently for the first time. The three counterexamples all now have
a test: a board member holds every id in the district and fails on permission, a teacher holds
the permissions and fails on scope, and a nurse passes both here and fails the *content* of the
building page rather than its route.

One correction to what Phase 3 recorded: a nurse is not refused `/school/:schoolId`. That route
only ever required `view_student_names`, which they hold. What they lack is
`view_aggregate_mastery`, which is what the page is *made of* — hence the unlit sky — and the
distinction matters because it is exactly the gap the caseload fills rather than duplicates.

**A star is a student, and this is the zoom level the fractal was missing.** Every other sky
above a student is lit from a rollup. This one is lit from individuals: a star is one child and
its brightness is that child's own share of standards mastered. That follows from the rule
rather than bending it — *a star is the smallest thing this viewer is allowed to see* — and a
nurse holding `view_individual_students` is allowed to see a student. Nothing on the page
computes a mean of them, which is the line `view_aggregate_mastery` actually draws. Brightness
is `intensityOfRate` like everywhere else, and there is a test asserting so, because this is
the likeliest place in the app for a second brightness scale to appear unnoticed.

Clustering is by concern rather than by subject, which is the one departure from the levels
above. A caseload is already a selection, so the useful division inside a grade is how much is
on record.

**The index had to be generated, not assembled in the browser.** No existing file answers this
question. `sections-context` is indexed by section, so a secondary student appears in six
rosters and a nurse would fetch every roster in the building to build one list; health and
special services are not in a roster at all and live only in the per-student profile, which is
~370 fetches to draw one page. So `build_caseload_index` writes one file per building, carrying
facts and no judgements — who is *on* a caseload depends on who is looking, and that decision
belongs where the viewer is known and can be tested.

**Kindergarten sorted after grade 5.** Found while writing the grade filter:
`'K'.localeCompare('1', undefined, {numeric: true})` puts K last, so an elementary building
reads 1, 2, 3, 4, 5, Kindergarten. `byGradeOrder` in `lib/dataset.ts` fixes it and the caseload
uses it. The three older call sites still sort the old way and are listed under open questions
rather than changed here.

### 2026-08-18 — Session 10 (Phase 7) — the research review

The gap the last three sessions kept naming. 18 of 18 claims marked
`needs_human_review`, shown on more pages to more roles with every phase, and nobody had ever
opened a source. This session opened all 18.

**Not one claim in the library is clean.** Three point at a document their URL no longer
reaches. Twelve carry a wrong title, year, author order, or source type. Ten describe their
source as establishing more than it does. The findings are in
`docs/supernova-research-review.md`, claim by claim, with what a reviewer would have to decide
about each.

The result is worse than expected and the reason is worth recording, because it is not
carelessness. Every claim is about a real finding, most are sourced to the right literature,
and the `confidenceNote` on each was written with care — in four cases the note already
contains the correction the claim needs, sitting underneath a claim that contradicts it.
`cite-interruptions-01` claims protected instructional time is associated with greater gains;
its note says more minutes alone does not produce gains; the WestEd report they both cite
concludes the second. What was never done was the last step. **The library was assembled from
what its author knew to be broadly true, which is a different activity from citing**, and the
two are indistinguishable until somebody fetches the URL.

**The pattern is the same every time and it is a design problem, not a writing problem.** The
claim is written as the strong general version, the qualification goes in the note, and the
reader of a dashboard reads the claim. So the check has to ask whether the source establishes
*the claim sentence, read alone*, because that is how it is read. Under that test ten claims
fail; under "is this broadly defensible" almost none do.

Three findings are worth naming individually:

- **`cite-variation-01` attributes to Rivkin, Hanushek and Kain a result they do not report.**
  They estimate a lower bound on the variance of teacher quality, identified *from*
  within-school heterogeneity in order to strip out school-level confounding. The claim reads
  that method as the finding and asserts that achievement varies more within schools than
  between them. It fires on `masterySpreadPoints`, so it is one of the claims a **school board**
  and the **public** see. The proposition is defensible and well supported elsewhere; it is not
  supported here.
- **`cite-attendance-02` is unsourced.** The `www2.ed.gov` data story is gone, and the page at
  the end of its redirect chain says nothing about when in a unit an absence falls. This is the
  only research claim the product shows a **student** about their own attendance, chosen in
  Phase 5 precisely because it was the actionable, non-punitive half of the subject. Its own
  `confidenceNote` predicted this exactly and it shipped anyway.
- **`cite-services-01` is worded as an empirical finding and its source is a statute.**
  IDEA §1412(a)(5) requires the least restrictive environment. It establishes an obligation and
  makes no claim about outcomes, because there is no evidence in a statute.

**A source check is not a sign-off, and that distinction is the phase's architecture.** The old
flag had two values and collapsed two different acts. A source check asks whether the cited
document exists and says what the claim says — careful reading, which anyone can do, including
a machine with a network connection, and whose result is a written finding somebody else can
disagree with. A sign-off asks whether a claim is fit to put in front of a school board, which
is a judgement about educational research that a named person makes and is accountable for
afterwards.

So they are stored separately in `generator/review.py`, `verified` is reachable only through a
`signOff`, and `isUnverified` in the app is written against the sign-off and never against the
check. There is a test asserting that a claim whose source checks out perfectly is still
unverified. **The consequence is that this session did thorough work and verified nothing**,
which is the correct outcome and not a shortfall: two claims — `cite-engagement-03` and
`cite-mastery-01` — are sourced correctly, worded within what their sources establish, and
still carry the marker, waiting for somebody with standing to sign them.

**A status derived from two records cannot drift; a third field can.** `review.status` is
computed by `statusOf` in the generator and written into the dataset so it can be read without
running code — which makes it exactly the kind of third copy that goes stale. The app
recomputes it in `deriveReviewStatus` and the suite asserts the two agree, the same contract as
the metric vocabulary and for the same reason: the Python that writes it and the TypeScript
that reads it are edited at different times by different people.

**Absence of a check is now its own state.** Eighteen identical `needs_human_review` flags
written by hand at eighteen call sites were indistinguishable from a review that had happened
and found nothing wrong. The review record is attached in `_with_review` at import time rather
than typed into each literal, so a claim added to the library without one reports `unreviewed`
by construction, and `unreviewed` is rendered as a caution rather than as silence.

**The flag on a dashboard says which kind of outstanding.** A claim nobody has read the source
for and a claim somebody read and found overstated are different problems and they had one word
between them. A teacher's building page now reads `revision required`, and the tooltip is the
defect list rather than the finding — a reader hovering a flag on their own dashboard is asking
why it is flagged, and the finding can read as reassuring on a claim whose *record* is what is
wrong. `/research` shows both, in that order, for a reader who came to audit rather than to
work.

**The revisions were made in the same session, and that is worth being explicit about.**
Sixteen claims were reworded, resourced, or had their records corrected, and all eighteen were
rechecked against the wording they now have. Most of it needed no research judgement at all: a
title, a year, an author order, an intensifier the source does not use, a clause struck. Three
did not yield to editing. `cite-attendance-02` now cites Keppens 2023 on the timing of absence
within the school year — 62,841 secondary students, absence early and late in the year more
strongly associated with lower end-of-year results — and states that finding rather than the
key-instruction-day mechanism nothing was ever found to support, so the student keeps a claim
about their own attendance and it is now sourced. `cite-variation-01` keeps Rivkin, Hanushek and
Kain and states what they report. `cite-services-01` is now the legal requirement §1412(a)(5)
contains, which is honest context for a caseload in its own right.

This is a check marking its own work, and the record says so — `SOURCE_CHECK_AGENT` carries the
admission, and it is a reason for a reviewer to open the sources rather than take the finding's
word for it.

**A verdict is a verdict about a sentence, and nothing enforced that for one commit.**
`review.py` opened by arguing that keeping the review separate from the library stops a claim
being edited while its old verdict rides along. It was an argument about file layout and it
prevented nothing: the sixteen revisions would have inherited their own pre-revision findings,
still reading `revision_required`, with the findings describing sentences that no longer
existed. A check now records `claimChecked`, the wording it was reached against, and `statusOf`
reports `stale` when the current claim differs. It applies to sign-offs too, which is the only
way a signature gets revoked without anybody revoking it — and it should be, because the
signature was on a sentence.

**A living webpage cannot be cited to a year, so `publicationYear` is now optional.** Three
records cited continuously revised pages — Attendance Works twice, PBIS once — to a year this
repository supplied. The PBIS site leaves the year blank in its own citation guidance, which is
a source telling you not to do the thing the record did. `source.accessedDate` carries it
instead, and both places that print a citation read the date through `sourceDate` rather than
reaching for a field three sources do not have.

### Defects found while building Phase 7

- **The type emitter silently dropped `| null`.** `render` in `scripts/emit_types.py` checked
  `"properties" in schema` before it checked whether `type` was a list, so `["object", "null"]`
  rendered as a bare object. No schema had a nullable object before this one, and the first
  field to have one is a citation's `signOff`, which is null on every claim in the library —
  the app would have been typed to dereference a reviewer who does not exist.
- **Ten, not nine.** The review write-up counted the overstated claims by hand and got nine;
  the page computes them from the records and reported ten. The page was right. Recorded here
  because it is the same failure the phase is about, one level up: a number asserted from
  memory next to a number derived from the data.
- **`cite-health-01` is filed under `attendance`.** The topic enum has no health value, so a
  claim about asthma and vision sits under attendance. It is not wrong — the claim is about
  missed instruction — but the enum is shaping the record rather than describing it.
- **The separation `review.py` argued for was not enforced by anything.** Its docstring opened
  by saying that keeping the review out of `research.py` stops a claim being edited while
  keeping its old verdict. That was true about file layout and false about behaviour, and the
  very next commit would have demonstrated it. Found by writing the revisions the module was
  built to make safe.

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
  citation library; it needs review before it appears in any stakeholder-facing view.
  Phase 5 grew it to 18 claims and built the page that makes review possible — `/research`
  shows every claim, its source, and its status — but performed no review. All 18 remain
  `needs_human_review`, and the question of who is entitled to clear that flag is still
  open.)*

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
- ~~**A student account cannot see its own attendance.**~~ **Resolved in Phase 3** — an
  oversight. The role now carries `view_attendance_detail`, which at student scope is the
  right to read one's own record; the guardian on the same child already held it.
- The guardian view answers Phase 1's open question about parent-visible behaviour data
  by omitting it entirely, since the guardian role holds no `view_behavior_detail`.
  Worth confirming that is the intended answer rather than the default one.

Raised during Stage 4:

- **Should behaviour be recordable against a section?** Incidents carry a nullable
  `subject`, which is the only handle a departmentalized classroom view has for deciding
  whether an incident belongs to it. In one sampled Art II section, 27 roster incidents
  were all unattributable. If a teacher is meant to see the behaviour affecting *their*
  class, the record needs a `sectionId` — or the view has to keep saying it cannot tell.
- **Should attendance be period-level?** The same question one layer down. Whole-day
  attendance makes "class attendance" an approximation for every departmentalized
  section, which is 234 of 252 of them. Real secondary schools take attendance per
  period; modelling that would make the absence-to-mastery correlation sharper, at the
  cost of a much larger attendance stream.
- **Is "pacing behind" a section property or a curriculum-plan property?** Most sections
  read behind at the February as-of date because `percentTimeElapsed` runs ahead of
  `percentContentCovered` across the board. If nearly every class is behind, the signal
  stops distinguishing classes and starts describing the plan.

Raised during Stage 5:

- ~~**Should the teacher comparison be scope-gated before Phase 3?**~~ **Resolved in
  Phase 3** — gated with everything else rather than early. The building page requires
  `view_student_names` and the building in scope, so a guardian, a student, a board
  member, and a teacher at that same school are all refused it.
- **Should prior-year aggregates be generated, so trends become possible?** The honest
  blocker is that prior years attach to students rather than buildings. Generating
  prior-year sections at the school matching each prior grade — already an open question
  from Stage 2 — would resolve the trend question and the longitudinal-constellation gap
  at the same time. They are the same piece of work.
- **Does the district need a subject × grade matrix rather than two separate tables?**
  "Which grades are strongest in mathematics" is a question the course model was
  deliberately simplified to keep answerable, and neither the by-grade nor the by-subject
  table answers it on its own.

Raised during Stage 6:

- ~~**Why does a board member see less than a member of the public?**~~ **Resolved in
  Phase 3** — the board's row means "aggregates, not individuals", and the addendum now
  says so. Both audiences read the same figures; the board additionally reads the
  disclosure rules behind them, which is the thing a governing body actually lacked.
- **Is the Phase 1 small-cell question now closed?** It was carried as "with three schools,
  a single-school aggregate may still be identifying at the extremes." The answer built here
  is a threshold plus complementary suppression plus a re-identification check on the second
  dimension — but all three are inert on this dataset. The rule has been reasoned about and
  tested; it has never actually run against real data. That is not the same as knowing it
  works, and a district with a 6-student grade would be the real test.
- ~~**The citation library is admin-shaped.**~~ **Resolved in Phase 5**, and it was worse
  than recorded here. The gap at 93.4% was real — that band is now covered, by the comparator
  the addendum specified and the code never had — but a community member saw nothing for a
  second reason this entry missed: the claims tagged for the role were keyed to an
  individual's attendance rate, which no aggregate page can honestly supply. Four roles, not
  one, had no claims at all, and half the library could not fire for anybody. Community and
  board now read five claims each on the district's own figures.
- **Should the board see the spread without the labels?** The board narrative states that
  schools sit within 1.1 points and grades vary 10.3, which is the shape of the variation
  with no identifiers attached. That felt right — a governing body needs to know the
  variation is inside buildings rather than between them — but it is a judgement made in
  this stage rather than one the role table decides, and it is the closest the board view
  comes to its own line.

Raised during Phase 3:

- ~~**A nurse has no view of the job the permissions describe.**~~ **Resolved in Phase 6**,
  and it was three roles rather than two. A special education teacher holds building scope,
  not sections, so `/teacher` had been refusing them and landing them on the redirect-loop
  branch that says *this account has no dashboard it can open* — an honest report of what
  looked like a provisioning error and was actually a missing view. All three now land on
  `/caseload/:schoolId`. One correction to this entry as written: a nurse was never refused
  the building page. That route requires only `view_student_names`, which they hold; what
  they lack is `view_aggregate_mastery`, which is what the page is made of.
- **Should a refused request be recorded?** Nothing is logged. In a district system, a
  repeated attempt on records outside an account's scope is exactly the signal an
  administrator would want, and FERPA-adjacent audit expectations assume access to student
  records leaves a trail. Adding one is a question about what a prototype is claiming to be
  — and about who reads the log, since it would itself be a record of who looked at whom.
- **Guardian rights are stored twice and enforced once.** The route boundary trusts
  `scopeIds` on the guardian's role assignment; the family view filters `studentLinks` by
  `hasEducationalRights`. The generator writes both from the same source so they agree
  today. If custody changes and only one is updated, the guarded route and the rendered
  page disagree — and the route is the one that decides. A single derivation would be
  better than two that happen to match.
- **Scope expansion re-fetches on every guarded navigation.** `resolveScope` runs per guard
  render, and for a teacher that is up to five roster files. The data client caches by path,
  so the cost is paid once per session, but the check is doing real I/O rather than reading
  a resolved scope held on the session. It is correct and it is not slow here; it would be
  neither in a district with a teacher scoped to forty sections.
- **Everyone can open the public page, including a signed-in teacher.** That is deliberate —
  the community view is genuinely public — but it means every account has two homes, and the
  view speaks to a reader it assumes is outside the district. Worth deciding whether a
  signed-in account should see the public page at all, or see it labelled as what the
  public sees.

Raised during Phase 4:

- ~~**Does the district need a subject × grade matrix rather than two separate tables?**~~
  **Answered, on the public page.** The sky there is that matrix: one star per grade, per
  school, per subject. What it revealed is that the question had no interesting answer on
  this district — the whole matrix spans 30.3% to 49.6% with a standard deviation of 3.7.
  The tool now exists and this dataset has nothing to show through it, which is a different
  and more useful state than not knowing.
- **The absolute ramp is honest and nearly uninformative here.** Every sky above the
  classroom renders in the narrow band a mid-February district actually occupies, so the
  pictures are even by construction. The alternative — shading against each sky's own
  spread — was rejected on principle and the principle still holds. What has not been
  tried is a second, explicitly labelled *deviation* view: the same stars lit by distance
  from the district rate, offered as a distinct reading rather than as the default. That
  would keep the mastery map honest and still answer "where is this building unlike
  itself".
- **The district sky renders 252 stars with no virtualization.** Fine at this size and
  fine at three schools. A district with 2,000 sections would render 2,000 DOM nodes with
  an inline custom property each, and the grouping does nothing to bound that.
- **A star's meaning changes with the viewer, and only the caption says so.** The same
  mark is a standard, a student's unit, a classroom, and a grade at different levels. The
  legend note on each view carries the whole burden of saying which. That is one sentence
  of prose defending the product's central claim, and it is worth asking whether the mark
  itself should differ — in size, or in how the cluster is framed — rather than only the
  words above it.
- **The style guide is not checked by anything.** It breaks visibly when a token is
  renamed, which is the point, but only if somebody opens it. Nothing in `npm test` or the
  build asserts that a swatch still resolves, so a deleted token is caught by a person or
  not at all.

Raised during Phase 5:

- ~~**Nothing has been verified, and the phase made that more visible rather than less.**~~
  **Half resolved in Phase 7**, and the half that moved is not the half anybody expected. The
  sources have now all been checked and the results are recorded per claim; 16 of the 18 need
  revision before a reviewer could sign them, and 2 are clean and waiting. The first of the
  two questions under it is answered: `verified` is reachable only through a `signOff` naming
  a person and their standing, because a source check is careful reading and a sign-off is
  accountability, and no amount of the first is the second. **The second question is still
  open** — what a sign-off licenses. Presumably dropping the marker; not obviously showing the
  claim to a school board, dropping the hedge, or surviving the source being superseded. The
  hedge is still doing real work and nothing has decided when it may stop.
- **A triggered citation discloses the figure that triggered it.** The student bag is now
  gated on the viewer's permissions for exactly this reason, but the same property holds at
  group scale and is not gated there: a nurse's building page shows a chronic-absence claim
  and therefore reveals that the building is above 10%, which their permissions do cover, but
  the reasoning was made case by case rather than by rule. A general form — *a claim may only
  trigger on a metric the viewer could be shown directly* — is stateable and is not stated.
- **Three claims are shown and the choice among them is arbitrary.** A teacher reading one
  student can have nine claims fire; the layer shows the first three in library order and
  reports the rest as a count. Library order is the order somebody typed them. Relevance,
  severity, and recency are all defensible orderings and none is implemented.
- **21.6% of students still see nothing on their own page.** Down from 100%, and the
  remainder is not obviously a bug — a student attending well, completing their homework, and
  holding a full prior record has genuinely triggered nothing. But three claims is a thin
  library for the role the entire product is named after, and the constraint that a
  student-facing claim be about a method rather than a probability is a real one that has not
  been tried hard against.
- **Every threshold is an editorial judgement and none was made by anyone qualified.**
  `/research` says so plainly, which is better than the previous state of not saying it. It
  is not the same as the numbers being right. **Phase 7 did not touch this** — the review
  checked claims against sources, and a trigger threshold carries no authority from a source
  by construction, so there is nothing to check it against. It needs a different kind of
  review from the one that has now happened. "Above 25 referrals per 100 students" and
  "above 20% of standards without evidence" were both chosen in this session by reading the
  district's own figures and picking a number that fired.
- **Claims are matched one metric at a time, and the design document promised more.** The
  UI/UX doc describes an analytics layer that identifies *combinations* — low mastery plus
  absence during a key instruction window, an interruption plus a pacing slowdown — and
  surfaces the correlation. The layer built here matches a single claim to a single figure,
  so two claims about the same student appear side by side with no relationship asserted
  between them. That is honest, and it is less than was described.
- **`masterySpreadPoints` is a slightly different quantity on every page.** Each view supplies
  the widest spread among the breakdowns it happens to show — grades and schools on the public
  page, plus classrooms on the district page — so the same claim fires against a different
  measurement depending on where it is read. The alternative is a spread computed once at a
  fixed level, which would then not describe the page it appears on.
- ~~**The nurse has two claims and still has no caseload view.**~~ **Resolved in Phase 6.**
  The claims stay where they are — the building page is still honest about what it withholds
  — and it now links to the page that is theirs.

Raised during Phase 6:

- **Every threshold on this page is an editorial judgement, again.** Chronic absence arrives
  computed against the federal definition and is the only line here anybody qualified chose.
  The other six — attendance below 93%, eight late arrivals, two referrals to watch and three
  to prioritise, five health-office visits, a formal plan ahead of other services — were picked
  in this session by reading the district's figures and choosing numbers that produced a list
  of plausible size. They are named in `THRESHOLDS` and printed on the page so the rule can be
  argued with, which is not the same as the numbers being right. This is the second surface in
  the product carrying that admission and the two are not coordinated with each other.
- **The caseload file is not a redaction boundary and the enforcement is client-side.** Every
  stream is written for every student in one file per building, and which of them a viewer may
  read is decided when the page is built. A nurse's browser holds behaviour data it never
  renders. That matches how the rest of this dataset is served — a student profile file is the
  whole student and the family view renders a subset — so it is consistent rather than a new
  hole, and it is worth writing down that a real deployment would filter server-side and this
  prototype's `access.ts` would be the wrong shape for that: it decides what a *page* shows,
  not what a *response* contains.
- **A counselor's full caseload is 230 of 366 students.** Which may be true — a counselor at a
  366-student elementary does carry most of the building in some sense — but a list that long
  is a directory, and the priority filter defaulting on is the only thing standing between the
  page and uselessness. The severity split is doing work the thresholds should probably do
  instead, and nobody has asked a counselor whether the split matches how they triage.
- **Nothing is ordered by urgency across streams.** A student with a suspension and a student
  with an IEP are both priority, sorted by how many concerns they carry and then by name. That
  is deliberate — ranking children by the severity of their situations is the thing the product
  refuses to do with mastery and should probably refuse here too — but "how many things are on
  record" is itself an ordering, and it was chosen rather than reasoned about.
- ~~**Three call sites still sort kindergarten after grade 5.**~~ **Resolved**, and it was
  seven rather than three. The survey behind this entry caught `buildingSky`, `districtSky`,
  and `SchoolView`'s grade rollups; it missed `publicSky` (the community matrix, where Nova's
  row read 1, 2, 3, 4, 5, Kindergarten in front of the board), the section lists on both
  `SchoolView` and `TeacherView`, and `gradesIdentifyingOneBuilding` in `community/disclosure.ts`,
  which prints a grade list on the board's disclosure panel. All seven now call `byGradeOrder`,
  so the app has one grade ordering and `localeCompare(…, { numeric: true })` no longer appears
  on any grade in the codebase. Three regression tests in `constellations.test.ts` pin the
  building, district, and public skies to kindergarten-first; the caseload already had one.

  The generated data needed no fix, and the reason is worth recording: `gradesCovered` is
  copied straight from `config.grades`, which is written in school order — so the two views
  that read `gradesCovered[0]`–`gradesCovered[last]` to print a grade span were always
  correct. The rollup array `aggregates.grades`, by contrast, is emitted under Python's
  string sort and arrives as 1, 2, 3, 4, 5, K and 10, 11, 12, 9. Every consumer re-sorts it,
  which is why the high school's grades read correctly even before this change — the numeric
  compare fixed the 9-after-12 half of that and not the K half. `byGradeOrder` fixes both.
- **The caseload has no year switch.** Every other student-facing surface can move between the
  three school years on record; this one is built from `CURRENT_SCHOOL_YEAR` in the generator
  and has no notion of a prior year at all. A nurse asking "was this child like this last year"
  has to open the profile.
- **`add_intervention_notes` is held by three of these roles and does nothing.** A counselor, a
  special education teacher, and a building administrator all carry it. The caseload is the
  obvious place for it to mean something and this phase did not touch it, so the permission
  remains issued and unimplemented — which is a smaller version of exactly the gap this phase
  closed.

Raised during Phase 7:

- ~~**Sixteen claims need rewriting and this session rewrote none of them.**~~ **Done**, in the
  same session, once the findings were written down. The ordering mattered: the check was
  recorded first and the revisions made against it, so the argument survives independently of
  the fix. It is still a check marking its own work, which `SOURCE_CHECK_AGENT` now says out
  loud.
- ~~**Three claims cannot be fixed by editing.**~~ **Resolved**, each differently.
  `cite-attendance-02` was resourced to Keppens 2023 and restated at the level that source
  supports, so a student's own page keeps a claim about attendance rather than going quiet.
  `cite-variation-01` keeps its paper and states what the paper reports. `cite-services-01` is
  now a legal requirement rather than an outcome claim over a statute.
- ~~**A living webpage cannot be cited to a year.**~~ **Resolved** — `publicationYear` is
  optional, `accessedDate` exists, and `sourceDate` is the single place a citation's date is
  rendered.
- **What a sign-off licenses is undecided, and now blocks all eighteen claims rather than
  two.** Every claim is checked and sourced. Somebody could sign one tomorrow and nothing says
  what would change: whether the marker comes off, whether the `confidenceNote` may be dropped,
  whether a signed claim may go in front of the board, or what happens when a source is
  superseded. This is the phase's remaining work and it is not a coding task.
- **A recheck is cheap to skip and nothing schedules one.** `claimChecked` catches a claim
  edited without a recheck. It cannot catch a *source* that changed underneath a claim nobody
  edited, and three of these sources are living pages whose access date is the only record that
  the reading has an age.
- **The check was reading, and five sources were read at one remove.** Wiley, Sage, Taylor &
  Francis and GAO serve a browser and refuse an automated request. Their metadata is confirmed
  exact through Crossref and their headline findings through the publisher record or abstract,
  which is enough to catch a claim that misattributes a result and not enough to catch one that
  misreads a qualification on page 40. Keppens 2023, which `cite-attendance-02` now rests on
  entirely, is in that group. Somebody with library access should read the full texts.
- **`cite-evidence-01` calls its URL reachable on a judgement call.** The 2014 Standards are a
  book that is not free anywhere. The URL reaches the document's official home, which is the
  right citation target for a book and is not the text. The first pass recorded that as a
  defect and the recheck recorded it as acceptable, with the reasoning written into the finding
  so a reviewer can disagree. It still carries no chapter or standard number, so nobody holding
  the book can check it quickly.
- **`SOURCE_CHECKS` is keyed by citation id and nothing enforces the join.** A claim renamed
  in `research.py` silently loses its review and reports `unreviewed`, which is the safe
  direction to fail but is silent about it. A stale key in `review.py` pointing at no claim is
  not reported at all.
- **The topic enum has no health value.** `cite-health-01` is filed under `attendance`, which
  is defensible — the claim is about missed instruction — and is the enum shaping the record
  rather than describing it. The caseload has a health stream; the library cannot name one.

---

## Notes for the Next Session

**All seven phases are complete.** The dataset, the dashboards, enforcement at the route
boundary, one constellation at every zoom level, a research layer whose claims are matched to
the figures rather than to the topic, the caseload the first three phases kept pointing at, and
the review that finally opened the sources. Phase 5's decision log is worth reading before
touching the research code; the shortest version is that a trigger has to survive a change of
scale, and that the metric vocabulary is now a contract with a test behind it rather than a
convention. Phase 7's is worth reading before touching a claim.

**Every one of the ten roles now lands on a page built for it.** That was not true before
Phase 6 and it was not true in the way anybody had written down: a special education teacher
reached the branch in `Guard` that reports an account with no dashboard, and the report read
as a provisioning error rather than as the missing view it was. Worth remembering as a general
shape — the honest error message was accurate, unremarkable, and hid a real gap for three
phases.

**The sources have been checked, and the library has been rewritten to match them.** The
first pass found no clean claim in it: three URLs no longer reached the document they named,
twelve records carried a wrong title, year, author order or source type, and ten claims
described their source as establishing more than it does. All sixteen were then revised, three
of them requiring a new source or a restatement rather than an edit.
`docs/supernova-research-review.md` keeps the findings as they were written, because that
argument is what the revisions rest on and rewriting it to describe the fixed library would
destroy the record of what was wrong.

**Nothing is verified, and that is the correct state rather than unfinished business.** A
source check establishes what a source says; a sign-off is a named person accepting that a
claim belongs in front of a school board and being accountable for it afterwards. Only the
second produces `verified`, `isUnverified` is written against the sign-off, and there is a test
asserting a perfectly checked claim is still unverified. All eighteen are now checked, sourced,
and waiting for a signature. **The flag remains the only thing standing between a synthetic
prototype and a product asserting educational research to a school board** — the difference
after Phase 7 is that a reviewer signing one is agreeing with a specific written argument
rather than approving a sentence they have no way to check.

**What a sign-off licenses is the one thing this phase did not settle**, and it now blocks
eighteen claims rather than the two it blocked before the revisions. That question is not a
coding task.

Six things about the code that are easy to get wrong:

- **Never resolve scope from the record being requested.** `scope.ts` expands the
  *viewer's* assignments — a teacher's rosters — precisely so that deciding access never
  requires fetching the thing access is being decided about.
- **Any async check must be keyed and its result discarded on mismatch.** The guard held
  scope and target in separate `useAsync` hooks at first, and an account switch rendered a
  new session against the previous account's scope for one frame. See `Guard.tsx`.
- **Brightness is absolute, everywhere, forever.** `intensityOfRate` in `ui/stars.ts` is
  the only place a rate becomes a brightness. Shading a sky against its own spread would
  read better and would turn the mastery map into a ranking; there is a test asserting a
  star is lit the same alone as among brighter neighbours.
- **Anything a test touches cannot live in a `.tsx`.** `node --test` strips types but does
  not transform JSX. That is why the star vocabulary is in `ui/stars.ts`, why the research
  selector is in `ui/research.ts`, and why both write their runtime imports with explicit
  `.ts` extensions.
- **A metric name is not a string.** `METRICS` in `ui/research.ts` is the only place a metric
  is declared, views supply them through `groupMetrics` / `studentMetrics` rather than object
  literals, and `research.test.ts` reads the shipped dataset to assert the two agree. Adding a
  citation with a new metric means declaring it and supplying it first; skipping either used
  to produce a citation that rendered as nothing, forever, silently.
- **A caseload stream is filtered before it is computed, not after.** `concernsOf` checks the
  permission at the top of each stream's block rather than filtering the assembled list. Same
  output today; the difference is that a later change to the sort, the summary, or a "last
  contact" timestamp cannot reintroduce a stream the viewer never held.
- **A source check is not a sign-off, and `isUnverified` is written against the sign-off.**
  `generator/review.py` stores the two separately and `deriveReviewStatus` in
  `ui/research.ts` recomputes the status from them. Widening `isUnverified` to accept a
  checked-but-unsigned claim would take one word and would quietly turn "somebody read the
  URL" into "the product asserts this."
- **Reword a claim and you retire the verdict on it.** A check records `claimChecked`, the
  sentence it was reached against, and a claim that no longer matches reads `stale` — including
  one that had been signed, because a signature is on a sentence. Editing a claim therefore
  means rechecking it, and the suite fails if the shipped library holds a claim reworded since
  its check.
- **Never hand the research layer a figure the viewer cannot be shown.** A claim appears
  exactly when a metric crosses a threshold, so its presence publishes that the threshold was
  crossed. `StudentView` builds its bag from `canSeeBehavior` and friends rather than from the
  record. This is a permission boundary that does not look like one.

Running the app:

```bash
npm --prefix app run dev
```

`app/public/data` is a symlink to `data/`, so the dev server serves the dataset at
`/data/...`. It is gitignored — do not commit a second copy of 178MB. `vite.config.ts`
honours `PORT`, so a second dev server can run alongside a first.

Checks:

```bash
npm --prefix app run build && npm --prefix app test && npm --prefix app run lint
```

`test` is `node --test` over `src/**/*.test.ts`, using Node's own type stripping — there is
no test framework and nothing to install. 98 tests, and everything covered is covered for
the same reason: its failures are invisible on screen. A guard that wrongly allows renders
a page indistinguishable from one the viewer was entitled to; a suppression rule that never
fires looks identical to one that works; a sky lit on the wrong scale is still a sky, and
nobody ever sees two zoom levels at once; a citation that can never fire renders exactly
like one that fires correctly; a caseload leaking a stream the viewer may not read looks
completely normal, because the leak *is* a student on a list with a chip on them; and a claim
whose source does not support it reads exactly like one whose source does, which is how ten of
them survived six phases. That last pair was not hypothetical — half the citation
library was inert for four phases and none of it had ever been checked — which is why
`research.test.ts` is the only suite that reads the shipped dataset rather than fixtures. It is asserting a contract between two files
that are edited by different people at different times, and fixtures cannot do that. Lint
reports 11 `only-export-components` warnings against a recorded baseline of 12; that count
should not grow.

Useful entry points:

- `app/src/ui/research.ts` — the metric vocabulary, the scale rule, the selector, and the
  review vocabulary. Plain TypeScript so both contracts can be tested
- `generator/review.py` — what checking each source found, who checked it, and why a check
  can never produce `verified`
- `docs/supernova-research-review.md` — the findings claim by claim, and what a reviewer
  would have to decide about each
- `app/src/ui/ResearchContext.tsx` — the card, and the two shapes silence takes
- `app/src/views/ResearchView.tsx` — the library audit at `/research`, outside the guard
- `generator/research.py` — the claims themselves, and why each trigger is what it is
- `app/src/ui/stars.ts` — what a star is, and the one function turning a rate into
  brightness. Plain TypeScript so the scale can be tested
- `app/src/ui/Constellation.tsx` — the picture, at any scale, plus `UnlitSky`
- `app/src/views/constellations.ts` — what a star *is* at the classroom, caseload,
  building, district, and public levels, as pure functions
- `app/src/ui/theme.css` — every token; dark is the base, light is the single override
- `app/src/views/DesignView.tsx` — the style guide at `/design`, rendered from the tokens
- `app/src/views/caseload/caseload.ts` — what a caseload is: streams as permissions, the
  thresholds, and the filter. Plain TypeScript so the stream boundary can be tested
- `app/src/views/CaseloadView.tsx` — the page three roles land on
- `generator/aggregates.py` — `build_caseload_index`, one file per building
- `app/src/session/access.ts` — every access decision, as pure functions
- `app/src/session/scope.ts` — expanding an account's scope into concrete ids
- `app/src/session/Guard.tsx` — the route boundary, and the redirect notice
- `app/src/views/StudentView.tsx` — the composed student profile; the family view
  reuses it through `StudentProfileScreen` with a narrower audience
- `app/src/views/student/MasteryConstellation.tsx` — which mastery record becomes which
  star; the picture itself now lives in `ui/Constellation`
- `app/src/session/roles.ts` — roles, permissions, `can`, and where each role lands
- `app/src/data/client.ts` — every dataset read, with the eager/lazy split
- `app/src/views/section/ClassroomCard.tsx` — the classroom card, viewer-agnostic
- `app/src/views/SectionView.tsx` — the classroom drill-down and its scoping helpers
- `app/src/views/section/narrative.ts` — the analytics paragraph, as a pure function
- `app/src/ui/ComparisonTable.tsx` — ranked rows with bars, shared by every zoom level
- `app/src/views/admin/compare.ts` — the spread computation the district view argues from
- `app/src/views/community/disclosure.ts` — every public-display rule, as pure functions
- `app/src/views/CommunityView.tsx` — the board and public views, and what each withholds
- `scripts/emit_types.py` — regenerate TypeScript types after any schema change

Three things that stay true:

1. Records omit fields at their default (absent `metadata` means no quality flags).
   The UI reads defensively rather than assuming every key is present.
2. `masteryRate` is over standards **taught to date**, not the full year.
   `standardsNotYetTaught` is reported separately so the mastery map can render
   untaught content as genuinely dark rather than as failure.
3. Counts are per student, not per standard. A unit of 3 standards across 19 students
   is 57 demonstrations, and every rollup in `sections-context.json` counts that way.
   Views that say "of 57" have to say what the 57 are.
