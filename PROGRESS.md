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
| 5. Research context layer | Not started | — |

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
- **The citation library is admin-shaped.** A community member gets no research context at
  all: the only two citations tagged for the role trigger below 90% attendance and above
  95% attendance, and the district sits at 93.4% — squarely in the gap between them. A board
  member gets exactly one, on discipline referrals. The library was written for views that
  describe a student or a classroom, and the outermost layer has almost nothing to say
  through it. Phase 5 should add public-facing claims, or the role tags are decorative.
- **Should the board see the spread without the labels?** The board narrative states that
  schools sit within 1.1 points and grades vary 10.3, which is the shape of the variation
  with no identifiers attached. That felt right — a governing body needs to know the
  variation is inside buildings rather than between them — but it is a judgement made in
  this stage rather than one the role table decides, and it is the closest the board view
  comes to its own line.

Raised during Phase 3:

- **A nurse has no view of the job the permissions describe.** The account holds named
  students, attendance, and health detail at one building, and there is no view in the app
  that indexes students. Their home is the building page, which is aggregate mastery end to
  end — a permission they do not hold — so it now renders the header and an explanation of
  what is absent. The same is nearly true of a counselor, who holds aggregate mastery and so
  scrapes through on a page built for an administrator. The missing piece is a caseload view:
  *the students at my building, filtered to the stream I am responsible for.* This is the
  most concrete gap Phase 3 uncovered.
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

---

## Notes for the Next Session

**Phase 4 is complete.** The constellation is now one component rendering five zoom
levels, dark is the base theme, the three enforcement states have shapes of their own, and
`/design` renders the system from the tokens themselves. The two decisions most worth
knowing before touching any of it are the continuous absolute ramp and where the star
models live — both in the decision log above.

**Phase 5 is the research context layer.** The clearest brief for it is already recorded
as a Stage 6 open question: the citation library is admin-shaped. A community member gets
no research context at all, because the only two citations tagged for the role trigger
below 90% and above 95% attendance and the district sits at 93.4% — squarely in the gap. A
board member gets exactly one. The library was written for views that describe a student
or a classroom, and the outermost layer has almost nothing to say through it. Phase 5 either
adds public-facing claims or the role tags are decorative.

**If you would rather close a gap than start a phase**, the strongest candidate is still
the first Phase 3 open question: a nurse and a counselor hold permissions describing a job
the app has no view for. A caseload view — *the students at my building, filtered to the
stream I am responsible for* — would give two of the ten roles a real home. Phase 4 made
the nurse's landing page honest rather than empty, but honest about an absence is still an
absence.

Four things about the code that are easy to get wrong:

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
  not transform JSX. That is why the star vocabulary is in `ui/stars.ts` and why
  `views/constellations.ts` writes its runtime imports with explicit `.ts` extensions.

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
no test framework and nothing to install. 41 tests, and everything covered is covered for
the same reason: its failures are invisible on screen. A guard that wrongly allows renders
a page indistinguishable from one the viewer was entitled to; a suppression rule that never
fires looks identical to one that works; a sky lit on the wrong scale is still a sky, and
nobody ever sees two zoom levels at once. Lint reports 11 `only-export-components`
warnings against a recorded baseline of 12; that count should not grow.

Useful entry points:

- `app/src/ui/stars.ts` — what a star is, and the one function turning a rate into
  brightness. Plain TypeScript so the scale can be tested
- `app/src/ui/Constellation.tsx` — the picture, at any scale, plus `UnlitSky`
- `app/src/views/constellations.ts` — what a star *is* at the classroom, building,
  district, and public levels, as pure functions
- `app/src/ui/theme.css` — every token; dark is the base, light is the single override
- `app/src/views/DesignView.tsx` — the style guide at `/design`, rendered from the tokens
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
