# Supernova — Progress Tracker

Carried across working sessions. Each session appends to the decision log rather than
rewriting it, so the reasoning behind the build stays legible.

---

## Phase Status

| Phase | Status | Session |
|---|---|---|
| **1. Synthetic data generation** | Complete | 2026-08-16 |
| **2. UI / UX build** | Complete — student through board and community | 2026-08-17 |
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

- **Should the teacher comparison be scope-gated before Phase 3?** It is the most
  sensitive surface built so far — named staff, ranked against each other. Phase 2's
  documented stance is that permissions shape views but do not enforce, and a typed URL
  still reaches out-of-scope data, so a guardian can currently open `/school/nova-elementary`
  and read the staff ranking. That was already true of student data; it is more pointed
  here. Worth deciding whether this one section is gated early rather than waiting.
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

- **Why does a board member see less than a member of the public?** The addendum's role
  table gives the board "aggregates only — no school or student identifiers" and the
  community "school-level aggregates only", which puts an elected body governing the
  district on a *stricter* footing than an anonymous visitor. Stage 6 implements the table
  as written, and the two views differ sharply as a result: the public gets three named
  schools and a grade-by-subject breakdown, the board gets district totals and an
  explanation of what is missing. That reads backwards. Either the board's row means
  "aggregates, not individuals" and should say so, or the community's row is too generous.
  This is the highest-value question on the list, because it is the one where the built
  thing looks wrong rather than merely incomplete.
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

---

## Notes for the Next Session

**Phase 2 is complete.** All ten roles land on a built view, and every route in `App.tsx`
renders something real — `ComingLater` is deleted because nothing referenced it any more.

**Phase 3 is permissions enforcement, and Stage 6 sharpened what that means.** The stance
carried through Phase 2 is that permissions shape views but do not enforce, so a typed URL
still reaches out-of-scope data. That is now the most pointed unfinished thing in the app:
`/community` is careful to the point of withholding a grade breakdown from a board member,
and the same account can type `/school/nova-elementary` and read a named staff ranking. The
disclosure work only means something once `withinScope` in `app/src/session/roles.ts` is
actually consulted at the route boundary. It was written against real `scopeIds` precisely
so that closing this is one change rather than thirty.

Read the four Stage 6 open questions before starting — the first one (why a board member
sees less than the public) is a decision about the reference model, not about code, and
Phase 3 will harden whichever answer is standing.

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
no test framework and nothing to install. Only the disclosure rules are covered, because
they are the only logic whose failure is invisible on screen. Lint reports 12 pre-existing
`only-export-components` warnings; that count should not grow.

Useful entry points:

- `app/src/views/StudentView.tsx` — the composed student profile; the family view
  reuses it through `StudentProfileScreen` with a narrower audience
- `app/src/views/student/MasteryConstellation.tsx` — the four star states and how
  records are grouped by subject and unit
- `app/src/session/roles.ts` — roles, permissions, `withinScope` (the Phase 3 hook)
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
