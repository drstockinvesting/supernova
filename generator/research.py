"""Research citation library for the context layer.

Every dashboard in the UI/UX design pairs data with research-backed context.
Storing those claims as records rather than hardcoding sentences into components
means the same claim renders identically at every zoom level and its sourcing is
auditable.

IMPORTANT -- review status. The vision documents commit to being
"research-grounded" and "accountable, not punitive." A citation library that
overstates correlational findings as causal would undercut both. Every entry here
carries a `confidenceNote`, and every entry is stated in deliberately
correlational language for that reason.

None of it should reach a stakeholder-facing view until a human has confirmed the
source says what the claim says. **Nobody has.** The review record lives in
`review.py` and is attached to each citation below at import time; a claim added
here without one is reported as `unreviewed` rather than as unproblematic.

The first source check ran on 2026-08-18 and found no clean claim in the library:
three URLs that no longer reach the document they name, twelve records carrying a
wrong title, year, author order or source type, and ten claims describing their
source as establishing more than it does. Four of those are contradicted by their
own `confidenceNote`. The findings are in `docs/supernova-research-review.md`, and
they are a source check rather than a sign-off -- see `review.py` for why those
are different acts and why only the second one produces `verified`.

-------------------------------------------------------------------------------
A trigger threshold is not a finding
-------------------------------------------------------------------------------

`claim` is what the source says. `triggerConditions` is an editorial decision
about when the claim is worth putting in front of somebody, and it carries no
authority from the source at all. "Discipline referrals above 25 per 100
students" is not a number the PBIS literature endorses; it is a judgement that
below that, showing the claim is noise. The two live in one record and are easy
to read as one statement, so `/research` labels them separately and this note
exists to be quoted there.

-------------------------------------------------------------------------------
A trigger must survive a change of scale
-------------------------------------------------------------------------------

Phase 5 opened by measuring what this library actually showed, and the answer was
close to nothing. Four of the ten roles were tagged on no claim at all; a student
got no research context on their own page, 1,102 times out of 1,102; a community
member got none, ever; and a school board member got exactly one -- `behavior-02`,
which fired because the district logged 558 referrals and 558 is greater than the
threshold of 3 that had been written with one child in mind.

Two rules came out of that, and every trigger here now obeys them:

1. **Counts do not travel.** A threshold over a count is a threshold over the size
   of the thing counted. Aggregate claims trigger on rates -- referrals per 100
   students, the share of students chronically absent -- and count triggers are
   reserved for a single student, where the count means something.

2. **Neither do individual-level rates.** "Students who miss 10 percent or more of
   the school year" is a claim about people, and a district averaging 93.4%
   attendance says nothing about how many of them there are. A district's average
   attendance is essentially never below 90, so a claim keyed to it is dead on
   every aggregate view by construction. The honest aggregate of that same fact is
   chronic absenteeism, which is why it is now a metric of its own.

The app declares the metric vocabulary in `app/src/ui/research.ts`, including the
scale each metric is meaningful at, and its test suite fails if a claim here names
a metric the app does not know or no view supplies. Adding a citation with a new
metric means adding the metric there first.
"""

from __future__ import annotations

from .review import review_for

_CITATIONS = [
    # --- Attendance ---------------------------------------------------------
    {
        "id": "cite-attendance-01",
        "claim": (
            "Students who miss 10 percent or more of the school year are less "
            "likely to read proficiently and to graduate on time."
        ),
        "topic": "attendance",
        "source": {
            "authorOrOrganization": "Attendance Works",
            "title": "Chronic Absence: The Problem",
            # No publication year: the page is continuously revised and carries
            # none. Supplying one presented it as a snapshot somebody could check.
            "accessedDate": "2026-08-18",
            "url": "https://www.attendanceworks.org/chronic-absence/the-problem/",
            "sourceType": "research_organization",
        },
        # Not tagged for the student themself, and not for the board or the
        # public. It is a claim about individuals, keyed to an individual's rate:
        # the outer two roles cannot see a student to attach it to, and putting a
        # graduation-risk statistic in front of the child it describes is the
        # punitive reading of a design that promises the opposite. The adults
        # responsible for support get it; the subject of it does not.
        "applicableRoles": [
            "teacher", "special_education_teacher", "counselor",
            "building_administrator", "district_administrator", "guardian",
        ],
        "triggerConditions": {"metric": "attendanceRate", "comparator": "below", "threshold": 90},
        "confidenceNote": (
            "Association, not causation. Chronic absence co-occurs with factors "
            "such as housing instability and chronic health conditions that "
            "independently affect achievement. Read as context for support, never "
            "as a prediction about this student."
        ),
        "metadata": {"addedDate": "2026-08-16"},
    },
    {
        "id": "cite-attendance-02",
        # Resourced in Phase 7. The claim used to assert that missing a skill's
        # first introduction costs more than missing review days, sourced to an
        # ed.gov data story that has since been removed and that never said it --
        # the confidenceNote predicted exactly that and the claim shipped anyway.
        #
        # What the literature does establish is the general form: absences are not
        # interchangeable, and when one falls is associated with what it costs.
        # Keppens measures position in the school *year* rather than position in a
        # unit, so the claim is stated at that level and the note says where the
        # gap is. The figure the app supplies is still which days carried new
        # instruction, and the claim's job is to say that asking which days is
        # worth doing -- not to price this student's absence.
        "claim": (
            "Absences are not interchangeable. When in the school year an absence "
            "falls is associated with how much it costs: absence early and late in "
            "the year tracks more strongly with lower end-of-year results than the "
            "same number of days missed in between."
        ),
        "topic": "attendance",
        "source": {
            "authorOrOrganization": "Keppens, G.",
            "title": (
                "School Absenteeism and Academic Achievement: "
                "Does the Timing of the Absence Matter?"
            ),
            "publicationYear": 2023,
            "url": "https://doi.org/10.1016/j.learninstruc.2023.101769",
            "sourceType": "peer_reviewed",
        },
        # This one *is* tagged for the student, where attendance-01 is not. It
        # says which days carried the most instruction rather than what missing
        # them predicts about a life, and the app can point at those days -- units
        # already carry key instruction dates and the attendance timeline marks
        # them. It is the actionable half of the same subject.
        "applicableRoles": [
            "student", "guardian", "teacher", "special_education_teacher",
            "counselor", "building_administrator", "district_administrator",
        ],
        "triggerConditions": {
            "metric": "missedKeyInstructionDays", "comparator": "above", "threshold": 0
        },
        "confidenceNote": (
            "Measured on 62,841 secondary students, and on position in the school "
            "year rather than position within a unit. The days marked here are the "
            "ones that carried new instruction, which is a different question the "
            "source does not answer. Read this as a reason to look at which days "
            "were missed, not as a measure of what missing them cost."
        ),
        "metadata": {"addedDate": "2026-08-16"},
    },
    {
        "id": "cite-attendance-03",
        "claim": (
            "Across states and large urban districts, higher student attendance "
            "goes with higher scores on the national assessment."
        ),
        "topic": "attendance",
        "source": {
            "authorOrOrganization": "Ginsburg, A., Chang, H., & Jordan, P.",
            "title": "Absences Add Up: How School Attendance Influences Student Success",
            "publicationYear": 2014,
            "url": "https://www.attendanceworks.org/absences-add-up/",
            "sourceType": "research_organization",
        },
        "applicableRoles": [
            "building_administrator", "district_administrator",
            "school_board_member", "community_member",
        ],
        "triggerConditions": {
            "metric": "schoolAttendanceRate", "comparator": "above", "threshold": 95
        },
        "confidenceNote": (
            "A correlation across states and districts, not a finding about any "
            "one school. Attendance rates track community factors, so this is "
            "not an isolated lever, and a building above 95 percent has not "
            "thereby been shown to be doing anything in particular."
        ),
        "metadata": {"addedDate": "2026-08-16"},
    },
    {
        "id": "cite-attendance-04",
        "claim": (
            "Chronic absence, defined as missing a tenth or more of school days, "
            "tracks achievement and graduation more closely than a school's average "
            "daily "
            "attendance, which can sit in a healthy range while a substantial "
            "minority of students are chronically absent."
        ),
        "topic": "attendance",
        "source": {
            "authorOrOrganization": "Attendance Works",
            "title": "Chronic Absence: The Problem",
            # No publication year: the page is continuously revised and carries
            # none. Supplying one presented it as a snapshot somebody could check.
            "accessedDate": "2026-08-18",
            "url": "https://www.attendanceworks.org/chronic-absence/the-problem/",
            "sourceType": "research_organization",
        },
        # The public claim this library did not have. Every reader of a district
        # attendance figure is looking at the number this warns them about.
        "applicableRoles": [
            "teacher", "counselor", "nurse", "building_administrator",
            "district_administrator", "school_board_member", "community_member",
        ],
        "triggerConditions": {
            "metric": "chronicAbsenteeismRate", "comparator": "above", "threshold": 10
        },
        "confidenceNote": (
            "The arithmetic point, that an average is insensitive to a small group "
            "missing many days, is not in dispute. The strength of the link "
            "between chronic absence and outcomes is correlational and varies with "
            "the population studied."
        ),
        "metadata": {"addedDate": "2026-08-17"},
    },
    {
        "id": "cite-attendance-05",
        "claim": (
            "An average attendance rate in the low 90s is consistent with a large "
            "share of absence being concentrated in relatively few students, "
            "because a small number missing many days moves the average very little."
        ),
        "topic": "attendance",
        "source": {
            "authorOrOrganization": "Ginsburg, A., Chang, H., & Jordan, P.",
            "title": "Absences Add Up: How School Attendance Influences Student Success",
            "publicationYear": 2014,
            "url": "https://www.attendanceworks.org/absences-add-up/",
            "sourceType": "research_organization",
        },
        "applicableRoles": [
            "counselor", "building_administrator", "district_administrator",
            "school_board_member", "community_member",
        ],
        # The band trigger, and the reason `between` had to exist. Claims keyed to
        # the extremes are silent across the whole ordinary middle -- which is
        # where a functioning district spends every day of its life.
        "triggerConditions": {
            "metric": "schoolAttendanceRate",
            "comparator": "between",
            "threshold": 90,
            "upperThreshold": 95,
        },
        "confidenceNote": (
            "This is a statement about how averages behave, illustrated by the "
            "source rather than established by it. Whether it holds here is "
            "answerable directly from this district's own chronic absence figure, "
            "which is shown alongside."
        ),
        "metadata": {"addedDate": "2026-08-17"},
    },
    {
        "id": "cite-health-01",
        "claim": (
            "A small number of highly prevalent health problems affect educational "
            "outcomes and fall disproportionately on the same populations as low "
            "achievement: uncorrected vision, asthma, inattention and "
            "hyperactivity, aggression and violence, teen pregnancy, physical "
            "inactivity, and skipped breakfast."
        ),
        "topic": "attendance",
        "source": {
            "authorOrOrganization": "Basch, C. E.",
            "title": (
                "Healthier Students Are Better Learners: A Missing Link in School "
                "Reforms to Close the Achievement Gap"
            ),
            "publicationYear": 2011,
            "url": "https://doi.org/10.1111/j.1746-1561.2011.00632.x",
            "sourceType": "peer_reviewed",
        },
        # The nurse's first claim. Their building page is otherwise an unlit sky:
        # they hold named students, attendance, and health detail, and no
        # aggregate mastery, so every panel on it belongs to someone else. This is
        # a statement about the stream they are responsible for, and it is the one
        # thing that page can honestly show them.
        "applicableRoles": [
            "nurse", "counselor", "building_administrator", "district_administrator",
        ],
        "triggerConditions": {
            "metric": "chronicAbsenteeismRate", "comparator": "above", "threshold": 10
        },
        "confidenceNote": (
            "A synthesis arguing for attention to health as an educational lever, "
            "not an estimate of how much of this district's absence is health-driven. "
            "Nothing here identifies which students are affected."
        ),
        "metadata": {"addedDate": "2026-08-17"},
    },

    # --- Behavior -----------------------------------------------------------
    {
        "id": "cite-behavior-01",
        "claim": (
            "Exclusionary discipline removes students from instruction, and the "
            "available evidence does not show that zero tolerance approaches "
            "improve school safety or academic outcomes."
        ),
        "topic": "behavior",
        "source": {
            "authorOrOrganization": "American Psychological Association Zero Tolerance Task Force",
            "title": (
                "Are Zero Tolerance Policies Effective in the Schools? "
                "An Evidentiary Review and Recommendations"
            ),
            "publicationYear": 2008,
            "url": "https://www.apa.org/pubs/reports/zero-tolerance",
            "sourceType": "peer_reviewed",
        },
        "applicableRoles": [
            "teacher", "special_education_teacher", "counselor",
            "building_administrator", "district_administrator",
        ],
        "triggerConditions": {"metric": "suspensionCount", "comparator": "above", "threshold": 0},
        "confidenceNote": (
            "Present this as context for support, never as a prediction about an "
            "individual student. The design principle is accountable, not punitive."
        ),
        "metadata": {"addedDate": "2026-08-16"},
    },
    {
        "id": "cite-behavior-02",
        "claim": (
            "Schools implementing school-wide positive behavioral interventions "
            "and supports well report reduced use of exclusionary discipline and "
            "improved school climate."
        ),
        "topic": "behavior",
        "source": {
            "authorOrOrganization": "Center on PBIS, US Department of Education",
            "title": "What is PBIS?",
            # The site's own citation guidance leaves the year blank, because the
            # page is living. 2022 was supplied here and by nobody else.
            "accessedDate": "2026-08-18",
            "url": "https://www.pbis.org/pbis/what-is-pbis",
            "sourceType": "research_organization",
        },
        "applicableRoles": [
            "counselor", "building_administrator", "district_administrator",
            "school_board_member", "community_member",
        ],
        # Was `disciplineReferralCount above 3` -- an individual's threshold, which
        # fired on any group of more than a handful of children and was the only
        # thing an elected board ever saw. A rate per 100 students is the same
        # question asked in a way that means something at both a section and a
        # district.
        "triggerConditions": {
            "metric": "disciplineReferralsPer100Students",
            "comparator": "above",
            "threshold": 25,
        },
        "confidenceNote": (
            "The source is the framework's own site rather than an independent "
            "evidence review, so read it as what PBIS reports of itself. "
            "Effects vary considerably with implementation fidelity. The "
            "threshold is an editorial choice about when this is worth showing, "
            "not a rate the source identifies as high."
        ),
        "metadata": {"addedDate": "2026-08-16"},
    },

    # --- Engagement and family ----------------------------------------------
    {
        "id": "cite-engagement-01",
        "claim": (
            "Family engagement in schooling is consistently associated with higher "
            "achievement, better attendance, and improved social outcomes across "
            "income levels and backgrounds."
        ),
        "topic": "family_involvement",
        "source": {
            "authorOrOrganization": "Henderson, A. T., & Mapp, K. L.",
            "title": (
                "A New Wave of Evidence: The Impact of School, Family, and Community "
                "Connections on Student Achievement"
            ),
            "publicationYear": 2002,
            "url": "https://sedl.org/connections/resources/evidence.pdf",
            # A narrative synthesis of 51 studies, not a statistical meta-analysis.
            # Keeping that distinction is most of what a citation library is for.
            "sourceType": "research_organization",
        },
        "applicableRoles": [
            "teacher", "counselor", "building_administrator",
            "district_administrator", "guardian",
        ],
        "triggerConditions": {"metric": "responseRate", "comparator": "below", "threshold": 40},
        "confidenceNote": (
            "Low measured engagement often reflects barriers such as work schedules, "
            "language access, and transportation, rather than lack of interest. Frame "
            "as an access question, not a judgment about a family."
        ),
        "metadata": {"addedDate": "2026-08-16"},
    },
    {
        "id": "cite-engagement-02",
        "claim": (
            "Homework completion correlates with achievement more strongly at "
            "secondary than at elementary level."
        ),
        "topic": "engagement",
        "source": {
            "authorOrOrganization": "Cooper, H., Robinson, J. C., & Patall, E. A.",
            "title": (
                "Does Homework Improve Academic Achievement? "
                "A Synthesis of Research, 1987-2003"
            ),
            "publicationYear": 2006,
            "url": "https://doi.org/10.3102/00346543076001001",
            "sourceType": "meta_analysis",
        },
        # Not tagged for the student. It is a claim about how much weight an adult
        # should put on a completion figure when reading it, which is a different
        # act from being the person the figure is about.
        "applicableRoles": [
            "teacher", "building_administrator", "district_administrator", "guardian",
        ],
        "triggerConditions": {"metric": "completionRate", "comparator": "below", "threshold": 70},
        "confidenceNote": (
            "The elementary correlation is weak. Do not surface homework completion "
            "as an achievement signal in elementary dashboards without that caveat."
        ),
        "metadata": {"addedDate": "2026-08-16"},
    },
    {
        "id": "cite-engagement-03",
        "claim": (
            "Practice distributed over time and self-testing are among the "
            "better-supported study techniques across a wide range of subjects and "
            "ages; rereading and highlighting are among the weakest."
        ),
        "topic": "engagement",
        "source": {
            "authorOrOrganization": (
                "Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., & Willingham, D. T."
            ),
            "title": (
                "Improving Students' Learning With Effective Learning Techniques: "
                "Promising Directions From Cognitive and Educational Psychology"
            ),
            "publicationYear": 2013,
            "url": "https://doi.org/10.1177/1529100612453266",
            "sourceType": "peer_reviewed",
        },
        # A student's own claim, and chosen carefully. It is about a method the
        # reader controls rather than a probability attached to them, which is the
        # only kind of research context that belongs on a page describing a child
        # to themself.
        "applicableRoles": ["student", "guardian", "teacher", "special_education_teacher"],
        "triggerConditions": {"metric": "completionRate", "comparator": "below", "threshold": 70},
        "confidenceNote": (
            "A review of technique effectiveness in general, not advice fitted to "
            "this student or this subject. It says nothing about why any particular "
            "work went uncompleted."
        ),
        "metadata": {"addedDate": "2026-08-17"},
    },

    # --- Mastery and evidence -----------------------------------------------
    {
        "id": "cite-mastery-01",
        "claim": (
            "Frequent formative assessment with actionable feedback is among the "
            "more effective instructional practices for improving achievement."
        ),
        "topic": "mastery_progression",
        "source": {
            "authorOrOrganization": "Black, P., & Wiliam, D.",
            "title": "Assessment and Classroom Learning",
            "publicationYear": 1998,
            "url": "https://doi.org/10.1080/0969595980050102",
            "sourceType": "peer_reviewed",
        },
        "applicableRoles": [
            "teacher", "special_education_teacher", "building_administrator",
            "district_administrator",
        ],
        # Was `evidenceCount below 3`, written per standard and handed a per-year
        # total of 200 by the only page that supplied it. A share of standards
        # carrying no artifact is the version of that quantity that means the same
        # thing on one student and on a district.
        "triggerConditions": {
            "metric": "standardsWithoutEvidenceShare", "comparator": "above", "threshold": 25
        },
        "confidenceNote": (
            "Effect sizes from this literature have been debated and are likely "
            "smaller than the headline figures often quoted. Avoid citing a number. "
            "An unrecorded artifact is also not the same as an unassessed standard."
        ),
        "metadata": {"addedDate": "2026-08-16"},
    },
    {
        "id": "cite-mastery-02",
        "claim": (
            "In mathematics, proficiency with whole numbers, fractions, and "
            "particular aspects of geometry and measurement is identified as the "
            "critical foundation for success in algebra."
        ),
        "topic": "mastery_progression",
        "source": {
            "authorOrOrganization": "National Mathematics Advisory Panel",
            "title": "Foundations for Success: The Final Report",
            "publicationYear": 2008,
            # ERIC rather than ed.gov: the department's own path 404s after a site
            # reorganisation, and an accession number survives one.
            "url": "https://files.eric.ed.gov/fulltext/ED500486.pdf",
            "sourceType": "government_report",
        },
        "applicableRoles": [
            "teacher", "special_education_teacher", "counselor",
            "building_administrator", "district_administrator", "guardian",
        ],
        "triggerConditions": {
            "metric": "priorYearMasteryRate", "comparator": "below", "threshold": 60
        },
        "confidenceNote": (
            "The panel examined mathematics and nothing else, while the figure "
            "this appears against covers every subject. Whether other subjects "
            "depend on prerequisites the same way is a reasonable expectation "
            "and not something this source establishes."
        ),
        "metadata": {"addedDate": "2026-08-16"},
    },
    {
        "id": "cite-evidence-01",
        "claim": (
            "An interpretation drawn from an assessment is only as defensible as "
            "the evidence documented to support it; documentation of that evidence "
            "is treated as part of the judgement rather than as a record-keeping "
            "afterthought."
        ),
        "topic": "mastery_progression",
        "source": {
            "authorOrOrganization": (
                "American Educational Research Association, American Psychological "
                "Association, & National Council on Measurement in Education"
            ),
            "title": "Standards for Educational and Psychological Testing",
            "publicationYear": 2014,
            "url": "https://www.testingstandards.net/",
            # A professional standard agreed by three associations is not
            # peer-reviewed research, whatever its authority.
            "sourceType": "other",
        },
        # The claim behind the "What the rate rests on" panel the public and the
        # board already read. Thirty percent of this district's standards carry no
        # artifact, and until now no view said what that means for the rate above it.
        "applicableRoles": [
            "teacher", "special_education_teacher", "building_administrator",
            "district_administrator", "school_board_member", "community_member",
        ],
        "triggerConditions": {
            "metric": "standardsWithoutEvidenceShare", "comparator": "above", "threshold": 20
        },
        "confidenceNote": (
            "A professional standard for defensible measurement, not an empirical "
            "finding about outcomes. It bears on how much weight a mastery rate can "
            "carry, not on whether the students learned."
        ),
        "metadata": {"addedDate": "2026-08-17"},
    },
    {
        "id": "cite-variation-01",
        "claim": (
            "Teachers differ substantially in their effect on reading and "
            "mathematics achievement, and little of that difference is explained "
            "by observable characteristics such as degrees or years of experience."
        ),
        "topic": "mastery_progression",
        "source": {
            "authorOrOrganization": "Rivkin, S. G., Hanushek, E. A., & Kain, J. F.",
            "title": "Teachers, Schools, and Academic Achievement",
            "publicationYear": 2005,
            "url": "https://doi.org/10.1111/j.1468-0262.2005.00584.x",
            "sourceType": "peer_reviewed",
        },
        # The public page spends a paragraph arguing that a one-point gap between
        # schools is not a finding while grades vary ten. That argument was the
        # view's own; this is the literature it was reaching for.
        "applicableRoles": [
            "building_administrator", "district_administrator",
            "school_board_member", "community_member",
        ],
        "triggerConditions": {
            "metric": "masterySpreadPoints", "comparator": "above", "threshold": 5
        },
        "confidenceNote": (
            "Measured on test-score gains in one state, not on mastery of "
            "standards, and the estimate is a lower bound identified from "
            "differences within schools. It says teacher effects are large and "
            "poorly predicted by credentials. It does not say which teachers, "
            "and nothing here identifies any. Read as a reason to look inside a "
            "building, never as a ranking of anyone in this one."
        ),
        "metadata": {"addedDate": "2026-08-17"},
    },

    # --- Interruptions, services, mobility -----------------------------------
    {
        "id": "cite-interruptions-01",
        "claim": (
            "Time allocated for instruction and time students spend engaged in "
            "learning are not the same thing, and the amount of time scheduled has "
            "little relationship to achievement on its own."
        ),
        "topic": "interruptions",
        "source": {
            "authorOrOrganization": "Aronson, J., Zimmerman, J., & Carlos, L.",
            "title": "Improving Student Achievement by Extending School: Is It Just a Matter of Time?",
            "publicationYear": 1999,
            "url": "https://files.eric.ed.gov/fulltext/ED435127.pdf",
            "sourceType": "research_organization",
        },
        "applicableRoles": [
            "teacher", "special_education_teacher", "building_administrator",
            "district_administrator",
        ],
        "triggerConditions": {
            "metric": "totalMinutesLost", "comparator": "above", "threshold": 120
        },
        "confidenceNote": (
            "A synthesis of research on extending school time, so it speaks to "
            "how much time is scheduled rather than to interruptions "
            "specifically. It gives a reason to treat lost minutes as a "
            "question about engaged time rather than as a quantity to be "
            "recovered."
        ),
        "metadata": {"addedDate": "2026-08-16"},
    },
    {
        "id": "cite-services-01",
        "claim": (
            "Federal law requires that students with disabilities be educated with "
            "children who are not disabled to the maximum extent appropriate, and "
            "that removal from the regular classroom happen only where education "
            "there with supplementary aids and services cannot be achieved "
            "satisfactorily."
        ),
        "topic": "special_services",
        "source": {
            "authorOrOrganization": "US Department of Education, Office of Special Education Programs",
            "title": (
                "Individuals with Disabilities Education Act, 20 U.S.C. 1412(a)(5): "
                "Least Restrictive Environment"
            ),
            # The 2004 reauthorisation, which is a date somebody can check. The
            # record previously carried 2023, which was the year it was typed.
            "publicationYear": 2004,
            "url": "https://sites.ed.gov/idea/statute-chapter-33/subchapter-ii/1412/a/5",
            "sourceType": "government_report",
        },
        "applicableRoles": [
            "teacher", "special_education_teacher", "counselor",
            "building_administrator", "district_administrator",
        ],
        "triggerConditions": {"metric": "hasActiveIEP", "comparator": "equals", "threshold": 1},
        "confidenceNote": (
            "A legal requirement, not a research finding: a statute contains no "
            "evidence about outcomes and this one makes no claim about them. "
            "Placement decisions are individualized and belong to the IEP team."
        ),
        "metadata": {"addedDate": "2026-08-16"},
    },
    {
        "id": "cite-prior-01",
        "claim": (
            "Students who change schools frequently show lower achievement, and "
            "schools serving high-mobility populations face particular difficulty "
            "meeting their needs."
        ),
        "topic": "prior_achievement",
        "source": {
            "authorOrOrganization": "US Government Accountability Office",
            "title": (
                "K-12 Education: Many Challenges Arise in Educating Students "
                "Who Change Schools Frequently"
            ),
            "publicationYear": 2010,
            "url": "https://www.gao.gov/products/gao-11-40",
            "sourceType": "government_report",
        },
        # Tagged for the student, unlike most of the individual-level claims. What
        # it tells the reader is that a thin record is a fact about the paperwork
        # and not about them, which is worth saying to the person it is about.
        "applicableRoles": [
            "student", "guardian", "teacher", "special_education_teacher",
            "counselor", "building_administrator", "district_administrator",
        ],
        "triggerConditions": {
            "metric": "hasIncompletePriorHistory", "comparator": "equals", "threshold": 1
        },
        "confidenceNote": (
            "Sparse records reflect data transfer limits, not necessarily gaps in "
            "what the student knows. Read alongside current evidence, not instead of it."
        ),
        "metadata": {"addedDate": "2026-08-16"},
    },
]


# --- The review record ------------------------------------------------------
#
# Attached here rather than written into each literal above, so that a claim
# added to this file without a review entry is reported as `unreviewed` by
# construction. Writing the status by hand at 18 call sites is how the library
# came to carry 18 identical `needs_human_review` flags that nobody could tell
# apart from a review that had happened and found nothing wrong.

def _with_review(citations: list[dict]) -> list[dict]:
    for citation in citations:
        citation["review"] = review_for(citation["id"], citation["claim"])
    return citations


RESEARCH_CITATIONS = _with_review(_CITATIONS)
