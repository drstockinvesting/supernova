# Supernova — Alpha Walkthrough

A guided tour of everything built through Phase 7, in the order the product was built:
from one student outward to the school board. Every station names an account to sign in
as, a URL, what to look at, and — usually the more interesting half — what is deliberately
**not** on the page.

Roughly 50 minutes end to end. The **Short path** (stations 1, 2, 3, 6, 10) is about 15
minutes and still shows the two ideas the product turns on: the fractal, and absence as a
design decision.

---

## Before you start

```bash
npm --prefix app install
```

```bash
npm --prefix app run dev
```

Open <http://localhost:5173>. Three things to know about the shell before you begin:

- **The control in the top right is the account switcher.** It lists all 2,101 real
  accounts in the district, grouped by role, with a search box. Everything in this
  walkthrough is "sign in as X" — that control is how. Search matches display name or
  username.
- **The account you pick is remembered** in `localStorage` under `supernova.activeUserId`.
  If the app opens somewhere unexpected, that is a previous session, not a bug. Clearing
  site data resets it to the default student.
- **Auto / Sky / Paper** switches the theme. Dark is the base — the product's claim is that
  mastery is light against dark — and Paper is a real alternate for print and projectors.
  Worth flipping once at any station. The constellation panel stays dark in both, on
  purpose.

A note on what you are looking at: every student in this dataset is synthetic. 1,102
students across three schools and three school years, generated deterministically from one
seed. No real record appears anywhere.

---

## Station 1 — The student profile

**Sign in as:** Trevor Mancini (student) · `tmancini0001`
**Lands on:** `/student/stu-con-0001`

This is the atom. Every other view in the product is an aggregate of this page, which is
why it was built first.

Trevor is a grade 9 high achiever with a chronic health condition: 63.4% mastery, 88.0%
attendance, and a chronic-absence flag. He is the case the product exists to make legible —
a student whose attendance figure and whose learning figure say opposite things, and where
a single letter grade would have to pick one.

**Look at:**

- **The constellation.** One star is one standard. Brightness is not a grade and not a
  ranking against classmates — it is the share of evidence collected for that standard that
  demonstrates mastery. A dim star means *not yet demonstrated*, and the page will tell you
  which of those is "not yet taught."
- **Click a star.** You get the standard, its mastery state, and the actual evidence
  artifacts behind it. Trevor has 200 artifacts on record this year. The claim the product
  makes is that a mastery judgement should always be one click from the work that justifies
  it.
- **By subject**, below the sky, and the attendance timeline underneath that.
- **The research context panel at the bottom of the page.** Trevor's own account triggers
  two claims. Read the note under each claim — it says what the research can bear, not who
  checked it — and the grey marker at the bottom of each, which reads *source checked*.
  Station 10 is about what that marker means and does not mean.

**Notice what is not here:** no behaviour panel, no health panel, no family-engagement
panel. A student account holds `view_individual_students`, `view_attendance_detail`, and
`view_evidence_artifacts` — and nothing else. Those layers are not greyed out or shown
empty. They are absent, because a count of what is being withheld from you is a disclosure
of it.

---

## Station 2 — The same child, as a parent

**Sign in as:** Aisha Mancini (parent or guardian) · `amancini1`
**Lands on:** `/family`

The same student, one permission set over. Aisha holds everything Trevor holds plus
`view_student_names`.

**Do this:** put the two pages side by side, or flip between the accounts. The family view
adds the guardian's framing and the contact history; it does not add behaviour, health, or
special services, because a guardian in this district does not hold those permissions.

**Then look at the research panel again.** As a guardian it fires **four** claims where
Trevor's own account fired two. This is the subtle part of the permission model and worth a
minute: a claim fires *because a figure crossed a threshold*, so the presence of a claim on
the page publishes that the figure crossed it. The bag of metrics handed to the research
layer is built from what this account may see, not from what the record holds. If it were
not, a guardian who cannot open the behaviour panel would learn from a triggered citation
that their child had been suspended.

Note the last line of the panel: *"1 further claim bears on these figures and is not shown
here."* The layer shows three and counts the rest — in the order somebody typed the library
in. Hold that thought until Station 10.

---

## Station 3 — The refusal

Still signed in as Aisha Mancini. Type another family's child into the address bar:

```
http://localhost:5173/student/stu-con-0042
```

You land back on `/family` with one line: *"That page is outside what this account covers,
so this is your view instead."*

That is the whole message. Not *"Kamala Navarro is not your child"* — which would confirm
the id belongs to somebody — and not a 403 page that lists what you would need. It reports
the boundary and nothing about the other side of it.

This is Phase 3's contribution and it is worth knowing what came before it: through Phase 2,
permissions *shaped* views without enforcing them. A view rendered only what the viewer's
scope contained, but a typed URL still reached data outside it. Every route now goes through
one guard that decides on the account's real permission set **and** its real scope, because
neither is sufficient alone — a board member holds district scope over every id in the
district and may open nothing but the public page.

Try a few more. `/district` and `/teacher` both refuse the same way.

---

## Station 4 — The classroom

**Sign in as:** Miguel Whitfield (teacher) · `mwhitfield2`
**Lands on:** `/teacher`

A teacher's home is the index over all their sections rather than the first one, because
most teachers hold four or five and landing on one would silently drop the rest.

Whitfield holds four maths sections spanning 20 points of mastery:

| Section | Mastery |
|---|---|
| Grade 10 Math 3 | 23.9% |
| Grade 12 Math 1 | 33.3% |
| Grade 11 Math 2 | 36.8% |
| Grade 9 Math 4 | 43.9% |

**Open the sky, then open a star.** Here a star is a *classroom*, not a standard. This is
the rule the whole product is built on and Station 6 will show it again two levels up:

> A star is the smallest thing this viewer is allowed to see, and its brightness is the
> share of mastery demonstrated inside it.

So a star is a standard on a student, a student's unit on a classroom, a classroom on a
building and on the district, a grade on the public page, and a whole student on a caseload.
The sky gets coarser as entitlement narrows; it is never replaced by a different kind of
picture. And brightness is **absolute** at every level — never shaded against the
neighbouring stars — because relative brightness would turn a mastery map into a league
table.

**Then open Grade 10 Math 3** (`/section/sec-constellation-high-2024-2025-g10-math-3`), the
weakest of the four. On the section page look for:

- The **unit switcher**, and the standards taught in the selected unit.
- The **key instruction dates** marked on the attendance strip — days a unit flagged as the
  first teaching of a standard. This is the one place in the product where an absence is
  read against *what was being taught that day* rather than counted.
- **Instructional time lost to interruptions**, logged per section.

---

## Station 5 — The caseload, three ways

This station is the best single demonstration in the product, because it is the same page
under three accounts and the differences are not cosmetic.

Sign in as each of these in turn. All three land on
`/caseload/constellation-high`, all three cover the same 434 students.

| Account | Role | Streams held |
|---|---|---|
| Miranda Crawford · `mcrawford39` | Nurse | Attendance, Health |
| Thomas Giordano · `tgiordano40` | Special education teacher | Attendance, Behaviour, Special services |
| Reginald Castellanos · `rcastellanos38` | Counselor | All four |

**A stream is a permission, not a role.** The page is assembled from what the account
holds. The nurse has no behaviour column — not empty, not greyed, *not there* — and the
special education teacher has no health column at all. The counselor has both. Nobody is
told what the others can see.

**What to look at on each:**

- **The priority filter, which defaults on.** The full list for Castellanos is 269 of 434
  students; the priority list is 158. At Nova Elementary the counselor's full caseload is
  230 of 366 — a list that long is a directory, and the filter is the only thing standing
  between this page and uselessness.
- **The rule, printed on the page.** Every threshold that put a student on the list is named
  in the interface so it can be argued with. Read it. Then read Station 10, which is about
  how well those numbers actually hold up.
- **The sky.** Here a star is one child, and its brightness is that child's own share of
  standards mastered. Nothing on this page averages them, and nothing sorts children by
  severity.

**One piece of history worth knowing:** these three accounts had no page at all until Phase
6. Worse, a special education teacher holds *building* scope rather than sections, so the
teacher's classroom index was refusing them, redirecting them home, and landing on the
branch that reports an account with no dashboard it can open. Three accounts read an
accurate error message that concealed a missing view for three phases.

---

## Station 6 — The building

**Sign in as:** Joshua Gibson (building administrator) · `jgibson1`
**Lands on:** `/school/constellation-high`

The first view where you are looking at people in aggregate rather than at people.

**Look at:**

- **Where to look first** — the prose block near the top. It does the reading for you:
  whether the building's own figure or the *spread beneath it* is the thing with something
  to act on. At Nova the building sits within 0.7 points of the district while its
  classrooms span 18.6 points, and the panel says so in words.
- **The sky**, where a star is now a classroom, grouped by grade.
- **By teacher**, and the sentence under it: *"This ranks classes, not teaching."* A
  teacher's rate here is the mastery of the students assigned to them, and rosters are not
  equivalent. That caveat is load-bearing and it is printed on the page rather than left to
  the reader.
- **The link to this building's caseload** at the top — the same students you just saw as
  students. This is the two halves of a building, and they are separate routes decided by
  *opposite* permission pairs: `/school` requires `view_aggregate_mastery`, `/caseload`
  requires `view_individual_students` and deliberately not aggregates.

Try `/caseload/constellation-high` as Gibson: a building administrator holds every stream,
so this works and shows all four.

---

## Station 7 — The district

**Sign in as:** Miranda Martinez (district administrator) · `mmartinezd1`
**Lands on:** `/district`

Same picture, one zoom out: three schools, 1,102 students, 39.4% mastery of standards
taught to date, 93.4% attendance, 14.9% chronic absenteeism, 558 discipline referrals.

**Look at:** the spread figures. Schools differ by 1.1 points of mastery. Grades differ by
10.3. Individual classrooms differ by 34.7. The district's headline number is the least
informative figure on its own page, and the layout is built to say so.

---

## Station 8 — The board, and the public

**Sign in as:** Hannah Lopez (school board member) · then Community Member.
**Both land on:** `/community`

Both accounts hold exactly one permission: `view_aggregate_mastery`. They read the same
figures — which was a deliberate reversal. Through Phase 2 the board saw *less* than the
public: no named buildings, no grade breakdown, on a literal reading of a role table. The
rule now applied is that the board's limit is individuals, not buildings.

**What the board gets that the public does not** is the panel at the bottom: **How these
figures are disclosed.** A governing body asked to act on a mastery rate cannot get from the
number how the number was made, which cells were withheld, and what a reader could work back
to anyway. So that panel names each rule and its *state* — because "in force" and "in force
and it has actually done something" are different things to govern under.

Read the small-cell suppression rule carefully. The threshold is 10 students; the smallest
grade cell in this district holds 59. **The suppression machinery has never fired here**,
and the panel says so rather than presenting an untested protection as a working one.

As the community member, note the sky: a star is now a *grade*, the coarsest the fractal
gets, and no building card links anywhere. Out-of-scope material has no affordance rather
than a refusal message.

---

## Station 9 — The design system

**Open:** `/design` — no sign-in required, from any account.

Every swatch on this page reads the same custom property the app reads, so the page breaks
when a token drifts rather than quietly disagreeing with the product. Worth two minutes for
the mastery ramp and the evidence-strength steps, which are the two encodings every view in
the product reuses.

Flip **Sky / Paper** while you are here. Light is a first-class alternate, not a
concession — and the constellation stays dark in both.

---

## Station 10 — The research library, and what to be skeptical about

**Open:** `/research` — also outside the permission guard, and for a stronger reason than
`/design`. The library is published research plus the rules for showing it. An audit only
insiders can open is not an audit.

This page is the most honest surface in the product and the one to read slowly.

**What it tells you:**

- 18 claims, 8 topics, **18 unsigned**.
- Phase 7 opened all 18 sources, which nobody had done before. Not one claim came through
  clean: three URLs no longer reached the document they named, twelve records carried a
  wrong title, year, author order or source type, and ten claims described their source as
  establishing more than it does.
- All sixteen faults were then revised — and every claim still carries the unverified
  marker. That is the point of the phase: **a source check is not a sign-off.** Checking is
  reading, which anyone careful can do. Signing is a named person putting their standing
  behind a claim in front of a school board. No amount of the first adds up to the second.
- The **What each role sees** table is measured, not asserted. It is there because the
  library was once near-silent and nobody knew: four of ten roles had no claim tagged for
  them at all, and a student got no research context on their own page 1,102 times out of
  1,102.

### The part that has had no review at all

The page states it plainly: *"Nobody has reviewed the thresholds."* A claim and its trigger
are two different kinds of statement. The claim is what the source says. The trigger — "show
this when referrals exceed 25 per 100 students" — is an editorial judgement that carries no
authority from the source, and signing the claim would never cover it.

Measured against this district's own figures — every one of the 1,102 students, 252
classrooms, 72 teacher rollups, three buildings and the district that the app actually builds
a research bag for — **seven of those measurements fall outside any band a trigger could be
doing work in.** There is now a test that measures this, at
[app/src/ui/thresholds.test.ts](../app/src/ui/thresholds.test.ts); the numbers below are its
output, not an estimate.

**Triggers that describe the district instead of dividing it:**

| Claim | Trigger | Fires on |
|---|---|---|
| Interruptions cost instructional time | minutes lost above 120 | **252 of 252** classrooms and **72 of 72** teachers. The quietest classroom in the district lost 173 minutes; the median lost 472. The threshold is below the floor of the distribution |
| Documented evidence | above 20% of standards with no evidence | **72 of 72** teachers, **245 of 252** classrooms |
| Attendance in the low 90s | between 90% and 95% | **71 of 72** teachers, and every building and the district |
| PBIS reduces exclusionary discipline | above 25 referrals per 100 | **71 of 72** teachers — the district averages 50.6 and the median classroom 45 |

A citation that fires on every page is a footer with a footnote, and it reads to a
stakeholder exactly like a finding about the page they are on.

**And one at the far end.** "Higher attendance goes with higher scores" needs group
attendance *above 95%* — reached by one teacher, no building, and 29 of 252 classrooms. It is
the only positively-framed claim in the library, and it is tagged to the board and the
community, who read district figures and **so will never meet it at all**. Their library is
five permanent concerns and one encouragement they cannot reach.

**Two pairs and one nesting.** Two claims fire on chronic absence above 10% with nested role
lists, so the health claim has never once appeared on its own — a nurse, whose whole library
is those two, meets both or neither. Two more share an identical homework trigger. And the
two evidence claims sit on the same metric at 20% and 25%, so the stricter is a strict subset
of the wider. The panel shows three claims and counts the rest, in the order somebody typed
the library in.

**Two student-scale triggers that barely divide anything.** "Absences are not
interchangeable" fires on any absence on any key instruction day — 770 of 1,102 students,
evenly across all three schools. "Prerequisite gaps" fires below 60% prior-year mastery,
against a district median of 48%, so it fires for 593 of the 802 students who have a prior
year at all.

**Well-placed, for contrast:** attendance below 90% fires on 164 students — 14.9%, agreeing
exactly with the district's own chronic-absence count, and it is the one threshold taken from
an external definition rather than read off these figures. Suspensions above zero: 82
students. The IEP and transfer flags involve no threshold judgement at all.

The same admission applies to the caseload thresholds printed on the Station 5 page, which
have their own test at
[app/src/views/caseload/thresholds.test.ts](../app/src/views/caseload/thresholds.test.ts).
Five of the seven hold up. One does not: **8 late arrivals** sits exactly on the maximum
value in the dataset. All 58 students it catches have precisely 8, not one is above it, and a
threshold of 9 would name nobody — so the rule is reading the top of the generator's range
rather than a lateness pattern somebody recognised. A real district, where a student can be
late thirty times, would not behave anything like this. **5 health-office visits** is thin
rather than broken: 13 students district-wide, with four of them above the line.

The list sizes are pinned by the same test, and they are the argument for the priority filter
defaulting on: at Constellation High a counselor's priority list is 158 students and the full
caseload is 269, out of 434.

None of this is settled by opening another source. It needs a different kind of review by
different people, and it has not happened.

---

## Appendix A — The cast

| Account | Username | Role | Lands on |
|---|---|---|---|
| Trevor Mancini | `tmancini0001` | Student | `/student/stu-con-0001` |
| Aisha Mancini | `amancini1` | Parent or guardian | `/family` |
| Miguel Whitfield | `mwhitfield2` | Teacher | `/teacher` |
| Thomas Giordano | `tgiordano40` | Special education teacher | `/caseload/constellation-high` |
| Miranda Crawford | `mcrawford39` | Nurse | `/caseload/constellation-high` |
| Reginald Castellanos | `rcastellanos38` | Counselor | `/caseload/constellation-high` |
| Joshua Gibson | `jgibson1` | Building administrator | `/school/constellation-high` |
| Miranda Martinez | `mmartinezd1` | District administrator | `/district` |
| Hannah Lopez | `board.lopez1` | School board member | `/community` |
| Community Member | `community` | Community member | `/community` |

Other students worth opening once you have an account that can reach them (any staff account
at Constellation High):

- **`stu-con-0010` Valeria Perez** — 68.5% attendance, 4.9% mastery, 27.2% homework. The
  hardest case in the building, and the one where the most claims fire.
- **`stu-con-0042` Kamala Navarro** — an active IEP with three goals, one marked *needs
  support*, each linked to the mastery records that evidence it. Open it as Giordano
  (services) and then as Crawford (no services at all).
- **`stu-con-0018` Eli Ellison** — a transfer with one year on record and 0.0% prior
  mastery. The page distinguishes *not recorded here* from *not learned*; a naive reading
  would fire a prerequisite-gap warning on every transfer in the district.

## Appendix B — Every route

| Route | Requires | Who lands here |
|---|---|---|
| `/student/:id` | `view_individual_students` + scope on that student | Student, guardian, teachers, caseload roles, administrators |
| `/family` | Guardian assignment | Guardian |
| `/teacher` | Section scope | Teacher |
| `/section/:id` | Scope on that section | Teacher, administrators |
| `/school/:id` | `view_aggregate_mastery` + `view_student_names` | Building and district administrators |
| `/caseload/:id` | `view_student_names` + `view_individual_students`, **not** aggregates | Nurse, special education teacher, counselor, administrators |
| `/district` | District scope | District administrator |
| `/community` | `view_aggregate_mastery` | Board member, community member |
| `/design` | — outside the guard | Anyone |
| `/research` | — outside the guard | Anyone |

## Appendix C — If you only do five things

1. Trevor Mancini's profile, and click a star through to the evidence. (Station 1)
2. The same child as Aisha Mancini, then type another family's child into the URL.
   (Stations 2–3)
3. `/caseload/constellation-high` as the nurse, then as the special education teacher.
   (Station 5)
4. `/community` as the board member, and read the disclosure panel. (Station 8)
5. `/research`, and read what the page says about its own thresholds. (Station 10)
