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
What the 2026-08-18 check found
-------------------------------------------------------------------------------

Eighteen claims, and not one of them clean. Three point at a document their URL no
longer reaches. Twelve carry a wrong title, year, author order, or source type.
Ten describe their source as establishing more than it does -- and in four of
those, the `confidenceNote` underneath already carries the correction, sitting
under a claim that contradicts it.

The pattern is the same every time and it is not carelessness: the claim is
written as the strong general version, the qualification goes in the note, and the
reader of a dashboard reads the claim. A review has to check the claim sentence
alone, because that is how it is read.

The full findings, with the sources consulted and what each decision would be, are
in `docs/supernova-research-review.md`. What is recorded here is the verdict and
the sentence a reader of `/research` needs to see next to the claim.
"""

from __future__ import annotations

# The person or process that did the checking. Recorded rather than assumed,
# because "reviewed" with no reviewer is the state this phase found the library in.
SOURCE_CHECK_AGENT = (
    "Automated retrieval and reading pass, not a qualified reviewer. "
    "Every URL requested; DOIs resolved through Crossref; paywalled articles "
    "confirmed through the publisher record, the ERIC catalogue entry, or the "
    "abstract rather than full text."
)

SOURCE_CHECK_DATE = "2026-08-18"

# A claim's verdict on whether the source supports the sentence.
#
#   supported   -- the source establishes what the claim says
#   partial     -- part of the claim is established and part is not
#   unsupported -- the source does not establish the claim at all
SUPPORT_VERDICTS = ("supported", "partial", "unsupported")


def _check(
    *,
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
        source_reachable=True,
        record_accurate=False,
        support="supported",
        finding=(
            "The source says chronic absence can translate into difficulty learning to "
            "read by third grade and into not graduating, which is the claim. It does "
            "not say 'substantially', and its own figure is around four percentage "
            "points fewer students proficient in grade 3 reading."
        ),
        defects=[
            "publicationYear 2018 was supplied by us; the page is undated and "
            "continuously revised, and needs an access date rather than a year.",
            "'substantially' is an intensifier the source does not use.",
        ],
    ),
    "cite-attendance-02": _check(
        source_reachable=False,
        record_accurate=False,
        support="unsupported",
        finding=(
            "The URL is dead and the page at the end of its redirect chain is about "
            "chronic absenteeism generally, saying nothing about when in a unit an "
            "absence falls. The key-instruction-day effect is currently uncited."
        ),
        defects=[
            "www2.ed.gov/datastory/chronicabsenteeism.html redirects twice and the "
            "2019 data story it named no longer exists.",
            "The confidenceNote predicted exactly this and the claim shipped anyway.",
            "This is the only attendance claim a student sees about their own record, "
            "so withdrawing it is a product decision as well as a citation one.",
        ],
    ),
    "cite-attendance-03": _check(
        source_reachable=True,
        record_accurate=False,
        support="partial",
        finding=(
            "Absences Add Up compares NAEP scores against attendance across states and "
            "cities. That is a cross-sectional score comparison at student level, not "
            "achievement growth, and it matches no schools to each other."
        ),
        defects=[
            "'growth' describes an analysis the report does not perform.",
            "'otherwise comparable schools' describes a matching the report does not do.",
            "Authors are credited Ginsburg, Chang, Jordan; the record has Jordan second.",
        ],
    ),
    "cite-attendance-04": _check(
        source_reachable=True,
        record_accurate=False,
        support="supported",
        finding=(
            "The best-argued claim in the library. The arithmetic half is not in "
            "dispute and the note says so; the outcome half is the source's own "
            "central argument for preferring chronic absence to average attendance."
        ),
        defects=[
            "publicationYear 2018 was supplied by us, as with cite-attendance-01.",
        ],
    ),
    "cite-attendance-05": _check(
        source_reachable=True,
        record_accurate=False,
        support="supported",
        finding=(
            "Supported as framed. The note already says this is a statement about how "
            "averages behave, illustrated by the source rather than established by it, "
            "and the source does recommend chronic absence over average attendance."
        ),
        defects=[
            "Author order, as with cite-attendance-03.",
            "A claim whose warrant is arithmetic rather than research may not belong "
            "in a research library at all. It is honest here; it may belong elsewhere.",
        ],
    ),
    "cite-health-01": _check(
        source_reachable=True,
        record_accurate=True,
        support="partial",
        finding=(
            "Basch names seven educationally relevant health disparities: vision, "
            "asthma, teen pregnancy, aggression and violence, physical activity, "
            "breakfast, and inattention and hyperactivity. Dental problems are not "
            "among them, and absenteeism is one pathway he describes rather than a "
            "ranking of causes."
        ),
        defects=[
            "The claim lists dental problems, which the source does not.",
            "'among the more common causes of missed instruction' is a ranking the "
            "paper does not make.",
            "topic is 'attendance' because the topic enum has no health value.",
        ],
    ),
    "cite-behavior-01": _check(
        source_reachable=True,
        record_accurate=False,
        support="partial",
        finding=(
            "The task force found the available data tend to contradict the "
            "assumptions behind zero tolerance and that such policies are not "
            "associated with improved academics. The dropout half is well established "
            "in the wider literature but is not what this report is about."
        ),
        defects=[
            "Title truncated; the published title ends 'An Evidentiary Review and "
            "Recommendations', American Psychologist 63(9).",
            "The dropout clause needs its own source or should be dropped.",
        ],
    ),
    "cite-behavior-02": _check(
        source_reachable=True,
        record_accurate=False,
        support="partial",
        finding=(
            "The page states that schools implementing PBIS well reduce exclusionary "
            "discipline and improve climate, which is the claim. But it is the "
            "framework's own advocacy page, not the evidence base the record names, "
            "and no document called 'Evidence Base' exists at that address."
        ),
        defects=[
            "The page is titled 'What is PBIS?'.",
            "publicationYear 2022 was supplied by us; the site's own citation "
            "guidance leaves the year blank because the page is living.",
            "The implementation-fidelity caveat in the note comes from elsewhere.",
        ],
    ),
    "cite-engagement-01": _check(
        source_reachable=True,
        record_accurate=False,
        support="supported",
        finding=(
            "The synthesis's own summary is that the evidence of families' influence "
            "is consistent, positive and convincing, and the across-backgrounds point "
            "is one it makes explicitly."
        ),
        defects=[
            "sourceType is meta_analysis; this is a narrative synthesis of 51 studies, "
            "not a statistical meta-analysis, and a citation library exists to keep "
            "exactly that distinction.",
        ],
    ),
    "cite-engagement-02": _check(
        source_reachable=True,
        record_accurate=False,
        support="supported",
        finding=(
            "Fully supported. The synthesis found the correlation much stronger for "
            "secondary students in grades 7 through 12 than for elementary students, "
            "which is what the note's warning about elementary dashboards rests on."
        ),
        defects=[
            "Title truncated; the published title ends 'A Synthesis of Research, "
            "1987-2003', Review of Educational Research 76(1), 1-62.",
        ],
    ),
    "cite-engagement-03": _check(
        source_reachable=True,
        record_accurate=True,
        support="supported",
        finding=(
            "Supported, and the record is exact. Practice testing and distributed "
            "practice are the two techniques the monograph rates high utility; "
            "rereading and highlighting are among the low-utility techniques it "
            "singles out because students rely on them so heavily."
        ),
        defects=[],
    ),
    "cite-mastery-01": _check(
        source_reachable=True,
        record_accurate=True,
        support="supported",
        finding=(
            "Supported and correctly hedged. The note already carries the right "
            "caveat, that the effect sizes from this literature have been disputed "
            "and are likely smaller than the quoted figures, and the claim avoids "
            "citing a number, which is what that caveat requires."
        ),
        defects=[],
    ),
    "cite-mastery-02": _check(
        source_reachable=False,
        record_accurate=False,
        support="partial",
        finding=(
            "The panel's Critical Foundations for Algebra is precisely an argument "
            "that prerequisites shape readiness. It does not make the compounding "
            "argument; that is an extrapolation."
        ),
        defects=[
            "The www2.ed.gov path 404s. The report is permanently available as ERIC "
            "ED500486, which does not rot when a department reorganises its site.",
            "The compounding clause needs its own source or should be dropped.",
            "The evidence is mathematics-specific and the claim fires on a mastery "
            "rate across all subjects.",
        ],
    ),
    "cite-evidence-01": _check(
        source_reachable=False,
        record_accurate=False,
        support="supported",
        finding=(
            "Supported in substance, and the note is unusually good: it says plainly "
            "that this is a professional standard rather than an empirical finding, "
            "and that it bears on how much weight a mastery rate can carry rather "
            "than on whether students learned."
        ),
        defects=[
            "testingstandards.net is the official home of the Standards but is an "
            "informational and purchasing page; the 2014 edition is not free there "
            "and the URL does not reach the cited text.",
            "sourceType is peer_reviewed; a professional standards document produced "
            "by three associations is not peer-reviewed research.",
            "No chapter or standard number is given, so nobody holding the book can "
            "check the claim against it.",
        ],
    ),
    "cite-variation-01": _check(
        source_reachable=True,
        record_accurate=True,
        support="unsupported",
        finding=(
            "Rivkin, Hanushek and Kain estimate a semiparametric lower bound on the "
            "variance of teacher quality, identified from within-school heterogeneity "
            "in order to strip out school-level confounding. They do not decompose "
            "achievement variance into within-school and between-school parts and "
            "report the former as larger. The claim reads the method as the finding."
        ),
        defects=[
            "The comparison the claim makes is absent from the paper.",
            "The claim fires on masterySpreadPoints, so it is one of the claims a "
            "school board and the public see.",
            "The proposition is defensible and well supported elsewhere; it is not "
            "supported here.",
        ],
    ),
    "cite-interruptions-01": _check(
        source_reachable=True,
        record_accurate=True,
        support="partial",
        finding=(
            "The report concludes that time exhibits little impact on performance "
            "when considered alone, and that there is no consistent relationship "
            "between time allocated for instruction and time students spend engaged. "
            "That supports the claim's second clause and undercuts its first."
        ),
        defects=[
            "The confidenceNote contradicts the claim it is attached to, and the "
            "claim is the sentence a teacher reads.",
            "The allocated-versus-engaged distinction is what the source establishes "
            "and is also the more useful thing to tell a teacher reading lost minutes.",
        ],
    ),
    "cite-services-01": _check(
        source_reachable=True,
        record_accurate=True,
        support="unsupported",
        finding=(
            "Section 1412(a)(5) requires that children with disabilities be educated "
            "with children who are not disabled to the maximum extent appropriate. It "
            "establishes an obligation and makes no claim about outcomes, because "
            "there is no evidence in a statute."
        ),
        defects=[
            "The claim is worded as an empirical finding and the source is a legal "
            "mandate. The note concedes half of this by saying it is a legal standard "
            "'as much as' an empirical finding.",
            "Restating it as the legal requirement would be genuinely useful context "
            "for the caseload page. Doing both in one sentence is what went wrong.",
        ],
    ),
    "cite-prior-01": _check(
        source_reachable=True,
        record_accurate=False,
        support="partial",
        finding=(
            "The GAO found achievement can be negatively affected by changing schools "
            "often. The recovery half, that effects diminish as students stabilise, "
            "is not established by this report."
        ),
        defects=[
            "There is no GAO report called 'Student Mobility'. GAO-11-40 is titled "
            "'K-12 Education: Many Challenges Arise in Educating Students Who Change "
            "Schools Frequently'.",
            "The recovery clause is not decoration: the note builds on it to reassure "
            "a transfer student, and that reassurance is currently uncited.",
        ],
    ),
}

# Sign-offs, keyed by citation id. Empty, and that is the finding.
#
# A sign-off is `{"reviewer", "credentials", "signedOn", "outcome", "note"}` where
# outcome is "accepted" or "withdrawn". Nothing may be written here on the
# strength of a source check, however thorough -- see the module docstring.
SIGN_OFFS: dict[str, dict] = {}


def statusOf(citation_id: str) -> str:  # noqa: N802 - matches the emitted field
    """Derive review status from the two records rather than storing a third.

    Stored alongside them at emit time so the dataset is readable without this
    function, and recomputed by the app's test suite so the two cannot drift.
    """
    sign_off = SIGN_OFFS.get(citation_id)
    if sign_off is not None:
        return "withdrawn" if sign_off["outcome"] == "withdrawn" else "verified"

    check = SOURCE_CHECKS.get(citation_id)
    if check is None:
        return "unreviewed"
    if (
        not check["sourceReachable"]
        or not check["recordAccurate"]
        or check["support"] != "supported"
    ):
        return "revision_required"
    return "source_checked"


def review_for(citation_id: str) -> dict:
    """The review record attached to a citation at emit time."""
    return {
        "status": statusOf(citation_id),
        "sourceCheck": SOURCE_CHECKS.get(citation_id),
        "signOff": SIGN_OFFS.get(citation_id),
    }
