"""Research citation library for the context layer.

Every dashboard in the UI/UX design pairs data with research-backed context.
Storing those claims as records rather than hardcoding sentences into components
means the same claim renders identically at every zoom level and its sourcing is
auditable.

IMPORTANT -- review status. The vision documents commit to being
"research-grounded" and "accountable, not punitive." A citation library that
overstates correlational findings as causal would undercut both. Every entry here
carries `reviewStatus: "needs_human_review"` and a `confidenceNote`. None of these
should reach a stakeholder-facing view until a human has confirmed the source says
what the claim says. The claims below are stated in deliberately correlational
language for that reason.
"""

from __future__ import annotations

RESEARCH_CITATIONS = [
    {
        "id": "cite-attendance-01",
        "claim": (
            "Students who miss 10 percent or more of the school year are "
            "substantially less likely to read proficiently and to graduate on time."
        ),
        "topic": "attendance",
        "source": {
            "authorOrOrganization": "Attendance Works",
            "title": "Chronic Absence: Research and Data",
            "publicationYear": 2018,
            "url": "https://www.attendanceworks.org/chronic-absence/the-problem/",
            "sourceType": "research_organization",
        },
        "applicableRoles": [
            "teacher", "building_administrator", "district_administrator",
            "school_board_member", "guardian", "community_member",
        ],
        "triggerConditions": {"metric": "attendanceRate", "comparator": "below", "threshold": 90},
        "confidenceNote": (
            "Association, not causation. Chronic absence co-occurs with factors "
            "such as housing instability and chronic health conditions that "
            "independently affect achievement."
        ),
        "metadata": {"addedDate": "2026-08-16", "reviewStatus": "needs_human_review"},
    },
    {
        "id": "cite-attendance-02",
        "claim": (
            "Missing instruction when a skill is first introduced is associated "
            "with slower mastery of that skill than missing an equivalent number "
            "of review days."
        ),
        "topic": "attendance",
        "source": {
            "authorOrOrganization": "US Department of Education",
            "title": "Chronic Absenteeism in the Nation's Schools",
            "publicationYear": 2019,
            "url": "https://www2.ed.gov/datastory/chronicabsenteeism.html",
            "sourceType": "government_report",
        },
        "applicableRoles": ["teacher", "building_administrator", "district_administrator"],
        "triggerConditions": {"metric": "missedKeyInstructionDays", "comparator": "above", "threshold": 0},
        "confidenceNote": (
            "The general link between absence and achievement is well documented; "
            "the specific key-instruction-day effect is a reasonable inference that "
            "should be verified against a direct source before being surfaced."
        ),
        "metadata": {"addedDate": "2026-08-16", "reviewStatus": "needs_human_review"},
    },
    {
        "id": "cite-attendance-03",
        "claim": (
            "Schools sustaining attendance rates above 95 percent tend to show "
            "stronger achievement growth than otherwise comparable schools."
        ),
        "topic": "attendance",
        "source": {
            "authorOrOrganization": "Ginsburg, A., Jordan, P., & Chang, H.",
            "title": "Absences Add Up: How School Attendance Influences Student Success",
            "publicationYear": 2014,
            "url": "https://www.attendanceworks.org/absences-add-up/",
            "sourceType": "research_organization",
        },
        "applicableRoles": [
            "building_administrator", "district_administrator",
            "school_board_member", "community_member",
        ],
        "triggerConditions": {"metric": "schoolAttendanceRate", "comparator": "above", "threshold": 95},
        "confidenceNote": (
            "School-level correlation. Attendance rates track community factors, so "
            "this should not be read as an isolated lever."
        ),
        "metadata": {"addedDate": "2026-08-16", "reviewStatus": "needs_human_review"},
    },
    {
        "id": "cite-behavior-01",
        "claim": (
            "Exclusionary discipline removes students from instruction and is "
            "associated with lower achievement and higher dropout risk."
        ),
        "topic": "behavior",
        "source": {
            "authorOrOrganization": "American Psychological Association Zero Tolerance Task Force",
            "title": "Are Zero Tolerance Policies Effective in the Schools?",
            "publicationYear": 2008,
            "url": "https://www.apa.org/pubs/reports/zero-tolerance",
            "sourceType": "peer_reviewed",
        },
        "applicableRoles": ["teacher", "building_administrator", "district_administrator"],
        "triggerConditions": {"metric": "suspensionCount", "comparator": "above", "threshold": 0},
        "confidenceNote": (
            "Present this as context for support, never as a prediction about an "
            "individual student. The design principle is accountable, not punitive."
        ),
        "metadata": {"addedDate": "2026-08-16", "reviewStatus": "needs_human_review"},
    },
    {
        "id": "cite-behavior-02",
        "claim": (
            "School-wide positive behavioral interventions and supports are "
            "associated with reduced office discipline referrals and improved "
            "school climate."
        ),
        "topic": "behavior",
        "source": {
            "authorOrOrganization": "Center on PBIS, US Department of Education",
            "title": "Positive Behavioral Interventions and Supports: Evidence Base",
            "publicationYear": 2022,
            "url": "https://www.pbis.org/pbis/what-is-pbis",
            "sourceType": "research_organization",
        },
        "applicableRoles": ["building_administrator", "district_administrator", "school_board_member"],
        "triggerConditions": {"metric": "disciplineReferralCount", "comparator": "above", "threshold": 3},
        "confidenceNote": "Effects vary considerably with implementation fidelity.",
        "metadata": {"addedDate": "2026-08-16", "reviewStatus": "needs_human_review"},
    },
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
            "title": "A New Wave of Evidence: The Impact of School, Family, and Community Connections on Student Achievement",
            "publicationYear": 2002,
            "url": "https://sedl.org/connections/resources/evidence.pdf",
            "sourceType": "meta_analysis",
        },
        "applicableRoles": [
            "teacher", "building_administrator", "district_administrator", "guardian",
        ],
        "triggerConditions": {"metric": "responseRate", "comparator": "below", "threshold": 40},
        "confidenceNote": (
            "Low measured engagement often reflects barriers -- work schedules, "
            "language access, transportation -- rather than lack of interest. Frame "
            "as an access question, not a judgment about a family."
        ),
        "metadata": {"addedDate": "2026-08-16", "reviewStatus": "needs_human_review"},
    },
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
        "applicableRoles": ["teacher", "building_administrator", "district_administrator"],
        "triggerConditions": {"metric": "evidenceCount", "comparator": "below", "threshold": 3},
        "confidenceNote": (
            "Effect sizes from this literature have been debated and are likely "
            "smaller than the headline figures often quoted. Avoid citing a number."
        ),
        "metadata": {"addedDate": "2026-08-16", "reviewStatus": "needs_human_review"},
    },
    {
        "id": "cite-mastery-02",
        "claim": (
            "Prerequisite skills strongly shape readiness for later content; gaps "
            "in foundational standards tend to compound across grade levels."
        ),
        "topic": "mastery_progression",
        "source": {
            "authorOrOrganization": "National Mathematics Advisory Panel",
            "title": "Foundations for Success: The Final Report",
            "publicationYear": 2008,
            "url": "https://www2.ed.gov/about/bdscomm/list/mathpanel/report/final-report.pdf",
            "sourceType": "government_report",
        },
        "applicableRoles": ["teacher", "building_administrator", "district_administrator", "guardian"],
        "triggerConditions": {"metric": "priorYearMasteryRate", "comparator": "below", "threshold": 60},
        "confidenceNote": (
            "Strongest evidence is in mathematics; generalization to other subjects "
            "is less well established."
        ),
        "metadata": {"addedDate": "2026-08-16", "reviewStatus": "needs_human_review"},
    },
    {
        "id": "cite-interruptions-01",
        "claim": (
            "Protected, uninterrupted instructional time is associated with greater "
            "learning gains; fragmentation of instructional blocks reduces effective "
            "time on task."
        ),
        "topic": "interruptions",
        "source": {
            "authorOrOrganization": "Aronson, J., Zimmerman, J., & Carlos, L.",
            "title": "Improving Student Achievement by Extending School: Is It Just a Matter of Time?",
            "publicationYear": 1999,
            "url": "https://files.eric.ed.gov/fulltext/ED435127.pdf",
            "sourceType": "research_organization",
        },
        "applicableRoles": ["teacher", "building_administrator", "district_administrator"],
        "triggerConditions": {"metric": "totalMinutesLost", "comparator": "above", "threshold": 120},
        "confidenceNote": (
            "Quality of instructional time matters more than raw quantity; more "
            "minutes alone does not produce gains."
        ),
        "metadata": {"addedDate": "2026-08-16", "reviewStatus": "needs_human_review"},
    },
    {
        "id": "cite-services-01",
        "claim": (
            "Students with disabilities show stronger outcomes when instruction is "
            "delivered in the least restrictive environment appropriate to their needs."
        ),
        "topic": "special_services",
        "source": {
            "authorOrOrganization": "US Department of Education, Office of Special Education Programs",
            "title": "Individuals with Disabilities Education Act: Least Restrictive Environment",
            "publicationYear": 2023,
            "url": "https://sites.ed.gov/idea/statute-chapter-33/subchapter-ii/1412/a/5",
            "sourceType": "government_report",
        },
        "applicableRoles": ["teacher", "building_administrator", "district_administrator"],
        "triggerConditions": {"metric": "hasActiveIEP", "comparator": "equals", "threshold": 1},
        "confidenceNote": (
            "This is a legal standard as much as an empirical finding. Placement "
            "decisions are individualized and belong to the IEP team."
        ),
        "metadata": {"addedDate": "2026-08-16", "reviewStatus": "needs_human_review"},
    },
    {
        "id": "cite-prior-01",
        "claim": (
            "Mobility between schools is associated with short-term achievement "
            "disruption, with effects that typically diminish as students stabilize."
        ),
        "topic": "prior_achievement",
        "source": {
            "authorOrOrganization": "US Government Accountability Office",
            "title": "K-12 Education: Student Mobility",
            "publicationYear": 2010,
            "url": "https://www.gao.gov/products/gao-11-40",
            "sourceType": "government_report",
        },
        "applicableRoles": ["teacher", "building_administrator", "district_administrator", "guardian"],
        "triggerConditions": {"metric": "hasIncompletePriorHistory", "comparator": "equals", "threshold": 1},
        "confidenceNote": (
            "Sparse records reflect data transfer limits, not necessarily gaps in "
            "what the student knows. Read alongside current evidence, not instead of it."
        ),
        "metadata": {"addedDate": "2026-08-16", "reviewStatus": "needs_human_review"},
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
            "title": "Does Homework Improve Academic Achievement? A Synthesis of Research",
            "publicationYear": 2006,
            "url": "https://doi.org/10.3102/00346543076001001",
            "sourceType": "meta_analysis",
        },
        "applicableRoles": ["teacher", "building_administrator", "guardian"],
        "triggerConditions": {"metric": "completionRate", "comparator": "below", "threshold": 70},
        "confidenceNote": (
            "The elementary correlation is weak. Do not surface homework completion "
            "as an achievement signal in elementary dashboards without that caveat."
        ),
        "metadata": {"addedDate": "2026-08-16", "reviewStatus": "needs_human_review"},
    },
]
