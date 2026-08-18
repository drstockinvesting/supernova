# Supernova: The Best and the Brightest

A mastery-based K–12 learning management system prototype. Supernova replaces grades with
evidence-backed mastery mapping, and repeats the same visual language at every zoom level —
from a single lesson to an entire community.

> Supernova reveals and enables the best and brightest in every student, at every level.

See [`docs/supernova-vision.md`](docs/supernova-vision.md) for the full vision.

---

## Current Phase

**Phase 7 complete — the research review.** All seven phases are done: the synthetic
dataset, the dashboards described in
[`docs/supernova-ui-ux-design.md`](docs/supernova-ui-ux-design.md) built on top of it,
permissions enforced at the route boundary, the visual design system, the research the
figures are read against, the caseload the first three phases kept pointing at, and the
review that finally opened the sources.

The interface was built from the inside out — the student profile, then the family view,
then teacher, administrator, and finally the board and community layer. The student profile
is the atom every other view aggregates, so each rollup above it summarises something
already proven. All ten roles land on a page built for them — which became true in Phase 6,
not Phase 2, and the three phases in between did not know it was false.

Through Phase 2, permissions **shaped** views without enforcing them: a view rendered only
what the viewer's scope contained, but a typed URL still reached data outside it. Phase 3
closed that. Every route is now decided by the account's real permission set *and* its real
scope, because neither is sufficient alone — a board member holds district scope over every
id in the district and may open nothing but the public page, while a nurse holds named
students at their building and none of the aggregates that building page is made of. A
refused address returns the viewer to their own dashboard with one neutral line, and nothing
about what was on the other side.

Phase 4 made the fractal real. Until then one view had the constellation and everything
above it was cards and tables; now the same picture is drawn at every zoom level, under one
rule — **a star is the smallest thing this viewer is allowed to see, and its brightness is
the share of mastery demonstrated inside it.** So a star is a standard on a student, a
student's unit on a classroom, a classroom on a building and on the district, and a grade on
the public page — and, since Phase 6, a whole student on a caseload. The sky gets coarser as entitlement narrows; it never gets replaced by
something else. Brightness is absolute at every level, never shaded against the neighbouring
stars, because the alternative turns a mastery map into a league table.

Phase 5 turned the research library from a decoration into a checked contract. It began by
measuring what the library actually showed and finding it near-silent: four of the ten roles
had no claim tagged for them, a student got no research context on their own page 1,102 times
out of 1,102, a community member got none ever, and half the library named a metric no view
supplied and so could never fire at all. The rule that came out of it is that **a trigger has
to survive a change of scale** — a referral count written about one child fired on 558
district referrals, and a district's 93.4% average attendance is not a student who misses a
tenth of the year. Metrics now declare the scale they mean something at, views declare what
they supply, and the test suite fails if a claim names anything else.

Phase 6 built the view the earlier phases kept naming and not making: *the students at my
building, filtered to the stream I am responsible for.* Three roles land on it, and they are
not the same account — a nurse holds attendance and health, a special education teacher holds
attendance, behaviour, and special services and no health at all, a counselor holds all four —
so the page is assembled from the viewer's permissions rather than their role. **A stream is a
permission**, and a stream the account does not hold is *absent*: not greyed, not withheld, not
counted, because a count of what is being kept from you is a disclosure of it.

The route is decided by the opposite permission pair to the building page above it. `/school`
requires `view_student_names`; `/caseload` requires that plus `view_individual_students` and
deliberately not `view_aggregate_mastery` — which is the rule the addendum states, with its two
halves varying independently for the first time. And the sky follows the same rule it always
did: a star is the smallest thing this viewer is allowed to see, so here a star is one child
and its brightness is that child's own share of standards mastered. Nothing on the page
averages them.

The phase also found something nothing had reported. A special education teacher holds *building*
scope rather than sections, so the teacher's classroom index had been refusing them, redirecting
them to their own home, and landing on the branch that reports an account with no dashboard it
can open. Three accounts had been reading an accurate error message that hid a missing view for
three phases.

The design system renders itself at [`/design`](http://localhost:5173/design) — every swatch
reads the same custom property the app reads, so it breaks when a token drifts. The research
library does the same at [`/research`](http://localhost:5173/research): every claim, its
source, the plain-language condition that shows it, and a table of what each role actually
gets. Both are outside the permission guard, because an audit only insiders can open is not
one.

Phase 7 opened all 18 sources, which nobody had done. **Not one claim came through clean:**
three URLs no longer reached the document they named, twelve records carried a wrong title,
year, author order or source type, and ten claims described their source as establishing more
than it does. Four were contradicted by their own confidence note — the claim states the strong
general version, the qualification goes underneath, and the reader of a dashboard reads the
claim. The findings are in
[`docs/supernova-research-review.md`](docs/supernova-research-review.md), and `/research` shows
each one next to the claim it is about.

All sixteen were then revised. Most of that needed no research judgement — a title, a year, an
author order, an intensifier the source does not use, a clause struck. Three did not yield to
editing: a claim with no source at all now cites research on the timing of absence within the
school year; a claim attributing to Rivkin, Hanushek and Kain a result they never published now
states what they do report; and a claim worded as an empirical finding over a statute is now the
legal requirement that statute contains. Rewording a claim retires the verdict on it — a check
records the sentence it was performed against, so a claim edited since it was checked reads
**checked, then edited** rather than carrying a conclusion nobody reached about it.

The phase's architecture is one distinction. **A source check is not a sign-off.** A check asks
whether the cited document exists and says what the claim says — careful reading, which anyone
can do, and whose result is a written finding somebody else can disagree with. A sign-off asks
whether a claim is fit to put in front of a school board, which is a judgement a named person
makes and is accountable for afterwards. Only the second produces `verified`, and no amount of
the first adds up to it. So this phase did thorough work and verified nothing: all eighteen
claims are now sourced correctly and worded within what their sources establish, and all
eighteen still carry the unverified marker, waiting for somebody with standing to sign them.
That is the correct state for them to be in, and there is a test asserting a perfectly checked
claim is still unverified.

**What signing would license was decided too, and narrowly: the marker, and nothing else.** A
signed claim stops reading *source checked* and starts reading *reviewed*, naming who signed it
and what standing they had — replaced rather than removed, because a signed claim and a claim
whose marker somebody forgot to render must not look the same. It would not license dropping
the note beneath the claim, which states what the research can bear and does not become
provisional because a professor read the source. It would not widen who sees the claim. And it
never covered the trigger threshold, which carries no authority from any of this research and
has had no review at all. A signature is void if the claim is reworded or its source record
changes, and lapses on a date the signer chooses, because a monograph does not rot and a living
webpage is revised without notice.

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
