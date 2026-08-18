"""What checking the citation library found, and who has signed off on it.

Separate from `research.py` on purpose. That module says what the claims are;
this one says what happened when somebody went and read the sources. Keeping the
two in one file would let a claim be edited and its review silently keep its old
verdict, which is the failure mode this whole phase exists to close.

-------------------------------------------------------------------------------
A source check is not a sign-off
-------------------------------------------------------------------------------

For six phases the library had one flag with two values, `needs_human_review` and
`verified`, and no way to record anything in between. That is too poor to be
useful, because it collapses two different acts:

  A **source check** asks *does the cited document exist, and does it say what the
  claim says*. It is careful reading. Anyone can do it, including a machine with a
  network connection, and its result is a written finding that someone else can
  disagree with.

  A **sign-off** asks *is this claim fit to put in front of a school board*. That
  is a judgement about educational research, and it has to be made by a named
  person with standing to make it, who is thereafter accountable for it.

`verified` is the second thing. It cannot be produced by doing more of the first.
So the two are stored separately, `verified` is reachable only through a
`signOff`, and `statusOf` below derives the status from both rather than storing
it as a third editable field that can drift out of agreement with them.

The practical consequence is the one worth stating: the source check recorded here
is thorough and it moves nothing to `verified`. Every claim in this library is
still unsigned, still renders with its `unverified` marker, and still should not
be treated as something this product asserts.

-------------------------------------------------------------------------------
What the 2026-08-18 check found, and what was done about it
-------------------------------------------------------------------------------

The first pass found eighteen claims and not one of them clean. Three pointed at a
document their URL no longer reached. Twelve carried a wrong title, year, author
order, or source type. Ten described their source as establishing more than it
does -- and in four of those the `confidenceNote` underneath already carried the
correction, sitting under a claim that contradicted it.

The pattern was the same every time and it was not carelessness: the claim was
written as the strong general version, the qualification went in the note, and the
reader of a dashboard reads the claim. So a check has to test the claim sentence
alone, because that is how it is read.

Sixteen were then revised. Most of that needed no research judgement -- a title, a
year, an author order, an intensifier the source does not use, a clause struck.
Three could not be fixed by editing:

  `cite-attendance-02` had no source at all, and now cites Keppens 2023 on the
  timing of absence within the school year. The claim states that finding rather
  than the key-instruction-day mechanism nothing was ever found to support; the
  app's figure is still which days carried new instruction, and the note says the
  source does not answer that narrower question.

  `cite-variation-01` claimed a result Rivkin, Hanushek and Kain do not publish.
  It now states what they do: teacher effects are large and poorly predicted by
  credentials. Same source, different sentence.

  `cite-services-01` was worded as an empirical finding over a statute. It is now
  the legal requirement, which is what §1412(a)(5) contains and is honest context
  for a caseload besides.

Every claim was then rechecked against the wording it now has, which is why every
entry below records both a verdict and the sentence it is a verdict about. All
eighteen are `source_checked`. **None is verified**, and that is the point: this
was reading, and reading does not sign anything.

The full findings, with the sources consulted and what each decision was, are in
`docs/supernova-research-review.md`.

-------------------------------------------------------------------------------
What a sign-off licenses
-------------------------------------------------------------------------------

Carried open from Phase 5, and left open through the revisions because it blocks
nothing until somebody wants to sign. Decided here.

**A sign-off licenses exactly one thing: the claim stops being marked unverified,
and is marked with who reviewed it instead.** That is the whole of it, and the
narrowness is the decision rather than an omission.

The marker is *replaced*, not removed. An unsigned claim reads `source checked`;
a signed one reads `reviewed`, and names the reviewer and their standing on
inspection. Silence was available and is wrong for the reason this project keeps
rediscovering: a signed claim and a claim whose marker somebody forgot to render
would look identical, which is the failure that hid four untagged roles for four
phases and eighteen unread sources for six. A protection that never announces
itself is not thereby present.

Three things a sign-off explicitly does **not** license.

**It does not license dropping the `confidenceNote`.** The note is not a hedge
about review status; it is a statement about what the research can bear. "Association,
not causation" does not stop being true because a professor agrees the claim is
well sourced, and correlational evidence does not become causal by being read
carefully. Treating the note as provisional is the exact error that produced this
library's original state, where the note carried the qualification the claim
should have carried. A verified claim renders its note, and there is a test.

**It does not license widening the audience.** Who sees a claim is decided by
`applicableRoles` and by the rule that a claim may only trigger on a figure the
viewer could be shown directly. Coupling audience to review status would make
signing a way to unlock the school board, which is an incentive nobody should be
handed, and would sort the board's library by review status rather than by what
bears on the figures in front of them.

**It does not cover the trigger.** `triggerConditions` carries no authority from
the source and never did -- that is stated at the top of `research.py` and printed
on `/research`. Signing `cite-behavior-02` is agreeing that the Center on PBIS
says what the claim says. It is not agreeing that 25 referrals per 100 students is
a lot. The thresholds need a different review by different people, and none has
happened.

-------------------------------------------------------------------------------
And it does not last forever
-------------------------------------------------------------------------------

A signature is on a sentence, sourced a particular way, at a particular time. All
three can move, so all three void it:

1. **Reword the claim** and the sign-off is `stale`. Already enforced through
   `claimChecked`.
2. **Change the source record** -- repoint the URL, correct the title, change the
   year -- and the sign-off is `stale` too. `sourceChecked` fingerprints the
   record the reviewer was looking at. Without it a claim could be quietly moved
   onto a different document while keeping a signature given for the old one,
   which is the same hole as the first in a different field.
3. **Pass `reviewBy`** and the sign-off is `lapsed`, and the unverified marker
   comes back. The signer chooses that horizon and it is required, because a
   signature with no expiry is one nobody ever revisits. The right horizon is not
   a constant: a 2013 cognitive-psychology monograph does not rot, and three of
   these sources are living webpages that are revised without notice.

`lapsed` is the one status that depends on the date it is asked about, so
`statusOf` takes `as_of`. The generator stamps the status as of generation and the
app recomputes it against today, which means the two legitimately disagree once a
review lapses. The contract test pins the agreement to the generation date rather
than pretending that cannot happen.
"""

from __future__ import annotations

# The person or process that did the checking. Recorded rather than assumed,
# because "reviewed" with no reviewer is the state this phase found the library in.
SOURCE_CHECK_AGENT = (
    "Automated retrieval and reading pass, not a qualified reviewer. "
    "Every URL requested; DOIs resolved through Crossref; paywalled articles "
    "confirmed through the publisher record, the ERIC catalogue entry, or the "
    "abstract rather than full text. Claims revised on the strength of that "
    "reading and rechecked against their new wording, which is a check marking "
    "its own work and is a reason for a reviewer to read the sources too."
)

SOURCE_CHECK_DATE = "2026-08-18"

# A claim's verdict on whether the source supports the sentence.
#
#   supported   -- the source establishes what the claim says
#   partial     -- part of the claim is established and part is not
#   unsupported -- the source does not establish the claim at all
SUPPORT_VERDICTS = ("supported", "partial", "unsupported")


# The source record a reviewer was looking at, as one readable line.
#
# Written out in each check below rather than computed from the citation, which
# would make it agree with itself always and catch nothing. It is a transcription,
# the same as `claimChecked`: what the checker believed the source to be. The app
# recomputes it from the shipped citation and compares, so a record edited without
# a recheck reads `stale`.
#
# Readable rather than hashed, because somebody diffing this file should be able
# to see which field moved.
_FINGERPRINT_FIELDS = (
    "authorOrOrganization",
    "title",
    "publicationYear",
    "accessedDate",
    "url",
    "sourceType",
)
_FINGERPRINT_SEPARATOR = " | "


def fingerprint(source: dict) -> str:
    """A stable rendering of the source record a check or signature was given for.

    Absent fields are skipped rather than rendered empty. Three of these sources
    carry no `publicationYear`, and a blank between two separators is the kind of
    whitespace that does not survive being reflowed by hand.
    """
    return _FINGERPRINT_SEPARATOR.join(
        str(source[field]) for field in _FINGERPRINT_FIELDS if source.get(field)
    )


def _check(
    *,
    claim: str,
    source: str,
    source_reachable: bool,
    record_accurate: bool,
    support: str,
    finding: str,
    defects: list[str],
) -> dict:
    assert support in SUPPORT_VERDICTS, support
    return {
        "checkedOn": SOURCE_CHECK_DATE,
        "checkedBy": SOURCE_CHECK_AGENT,
        # The sentence this verdict is about. A verdict is a verdict about a
        # sentence, so editing the sentence retires it -- `statusOf` reports
        # `stale` rather than carrying the old conclusion across the edit. This
        # module's docstring claimed that separation prevented exactly that and
        # nothing enforced it until the first round of revisions was written.
        "claimChecked": claim,
        # The source record as it read when it was checked. Repoint the URL or
        # correct the title and the verdict is about a different document, which
        # is `stale` for the same reason rewording the claim is.
        "sourceChecked": source,
        # Does the URL reach the document the record names?
        "sourceReachable": source_reachable,
        # Are author, title, year and source type right?
        "recordAccurate": record_accurate,
        "support": support,
        # One sentence, for display next to the claim at /research.
        "finding": finding,
        # What a reviewer would have to fix or decide. Displayed as a list.
        "defects": defects,
    }


# Keyed by citation id. A claim missing from this map has never been checked,
# which `statusOf` reports as `unreviewed` rather than as an absence of problems.
SOURCE_CHECKS: dict[str, dict] = {
    "cite-attendance-01": _check(
        claim=(
            "Students who miss 10 percent or more of the school year are less "
            "likely to read proficiently and to graduate on time."
        ),
        source=(
            "Attendance Works | "
            "Chronic Absence: The Problem | "
            "2026-08-18 | "
            "https://www.attendanceworks.org/chronic-absence/the-problem/ | "
            "research_organization"
        ),
        source_reachable=True,
        record_accurate=True,
        support="supported",
        finding=(
            "Reworded and rechecked. The source says chronic absence can "
            "translate into difficulty learning to read by third grade and into "
            "not graduating, which is now what the claim says. The intensifier "
            "the source does not use is gone, and the page is cited to an "
            "access date because it carries no publication year."
        ),
        defects=[],
    ),
    "cite-attendance-02": _check(
        claim=(
            "Absences are not interchangeable. When in the school year an "
            "absence falls is associated with how much it costs: absence early "
            "and late in the year tracks more strongly with lower end-of-year "
            "results than the same number of days missed in between."
        ),
        source=(
            "Keppens, G. | "
            "School Absenteeism and Academic Achievement: Does the Timing of the Absence Matter? | "
            "2023 | "
            "https://doi.org/10.1016/j.learninstruc.2023.101769 | "
            "peer_reviewed"
        ),
        source_reachable=True,
        record_accurate=True,
        support="supported",
        finding=(
            "Resourced. The dead ed.gov data story is replaced by Keppens 2023, "
            "which measured 62,841 secondary students and found that unexcused "
            "absence early and late in the school year is more strongly "
            "associated with lower end-of-year results. The claim now states "
            "that finding rather than the key-instruction-day mechanism nothing "
            "was ever found to support."
        ),
        defects=[],
    ),
    "cite-attendance-03": _check(
        claim=(
            "Across states and large urban districts, higher student attendance "
            "goes with higher scores on the national assessment."
        ),
        source=(
            "Ginsburg, A., Chang, H., & Jordan, P. | "
            "Absences Add Up: How School Attendance Influences Student Success | "
            "2014 | "
            "https://www.attendanceworks.org/absences-add-up/ | "
            "research_organization"
        ),
        source_reachable=True,
        record_accurate=True,
        support="supported",
        finding=(
            "Reworded to the study the report actually is: a comparison of "
            "attendance against national assessment scores across states and 21 "
            "large urban districts. The growth language and the matched-schools "
            "language are gone, and the authors are credited in the order the "
            "report credits them."
        ),
        defects=[],
    ),
    "cite-attendance-04": _check(
        claim=(
            "Chronic absence, defined as missing a tenth or more of school "
            "days, tracks achievement and graduation more closely than a "
            "school's average daily attendance, which can sit in a healthy "
            "range while a substantial minority of students are chronically "
            "absent."
        ),
        source=(
            "Attendance Works | "
            "Chronic Absence: The Problem | "
            "2026-08-18 | "
            "https://www.attendanceworks.org/chronic-absence/the-problem/ | "
            "research_organization"
        ),
        source_reachable=True,
        record_accurate=True,
        support="supported",
        finding=(
            "Unchanged and still supported: the arithmetic half is not in "
            "dispute and the outcome half is the source's central argument. The "
            "invented publication year is replaced by an access date."
        ),
        defects=[],
    ),
    "cite-attendance-05": _check(
        claim=(
            "An average attendance rate in the low 90s is consistent with a "
            "large share of absence being concentrated in relatively few "
            "students, because a small number missing many days moves the "
            "average very little."
        ),
        source=(
            "Ginsburg, A., Chang, H., & Jordan, P. | "
            "Absences Add Up: How School Attendance Influences Student Success | "
            "2014 | "
            "https://www.attendanceworks.org/absences-add-up/ | "
            "research_organization"
        ),
        source_reachable=True,
        record_accurate=True,
        support="supported",
        finding=(
            "Unchanged and still supported as framed. The note already said "
            "this is a statement about how averages behave, illustrated by the "
            "source rather than established by it. Author order corrected."
        ),
        defects=[],
    ),
    "cite-health-01": _check(
        claim=(
            "A small number of highly prevalent health problems affect "
            "educational outcomes and fall disproportionately on the same "
            "populations as low achievement: uncorrected vision, asthma, "
            "inattention and hyperactivity, aggression and violence, teen "
            "pregnancy, physical inactivity, and skipped breakfast."
        ),
        source=(
            "Basch, C. E. | "
            "Healthier Students Are Better Learners: A Missing Link in School Reforms to Close the Achievement Gap | "
            "2011 | "
            "https://doi.org/10.1111/j.1746-1561.2011.00632.x | "
            "peer_reviewed"
        ),
        source_reachable=True,
        record_accurate=True,
        support="supported",
        finding=(
            "Reworded to Basch's own seven: uncorrected vision, asthma, "
            "inattention and hyperactivity, aggression and violence, teen "
            "pregnancy, physical inactivity and skipped breakfast. Dental "
            "problems, which are not among them, are gone, and so is the "
            "ranking of causes of absence the paper does not make."
        ),
        defects=[],
    ),
    "cite-behavior-01": _check(
        claim=(
            "Exclusionary discipline removes students from instruction, and the "
            "available evidence does not show that zero tolerance approaches "
            "improve school safety or academic outcomes."
        ),
        source=(
            "American Psychological Association Zero Tolerance Task Force | "
            "Are Zero Tolerance Policies Effective in the Schools? An Evidentiary Review and Recommendations | "
            "2008 | "
            "https://www.apa.org/pubs/reports/zero-tolerance | "
            "peer_reviewed"
        ),
        source_reachable=True,
        record_accurate=True,
        support="supported",
        finding=(
            "Reworded to what the task force concluded, that the available data "
            "tend to contradict the assumptions behind zero tolerance and do "
            "not show improved safety or academic outcomes. The dropout clause, "
            "which is well supported elsewhere and is not what this report is "
            "about, is gone. Full title restored."
        ),
        defects=[],
    ),
    "cite-behavior-02": _check(
        claim=(
            "Schools implementing school-wide positive behavioral interventions "
            "and supports well report reduced use of exclusionary discipline "
            "and improved school climate."
        ),
        source=(
            "Center on PBIS, US Department of Education | "
            "What is PBIS? | "
            "2026-08-18 | "
            "https://www.pbis.org/pbis/what-is-pbis | "
            "research_organization"
        ),
        source_reachable=True,
        record_accurate=True,
        support="supported",
        finding=(
            "Retitled to the page that exists, What is PBIS?, and cited to an "
            "access date because the site's own citation guidance leaves the "
            "year blank. The claim now says what the page says, attributed as "
            "the framework reporting on itself, which the note now states "
            "plainly."
        ),
        defects=[],
    ),
    "cite-engagement-01": _check(
        claim=(
            "Family engagement in schooling is consistently associated with "
            "higher achievement, better attendance, and improved social "
            "outcomes across income levels and backgrounds."
        ),
        source=(
            "Henderson, A. T., & Mapp, K. L. | "
            "A New Wave of Evidence: The Impact of School, Family, and Community Connections on Student Achievement | "
            "2002 | "
            "https://sedl.org/connections/resources/evidence.pdf | "
            "research_organization"
        ),
        source_reachable=True,
        record_accurate=True,
        support="supported",
        finding=(
            "Claim unchanged and supported. The source type is corrected: this "
            "is a narrative synthesis of 51 studies by a research organization, "
            "not a statistical meta-analysis."
        ),
        defects=[],
    ),
    "cite-engagement-02": _check(
        claim=(
            "Homework completion correlates with achievement more strongly at "
            "secondary than at elementary level."
        ),
        source=(
            "Cooper, H., Robinson, J. C., & Patall, E. A. | "
            "Does Homework Improve Academic Achievement? A Synthesis of Research, 1987-2003 | "
            "2006 | "
            "https://doi.org/10.3102/00346543076001001 | "
            "meta_analysis"
        ),
        source_reachable=True,
        record_accurate=True,
        support="supported",
        finding=(
            "Claim unchanged and fully supported. The synthesis found the "
            "correlation much stronger for secondary students in grades 7 "
            "through 12 than for elementary students. The published title's "
            "date range is restored."
        ),
        defects=[],
    ),
    "cite-engagement-03": _check(
        claim=(
            "Practice distributed over time and self-testing are among the "
            "better-supported study techniques across a wide range of subjects "
            "and ages; rereading and highlighting are among the weakest."
        ),
        source=(
            "Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., & Willingham, D. T. | "
            "Improving Students' Learning With Effective Learning Techniques: Promising Directions From Cognitive and Educational Psychology | "
            "2013 | "
            "https://doi.org/10.1177/1529100612453266 | "
            "peer_reviewed"
        ),
        source_reachable=True,
        record_accurate=True,
        support="supported",
        finding=(
            "Supported, and the record was already exact. Practice testing and "
            "distributed practice are the two techniques the monograph rates "
            "high utility; rereading and highlighting are among the low-utility "
            "techniques it singles out because students rely on them so "
            "heavily. Unchanged in Phase 7."
        ),
        defects=[],
    ),
    "cite-mastery-01": _check(
        claim=(
            "Frequent formative assessment with actionable feedback is among "
            "the more effective instructional practices for improving "
            "achievement."
        ),
        source=(
            "Black, P., & Wiliam, D. | "
            "Assessment and Classroom Learning | "
            "1998 | "
            "https://doi.org/10.1080/0969595980050102 | "
            "peer_reviewed"
        ),
        source_reachable=True,
        record_accurate=True,
        support="supported",
        finding=(
            "Supported and correctly hedged, and the record was already exact. "
            "The note carries the caveat that this literature's effect sizes "
            "have been disputed, and the claim avoids citing a number, which is "
            "what that caveat requires. Unchanged in Phase 7."
        ),
        defects=[],
    ),
    "cite-mastery-02": _check(
        claim=(
            "In mathematics, proficiency with whole numbers, fractions, and "
            "particular aspects of geometry and measurement is identified as "
            "the critical foundation for success in algebra."
        ),
        source=(
            "National Mathematics Advisory Panel | "
            "Foundations for Success: The Final Report | "
            "2008 | "
            "https://files.eric.ed.gov/fulltext/ED500486.pdf | "
            "government_report"
        ),
        source_reachable=True,
        record_accurate=True,
        support="supported",
        finding=(
            "Repointed at ERIC accession ED500486, which survives a department "
            "reorganisation as the ed.gov path did not. The claim is now the "
            "panel's Critical Foundations for Algebra, stated as the "
            "mathematics finding it is; the compounding clause the panel never "
            "made is gone."
        ),
        defects=[],
    ),
    "cite-evidence-01": _check(
        claim=(
            "An interpretation drawn from an assessment is only as defensible "
            "as the evidence documented to support it; documentation of that "
            "evidence is treated as part of the judgement rather than as a "
            "record-keeping afterthought."
        ),
        source=(
            "American Educational Research Association, American Psychological Association, & National Council on Measurement in Education | "
            "Standards for Educational and Psychological Testing | "
            "2014 | "
            "https://www.testingstandards.net/ | "
            "other"
        ),
        source_reachable=True,
        record_accurate=True,
        support="supported",
        finding=(
            "Source type corrected to other: a professional standard agreed by "
            "three associations is not peer-reviewed research. On reachability, "
            "the URL is the document's official home and the 2014 edition is a "
            "book that is not free anywhere, which is the right citation target "
            "for a book rather than a broken link. A reviewer who disagrees "
            "should say so, and should ask for a chapter and standard number "
            "besides."
        ),
        defects=[],
    ),
    "cite-variation-01": _check(
        claim=(
            "Teachers differ substantially in their effect on reading and "
            "mathematics achievement, and little of that difference is "
            "explained by observable characteristics such as degrees or years "
            "of experience."
        ),
        source=(
            "Rivkin, S. G., Hanushek, E. A., & Kain, J. F. | "
            "Teachers, Schools, and Academic Achievement | "
            "2005 | "
            "https://doi.org/10.1111/j.1468-0262.2005.00584.x | "
            "peer_reviewed"
        ),
        source_reachable=True,
        record_accurate=True,
        support="supported",
        finding=(
            "Reworded to what Rivkin, Hanushek and Kain report: teacher effects "
            "on reading and mathematics achievement are large, and little of "
            "the variation is explained by observable characteristics such as "
            "degrees or experience. The within-school against between-school "
            "comparison, which is their identification strategy and not a "
            "result they publish, is gone."
        ),
        defects=[],
    ),
    "cite-interruptions-01": _check(
        claim=(
            "Time allocated for instruction and time students spend engaged in "
            "learning are not the same thing, and the amount of time scheduled "
            "has little relationship to achievement on its own."
        ),
        source=(
            "Aronson, J., Zimmerman, J., & Carlos, L. | "
            "Improving Student Achievement by Extending School: Is It Just a Matter of Time? | "
            "1999 | "
            "https://files.eric.ed.gov/fulltext/ED435127.pdf | "
            "research_organization"
        ),
        source_reachable=True,
        record_accurate=True,
        support="supported",
        finding=(
            "Reworded to the report's own conclusion: allocated time and "
            "engaged time are not the same, and scheduled time alone has little "
            "relationship to achievement. The claim no longer asserts the "
            "opposite of the note beneath it."
        ),
        defects=[],
    ),
    "cite-services-01": _check(
        claim=(
            "Federal law requires that students with disabilities be educated "
            "with children who are not disabled to the maximum extent "
            "appropriate, and that removal from the regular classroom happen "
            "only where education there with supplementary aids and services "
            "cannot be achieved satisfactorily."
        ),
        source=(
            "US Department of Education, Office of Special Education Programs | "
            "Individuals with Disabilities Education Act, 20 U.S.C. 1412(a)(5): Least Restrictive Environment | "
            "2004 | "
            "https://sites.ed.gov/idea/statute-chapter-33/subchapter-ii/1412/a/5 | "
            "government_report"
        ),
        source_reachable=True,
        record_accurate=True,
        support="supported",
        finding=(
            "Reworded as the legal requirement it is. Section 1412(a)(5) "
            "obliges education with children who are not disabled to the "
            "maximum extent appropriate; it makes no claim about outcomes, "
            "because a statute contains no evidence. Cited to the 2004 "
            "reauthorisation, a date somebody can check."
        ),
        defects=[],
    ),
    "cite-prior-01": _check(
        claim=(
            "Students who change schools frequently show lower achievement, and "
            "schools serving high-mobility populations face particular "
            "difficulty meeting their needs."
        ),
        source=(
            "US Government Accountability Office | "
            "K-12 Education: Many Challenges Arise in Educating Students Who Change Schools Frequently | "
            "2010 | "
            "https://www.gao.gov/products/gao-11-40 | "
            "government_report"
        ),
        source_reachable=True,
        record_accurate=True,
        support="supported",
        finding=(
            "Retitled to the report that exists and reworded to the finding it "
            "reports, that students changing schools frequently show lower "
            "achievement and that high-mobility schools struggle to meet their "
            "needs. The recovery clause, which the GAO does not establish, is "
            "gone."
        ),
        defects=[],
    ),
}

# Sign-offs, keyed by citation id. Empty, and that is the finding.
#
# A sign-off is:
#
#   {
#       "reviewer":    who signed it,
#       "credentials": their standing to, recorded so a signature can be weighed
#                      rather than trusted,
#       "signedOn":    the date,
#       "reviewBy":    when this signature lapses. Required. The signer picks it
#                      from the source's shelf life, not from a house constant.
#       "outcome":     "accepted" or "withdrawn",
#       "note":        optional, and the place to say what they were unsure about.
#   }
#
# Nothing may be written here on the strength of a source check, however thorough
# -- see the module docstring, which also sets out what signing does and does not
# license. In short: the unverified marker is replaced by an attribution, and
# nothing else changes. The confidenceNote stays, the audience stays, and the
# trigger threshold was never covered.
SIGN_OFFS: dict[str, dict] = {}

def statusOf(  # noqa: N802 - matches the emitted field
    citation_id: str, claim: str, source: dict, as_of: str
) -> str:
    """Derive review status from the records rather than storing a third field.

    Stored alongside them at emit time so the dataset is readable without this
    function, and recomputed by the app so the two cannot drift.

    Takes the claim and the source because a verdict is a verdict about a
    sentence, sourced a particular way. Edit either and the verdict is about
    something that no longer exists, which is `stale`.

    Takes `as_of` because a signature has a horizon. Past `reviewBy` it is
    `lapsed` and the unverified marker comes back. This is the one status that
    depends on when it is asked, which is why the date is an argument rather than
    a call to `today()` buried inside.
    """
    check = SOURCE_CHECKS.get(citation_id)
    is_stale = check is not None and (
        check["claimChecked"] != claim or check["sourceChecked"] != fingerprint(source)
    )

    sign_off = SIGN_OFFS.get(citation_id)
    if sign_off is not None and not is_stale:
        if sign_off["outcome"] == "withdrawn":
            return "withdrawn"
        return "lapsed" if as_of > sign_off["reviewBy"] else "verified"

    if check is None:
        return "unreviewed"
    if is_stale:
        return "stale"
    if (
        not check["sourceReachable"]
        or not check["recordAccurate"]
        or check["support"] != "supported"
    ):
        return "revision_required"
    return "source_checked"


def review_for(citation_id: str, claim: str, source: dict) -> dict:
    """The review record attached to a citation at emit time.

    Status is stamped as of the check date rather than as of the moment the
    generator runs, so a regeneration is deterministic. A lapse that happens
    between generations is caught by the app, which asks the same question about
    today.
    """
    return {
        "status": statusOf(citation_id, claim, source, SOURCE_CHECK_DATE),
        "sourceCheck": SOURCE_CHECKS.get(citation_id),
        "signOff": SIGN_OFFS.get(citation_id),
    }
