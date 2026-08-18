# The research review

**Source check completed 2026-08-18. Sixteen claims revised. No claim in this library is
signed off.**

> **Update, later the same day.** The check below was written first and the revisions were
> made against it. Every claim named here has since been reworded, resourced, or had its
> record corrected, and every one has been rechecked against the wording it now has. The
> findings are left as they were written: this document is the argument the revisions rest on,
> and rewriting it to describe the fixed library would destroy the record of what was wrong.
> What each claim says *now* is in `generator/research.py`; what was wrong with it is here.
> A summary of what changed is at the end.

The citation library has carried `reviewStatus: needs_human_review` on all 18 claims since
Phase 1. Phase 5 built the page that makes checking possible; Phase 6 put the claims in front
of three more roles. Nobody had ever opened a source.

This document is the first pass. It is a **source check**, not a sign-off, and the distinction
is the whole point of it: a source check asks *does the cited document exist, and does it say
what the claim says*. A sign-off asks *is this claim fit to put in front of a school board*,
and that is a judgement a named person with standing in education research has to make and be
accountable for. The first can be done by anyone who reads carefully. The second cannot.

So nothing below moves a claim to `verified`. What it does is remove the excuse: every claim
now has a written finding against it, and a reviewer signing one off is agreeing with a
specific argument rather than approving a sentence they have no way to check.

## Method

Every source URL was requested (2026-08-18). DOIs were resolved through Crossref for
author, title, year, journal, and pagination. Publisher paywalls and bot-blocks — Wiley, Sage,
Taylor & Francis, GAO, Attendance Works — return 403 to an automated request while serving the
page to a browser; those were confirmed live and their content checked through the publisher's
own record, the ERIC catalogue entry, or the abstract, and are noted as *content checked
indirectly* where that is what happened.

What the check could not do: read the full text of five paywalled articles. Their metadata is
confirmed exact and their headline findings are confirmed from the abstract or the publisher's
record, which is enough to catch a claim that misattributes a result and not enough to catch
one that misreads a qualification buried at page 40.

## What the check found

**Nothing in the library is clean.** Eighteen claims, and every one of them has at least a
metadata defect. Ten misdescribe what their source establishes. Three point at a document the
URL does not reach.

That is a worse result than expected and it is worth being precise about why it happened,
because the failure is not carelessness. Every claim here is *about a real finding*, most are
sourced to the right literature, and the `confidenceNote` on each was written with real care —
in four cases the note already contains the correction the claim needs, sitting underneath a
claim that contradicts it. What was never done was the last step: reading the source and
checking the sentence against it. The library was assembled from what its author knew to be
broadly true, which is a different activity from citing.

| | Count |
|---|---|
| Source URL does not reach the cited document | 3 |
| Record metadata wrong (title, year, author order, source type) | 12 |
| Claim overstates or misattributes what the source establishes | 10 |
| Claim contradicted by its own `confidenceNote` | 4 |
| Clean on both source and wording | 0 |

---

## Findings, by claim

Each entry gives the sourcing verdict, then the substance verdict, then what a reviewer would
have to decide.

### cite-attendance-01 — chronic absence, reading and graduation

*"Students who miss 10 percent or more of the school year are substantially less likely to read
proficiently and to graduate on time."* — Attendance Works, *Chronic Absence: Research and
Data*, 2018.

**Source:** live, correct publisher, correct page. **`publicationYear: 2018` is invented** —
the page is undated and continuously revised, and citing a living webpage to a fixed year
misrepresents it as a snapshot that can be checked.

**Substance:** supported. The source says chronic absence "can translate into students having
difficulty learning to read by the third-grade… and graduating from high school." The claim's
**"substantially"** is an intensifier the source does not use, and it is doing quiet work: the
source's own figure is roughly four percentage points fewer students proficient in grade 3
reading.

**Decision needed:** drop "substantially", or keep it and cite a source that quantifies. Replace
the year with an access date.

### cite-attendance-02 — missing instruction at first introduction

*"Missing instruction when a skill is first introduced is associated with slower mastery of that
skill than missing an equivalent number of review days."* — US Department of Education, *Chronic
Absenteeism in the Nation's Schools*, 2019.

**Source: dead.** `www2.ed.gov/datastory/chronicabsenteeism.html` 301s to `ed.gov`, which 301s
again to a different page entirely — the department reorganised and the 2019 data story is gone.

**Substance: not supported.** The page that now sits at the end of that redirect chain is about
chronic absenteeism generally and says nothing about when in a unit the absence falls. The
`confidenceNote` predicted this exactly — *"the specific key-instruction-day effect is a
reasonable inference that should be verified against a direct source"* — and the claim shipped
anyway.

**This is the most consequential finding in the review.** `cite-attendance-02` is the only
research claim the product shows to a student about their own attendance, chosen in Phase 5
precisely because it was the actionable, non-punitive half of the subject. It is unsourced.

**Decision needed:** find a direct source for the key-instruction-day effect, or withdraw the
claim — which would return a student's own page to having nothing to say about attendance, and
that is a product decision, not a citation decision.

### cite-attendance-03 — schools above 95 percent

*"Schools sustaining attendance rates above 95 percent tend to show stronger achievement growth
than otherwise comparable schools."* — Ginsburg, Jordan & Chang, *Absences Add Up*, 2014.

**Source:** live, year correct. Author order wrong — credited as Ginsburg, Chang, Jordan.

**Substance: overstated on two counts.** *Absences Add Up* compares NAEP scores against
attendance across states and cities. It is cross-sectional score comparison, not **growth**, and
it matches nothing, so **"otherwise comparable schools"** describes an analysis the report does
not perform. Its actual finding is at student level: students who miss more school score lower,
at every age, in every demographic group, in every state tested.

**Decision needed:** restate as a level comparison at student level, or source the school-level
growth claim elsewhere.

### cite-attendance-04 — chronic absence versus average daily attendance

*"Chronic absence… tracks achievement and graduation more closely than a school's average daily
attendance, which can sit in a healthy range while a substantial minority of students are
chronically absent."*

**Source:** as `cite-attendance-01` — live, same invented year.

**Substance: supported**, and it is the best-argued claim in the library. The arithmetic half is
not in dispute and the `confidenceNote` says so; the outcome half is the source's central
argument.

**Decision needed:** the year, and nothing else.

### cite-attendance-05 — an average in the low 90s

*"An average attendance rate in the low 90s is consistent with a large share of absence being
concentrated in relatively few students…"*

**Source:** as `cite-attendance-03` — live, same author-order error.

**Substance: supported as framed.** The `confidenceNote` already says this is a statement about
how averages behave, "illustrated by the source rather than established by it," and that is
accurate. The report does recommend chronic absence over average daily attendance as the
comparison measure, which is the same point.

**Decision needed:** whether a claim whose warrant is arithmetic rather than research belongs in
a *research* library at all. It is honest here; it may belong somewhere else.

### cite-health-01 — health conditions and missed instruction

*"Health conditions such as asthma, vision and dental problems, and unaddressed mental health
needs are consistently found to be among the more common causes of missed instruction…"* —
Basch, *Healthier Students Are Better Learners*, 2011.

**Source:** DOI resolves exactly — Basch, C. E., *Journal of School Health* 81(9), 593–598,
2011. Metadata clean, the only claim in the library of which that is true.

**Substance: drifts from the source's list.** Basch names seven educationally relevant health
disparities: vision, asthma, teen pregnancy, aggression and violence, physical activity,
breakfast, and inattention and hyperactivity. **Dental problems are not among them.** "Unaddressed
mental health needs" is a reasonable gloss on two of the seven but is not how the source frames
them. And Basch argues health affects achievement through several pathways, of which absenteeism
is one — the claim's "among the more common **causes of missed instruction**" is a ranking the
paper does not make.

Separately: this claim's `topic` is `attendance`, because the topic enum has no health value.

**Decision needed:** list the source's seven, or drop the enumeration and keep the general point.

### cite-behavior-01 — exclusionary discipline

*"Exclusionary discipline removes students from instruction and is associated with lower
achievement and higher dropout risk."* — APA Zero Tolerance Task Force, 2008.

**Source:** live and correct. Title truncated — the full title is *Are Zero Tolerance Policies
Effective in the Schools? An Evidentiary Review and Recommendations*, *American Psychologist*
63(9).

**Substance: supported on achievement, thin on dropout.** The task force found the available data
"tend to contradict" the assumptions behind zero tolerance and that such policies are not
associated with improved academics. The **dropout** half is well established in the wider
literature but is not what this report is about.

**Decision needed:** add a source for the dropout link or drop that clause.

### cite-behavior-02 — school-wide PBIS

*"School-wide positive behavioral interventions and supports are associated with reduced office
discipline referrals and improved school climate."* — Center on PBIS, *Positive Behavioral
Interventions and Supports: Evidence Base*, 2022.

**Source: title and year are both wrong.** The URL is live and is the right organisation, but the
page is titled *What is PBIS?* — there is no document called *Evidence Base* at that address.
And the site's own citation guidance reads `Center on PBIS (). Positive Behavioral Interventions
& Supports [Website]`, with the year left deliberately blank, because it is a living page.
**`publicationYear: 2022` was supplied by us.**

**Substance: supported by the page**, which states that schools implementing PBIS well "reduce
their use of exclusionary discipline practices and improve their overall climate." But this is an
advocacy page describing its own framework, not the evidence base the record claims to cite. The
`confidenceNote`'s caveat about implementation fidelity is right and comes from elsewhere.

**Decision needed:** cite the actual evidence base — the Center publishes one — or retitle the
record to what the page is and accept a weaker source type.

### cite-engagement-01 — family engagement

*"Family engagement in schooling is consistently associated with higher achievement, better
attendance, and improved social outcomes across income levels and backgrounds."* — Henderson &
Mapp, *A New Wave of Evidence*, 2002.

**Source:** live, and author, title, year and publisher are all correct. **`sourceType:
meta_analysis` is wrong** — this is a narrative synthesis of 51 studies, not a statistical
meta-analysis, and the distinction is exactly the kind a citation library exists to keep.

**Substance: supported.** The synthesis's own summary is that the evidence of families'
influence is "consistent, positive, and convincing," and the across-backgrounds point is one it
makes explicitly. The `confidenceNote`'s framing of low measured engagement as an access
question rather than a judgement is well made and does not come from the source.

**Decision needed:** the source type.

### cite-engagement-02 — homework at secondary versus elementary

*"Homework completion correlates with achievement more strongly at secondary than at elementary
level."* — Cooper, Robinson & Patall, 2006.

**Source:** DOI resolves exactly — *Review of Educational Research* 76(1), 1–62. Title truncated;
the published title ends *"…A Synthesis of Research, 1987–2003"*.

**Substance: fully supported**, and it is the closest thing to a clean claim in the library. The
synthesis found the correlation "much stronger for secondary students (grades 7 through 12) than
for elementary school students." The `confidenceNote`'s warning against surfacing homework
completion in elementary dashboards follows correctly from it.

**Decision needed:** restore the full title.

### cite-engagement-03 — study techniques

*"Practice distributed over time and self-testing are among the better-supported study
techniques… rereading and highlighting are among the weakest."* — Dunlosky et al., 2013.

**Source:** DOI resolves exactly — *Psychological Science in the Public Interest* 14(1), 4–58.
All five authors correct, title correct, year correct.

**Substance: supported.** Practice testing and distributed practice are the two techniques the
monograph rates high utility; rereading and highlighting are among the low-utility techniques it
singles out precisely because students rely on them.

**Decision needed:** none on sourcing. This claim is ready for a reviewer to sign.

### cite-mastery-01 — formative assessment

*"Frequent formative assessment with actionable feedback is among the more effective
instructional practices for improving achievement."* — Black & Wiliam, *Assessment and Classroom
Learning*, 1998.

**Source:** DOI resolves exactly — *Assessment in Education* 5(1), 7–74.

**Substance: supported, and correctly hedged.** The `confidenceNote` already carries the right
caveat — that the effect sizes from this literature have been disputed and are likely smaller
than the quoted headline figures — and the claim avoids citing a number, which is what that
caveat requires.

**Decision needed:** none on sourcing. Ready for a reviewer.

### cite-mastery-02 — prerequisite skills

*"Prerequisite skills strongly shape readiness for later content; gaps in foundational standards
tend to compound across grade levels."* — National Mathematics Advisory Panel, *Foundations for
Success*, 2008.

**Source: 404.** The `www2.ed.gov` path is gone. The report is real and permanently available as
ERIC ED500486 (`https://files.eric.ed.gov/fulltext/ED500486.pdf`), which is where this should
point — an ERIC accession does not rot when a department reorganises its website.

**Substance: first half supported, second half not stated.** The panel's Critical Foundations for
Algebra is precisely an argument that prerequisites shape readiness. It does not make the
**compounding** argument; that is an extrapolation. The `confidenceNote`'s limit — strongest
evidence in mathematics — is correct and load-bearing, because this claim fires on a mastery
rate across all subjects.

**Decision needed:** repoint the URL; drop or separately source the compounding clause; decide
whether a mathematics-specific finding may fire on an all-subject metric.

### cite-evidence-01 — evidence and defensible interpretation

*"An interpretation drawn from an assessment is only as defensible as the evidence documented to
support it…"* — AERA/APA/NCME, *Standards for Educational and Psychological Testing*, 2014.

**Source: the URL does not reach the cited text.** `testingstandards.net` is the official home of
the Standards and is live, but it is an informational and purchasing page; the 2014 edition is
not free. Only the 1999 edition is downloadable there. **`sourceType: peer_reviewed` is wrong** —
a professional standards document produced by three associations is not peer-reviewed research.

**Substance: supported in substance**, and the `confidenceNote` is unusually good: it says
plainly that this is a professional standard rather than an empirical finding, and that it bears
on how much weight a mastery rate can carry rather than on whether students learned. That is the
correct reading.

**Decision needed:** cite chapter and standard number so the claim is checkable by someone with
the book; change the source type to `other`.

### cite-variation-01 — within-school versus between-school variation

*"Differences in achievement between classrooms within the same school are typically larger than
differences between schools, so schools with near-identical averages can contain substantially
different classrooms."* — Rivkin, Hanushek & Kain, *Teachers, Schools, and Academic Achievement*,
2005.

**Source:** DOI resolves exactly — *Econometrica* 73(2), 417–458. Metadata correct.

**Substance: the claim attributes to this paper a result it does not report.** Rivkin, Hanushek
and Kain estimate a semiparametric **lower bound on the variance of teacher quality**, and they
identify it *from* within-school heterogeneity — using within-school comparison as the
identification strategy, precisely to strip out school-level confounding. They do not decompose
achievement variance into within-school and between-school components and report that the former
is larger. The claim reads the method as if it were the finding.

The `confidenceNote` gets partway there — it says the paper measures test-score gains in one
state and that the variation is not solely a teacher effect — but it does not say that the
comparison the claim makes is absent from the paper.

**This is the most serious misattribution in the library**, and it is not obscure: the claim fires
on `masterySpreadPoints` and is therefore one of the claims a **school board** and the **public**
see. The underlying proposition is defensible and well supported elsewhere; it is not supported
here.

**Decision needed:** resource, or restate as what the paper does show — that teacher effects on
achievement are large and poorly predicted by credentials and experience.

### cite-interruptions-01 — protected instructional time

*"Protected, uninterrupted instructional time is associated with greater learning gains;
fragmentation of instructional blocks reduces effective time on task."* — Aronson, Zimmerman &
Carlos, WestEd, 1999.

**Source:** ERIC ED435127, live and free. Author, title, publisher and year all correct.

**Substance: the first clause runs against the report's headline finding.** The report concludes
that time "exhibits little impact on student performance when considered alone," and that there
is "no consistent relationship between the amount of time allocated for instruction and the
amount of time students spend engaged in learning activities." That supports the *second* clause
— allocated time is not engaged time — and undercuts the first.

The `confidenceNote` already says so: *"Quality of instructional time matters more than raw
quantity; more minutes alone does not produce gains."* **The note contradicts the claim it is
attached to**, and the claim is the sentence a teacher reads.

**Decision needed:** rewrite the claim as the allocated-versus-engaged distinction, which is what
the source actually establishes and is also the more useful thing to tell a teacher looking at
lost minutes.

### cite-services-01 — least restrictive environment

*"Students with disabilities show stronger outcomes when instruction is delivered in the least
restrictive environment appropriate to their needs."* — US Dept of Education OSEP, IDEA §1412(a)(5),
2023.

**Source:** live and correct — it is the LRE statute text.

**Substance: the claim is empirical and the source is a legal mandate.** §1412(a)(5) requires
that children with disabilities be educated with children who are not disabled "to the maximum
extent appropriate." It establishes an obligation. It makes, and can make, **no claim about
outcomes at all** — there is no evidence in a statute.

The `confidenceNote` says "this is a legal standard as much as an empirical finding," which
concedes half of it. The honest version is that it is a legal standard and *not* an empirical
finding, and the claim is worded as the latter.

**Decision needed:** restate as the legal requirement it is — which is genuinely useful context
for the caseload page — or find outcome research and cite that instead. Do not do both in one
sentence.

### cite-prior-01 — student mobility

*"Mobility between schools is associated with short-term achievement disruption, with effects
that typically diminish as students stabilize."* — GAO, *K-12 Education: Student Mobility*, 2010.

**Source: title is wrong.** GAO-11-40 exists, is live, and is from 2010, but it is called
*K-12 Education: Many Challenges Arise in Educating Students Who Change Schools Frequently*.
There is no GAO report called *Student Mobility*.

**Substance: first half supported, second half unsupported.** The GAO found that achievement
"can be negatively affected by… changing schools often." The **recovery** half — that effects
diminish as students stabilise — is not something this report establishes.

That second clause is not decoration. This claim fires on `hasIncompletePriorHistory`, and the
`confidenceNote` builds on it to tell the reader that a sparse record reflects data transfer
rather than the student. The reassurance is doing real work in the product and is currently
uncited.

**Decision needed:** correct the title; source the recovery claim or drop it and rest the
reassurance on the record-transfer point alone, which needs no research at all.

---

## What a reviewer has to decide, beyond the individual claims

Three questions came out of the pass that no single claim answers.

**1. What does a sign-off license?** Phase 5 raised this and it is now concrete. Two claims —
`cite-engagement-03` and `cite-mastery-01` — are sourced correctly, worded within what their
sources establish, and honestly hedged. They are ready for someone to sign. Nobody has said what
signing means: that the claim may be shown without the `unverified` marker, presumably, but also
whether it may then be shown to a school board, whether the hedge may be dropped, and what
happens when the source is superseded.

**2. A living webpage cannot be cited to a year.** Four records cite continuously updated
webpages — Attendance Works twice, PBIS once — and three of them carry a `publicationYear` we
supplied. The record needs an access date and a retrieval note, or those sources need replacing
with dated documents.

**3. Ten of eighteen claims overstate their source, and the pattern is the same each time.**
The claim is written as the strong, useful, general version; the `confidenceNote` underneath
carries the qualification; and the reader of a dashboard reads the claim. In four cases the note
does not merely qualify the claim but contradicts it. Whatever the review process becomes, it has
to check the claim sentence against the source **as a sentence a stakeholder will read alone**,
because that is how it is read.

---

---

## What was done about it

All sixteen were revised the same day. Most needed no research judgement at all — a title, a
year, an author order, an intensifier the source does not use, a clause struck. Three could not
be fixed by editing:

- **`cite-attendance-02`** now cites Keppens (2023), *School Absenteeism and Academic
  Achievement: Does the Timing of the Absence Matter?*, *Learning and Instruction* 86, 101769
  — 62,841 secondary students, finding that absence early and late in the school year is more
  strongly associated with lower end-of-year results. The claim states that. It does not state
  the key-instruction-day mechanism, which nothing was ever found to support; the note says
  plainly that the source measures position in the year while the app's figure marks days
  within a unit, and that the claim is a reason to look at which days were missed rather than a
  measure of what missing them cost. **The student keeps a claim about their own attendance,
  and it is now sourced.**
- **`cite-variation-01`** keeps Rivkin, Hanushek and Kain and states what they report: teacher
  effects on reading and mathematics achievement are large, and little of the variation is
  explained by degrees or years of experience. The within-school against between-school
  comparison — their identification strategy, not a published result — is gone. The claim still
  does its job on a page showing a spread: it says the spread is real and cannot be read off a
  staff roster.
- **`cite-services-01`** is now the legal requirement §1412(a)(5) contains, rather than an
  outcome claim over a statute that contains no evidence about outcomes. That is honest context
  for a caseload in its own right.

Two structural fixes came with them. `source.publicationYear` is now optional and
`source.accessedDate` exists, because three records were citing continuously revised webpages
to a year this repository supplied. And a check now records the claim sentence it was performed
against, so rewording a claim retires the verdict on it — `stale`, not `source_checked`, and
not `verified` either. Without that, these sixteen revisions would have inherited their own
pre-revision findings, which is exactly the failure `review.py` claimed its structure prevented
and did not.

| | Before | After |
|---|---|---|
| Source URL does not reach the cited document | 3 | 0 |
| Record metadata wrong | 12 | 0 |
| Claim overstates what its source establishes | 10 | 0 |
| Clean on both source and wording | 0 | 18 |
| **Signed off by a named reviewer** | **0** | **0** |

## Status

Every claim in this library remains **unsigned**, and the last row of that table is the one
that matters. The rest was reading, and reading is not a signature. The revisions were made by
the same pass that found the problems, which is a check marking its own work and is a reason
for a reviewer to open the sources rather than to take this document's word for it.

The three questions at the top of this section are still open, and the second one is now the
binding constraint: **what a sign-off licenses** has never been decided, and eighteen claims are
now waiting on the answer rather than two.
