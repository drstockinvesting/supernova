"""Mastery records, evidence artifacts, participation, and family engagement.

Mastery is generated LAST among current-year streams, and deliberately so. It reads
the student's actual absence dates against each unit's date window and key
instruction dates, so gaps land in the units taught while the student was out.

That single ordering decision is what makes the whole system's premise testable.
Generate mastery independently and you get a student with a 68% attendance rate
whose gaps are spread evenly across every unit -- statistically fine, narratively
meaningless, and the correlation engine has nothing to find.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass

from ..archetypes import Archetype, evidence_count_for, quarter_strength
from ..calendar import SchoolCalendar
from ..config import EVIDENCE_DENSITY, evidence_strength_for
from ..entities.curriculum import CurriculumUnit
from ..rng import chance, clamp, stable_digits, stream
from ..standards_catalog import Standard

DATA_SOURCES = [
    ("assessment", "District Assessment Platform"),
    ("assignment", "Google Classroom"),
    ("quiz", "Google Classroom"),
    ("observation", "Teacher Observation Log"),
    ("performanceTask", "District Assessment Platform"),
    ("project", "Google Classroom"),
    ("studentArtifact", "Student Portfolio"),
    ("discussion", "Teacher Observation Log"),
]

ARTIFACT_TITLES = {
    "assessment": ["Unit {n} Assessment", "Mid-Unit Check", "End-of-Unit Assessment"],
    "assignment": ["Practice Set {n}", "Application Task", "Guided Problem Set"],
    "quiz": ["Quick Check {n}", "Exit Ticket", "Skills Quiz"],
    "observation": ["Small Group Observation", "Conferring Notes", "Workshop Observation"],
    "performanceTask": ["Performance Task {n}", "Applied Problem"],
    "project": ["Unit Project", "Collaborative Investigation"],
    "studentArtifact": ["Student Work Sample", "Portfolio Entry"],
    "discussion": ["Academic Discussion", "Socratic Seminar Participation"],
}

CONTEXT_NOTES = {
    True: [
        "Student explained reasoning clearly and applied the skill independently.",
        "Work shows consistent application of the standard across problem types.",
        "Independently transferred the skill to an unfamiliar context.",
        "Demonstrated the standard without prompting or scaffolds.",
    ],
    False: [
        "Partial understanding; needed prompting to complete the task.",
        "Applied the procedure but could not explain the underlying reasoning.",
        "Correct on scaffolded items, inconsistent on independent items.",
        "Attempted the task; key step remains unclear.",
    ],
}


def build_mastery_for_subject(
    student,
    archetype: Archetype,
    school_year: str,
    subject: str,
    units: list[CurriculumUnit],
    standards_by_id: dict[str, Standard],
    absences: set[dt.date],
    calendar: SchoolCalendar,
    carried_forward: set[str],
    full_evidence: bool,
    as_of: dt.date | None = None,
    enrolled_from: dt.date | None = None,
) -> tuple[list[dict], list[dict]]:
    """Generate mastery records and evidence for one student in one subject.

    Returns (mastery_records, evidence_records).

    `carried_forward` holds standard IDs the student already mastered in a prior
    year. Mastery is permanent, so those never revert -- but a re-demonstration
    creates a fresh evidence trail rather than overwriting the original.

    `as_of` is the date the dataset is viewed from. Units that have not started by
    then are recorded as not-yet-taught with no evidence, and evidence in the unit
    currently in progress stops at `as_of`. Without this the dataset contains
    evidence dated after the viewing date, sitting inside units the dashboard
    simultaneously reports as `not_started` -- and a February mastery map should
    genuinely be dark where the year has not reached yet.
    """
    rng = stream(student.id, "mastery", school_year, subject)

    mastery_records: list[dict] = []
    evidence_records: list[dict] = []

    for unit in units:
        quarter_index = min(3, max(0, unit.sequence - 1))

        # A student who enrolled mid-year was not present for earlier units. They
        # get no record for them at all rather than a not_mastered record implying
        # they were taught the content and failed to demonstrate it.
        if enrolled_from is not None and unit.end_date < enrolled_from:
            continue

        if as_of is not None and unit.start_date > as_of:
            # Not taught yet. Record the standards as tracked-but-unevidenced so
            # the mastery map shows them dark, flagged so aggregates can exclude
            # them from "not mastered" counts rather than penalizing students for
            # content the year has not reached.
            for standard_id in unit.standard_ids:
                standard = standards_by_id.get(standard_id)
                if standard is None:
                    continue
                mastery_records.append(
                    _mastery_record(
                        student, standard, school_year, unit, "not_mastered",
                        evidence_count=0, first_date=None, last_date=None,
                        quality_flags=["unit_not_yet_taught"],
                    )
                )
            continue

        # How much instruction did this student actually miss in this unit?
        unit_days = set(unit.instructional_days)
        missed = absences & unit_days
        missed_ratio = len(missed) / max(1, len(unit_days))

        # Missing a key instruction day costs more than missing a review day.
        key_dates = set(unit.key_dates)
        missed_key = absences & key_dates
        key_penalty = 0.22 * len(missed_key)

        for standard_id in unit.standard_ids:
            standard = standards_by_id.get(standard_id)
            if standard is None:
                continue

            already_mastered = standard_id in carried_forward

            # --- Does the student engage this standard at all? -----------------
            engagement = archetype.engagement * quarter_strength(archetype, quarter_index)
            engagement *= 1 - min(0.55, missed_ratio * 1.4)
            engaged = already_mastered or chance(rng, clamp(engagement, 0.05, 1.0))

            if not engaged:
                # No evidence at all. For an underachiever this is common and is
                # itself the signal -- a dark area on the mastery map with nothing
                # behind it, which is different from a standard attempted and missed.
                mastery_records.append(
                    _mastery_record(
                        student, standard, school_year, unit, "not_mastered",
                        evidence_count=0, first_date=None, last_date=None,
                        quality_flags=["no_evidence_recorded"],
                    )
                )
                continue

            # --- How much evidence accumulates? --------------------------------
            count = evidence_count_for(archetype, rng, quarter_index, subject)
            count = max(1, round(count * EVIDENCE_DENSITY * (1 - min(0.5, missed_ratio))))

            # A unit only partway through has only accumulated partway. Without
            # this, the in-progress unit shows a full unit's worth of evidence
            # while its pacing bar reads 40 percent.
            if as_of is not None and unit.start_date <= as_of <= unit.end_date:
                elapsed = sum(1 for d in unit.instructional_days if d <= as_of)
                progress = elapsed / max(1, len(unit.instructional_days))
                count = max(1, round(count * progress))

            # --- Does it reach mastery? ----------------------------------------
            # Penalties are MULTIPLICATIVE, not subtractive. Subtracting flat
            # amounts drove low-tier students with heavy absence straight to the
            # floor: an underachiever on a rising trajectory who missed a third of
            # a unit mastered literally nothing all year, which is neither
            # believable nor useful -- the guidelines call for "early signs of
            # mastery catching up", and a student pinned at zero shows none.
            # Scaling proportionally keeps the penalty real while leaving the
            # recovery visible.
            mastery_probability = archetype.mastery_rate
            mastery_probability *= quarter_strength(archetype, quarter_index)
            mastery_probability *= 1 - min(0.62, missed_ratio * 0.85)
            mastery_probability *= 1 - min(0.45, key_penalty)
            if archetype.situation.behavior_localized and subject == archetype.focus_subject:
                mastery_probability *= 0.45

            # A standard cannot be broadly mastered in a unit that is only partway
            # taught. This is what makes "68% mastery with three weeks remaining"
            # a meaningful sentence rather than a finished number.
            if as_of is not None and unit.start_date <= as_of <= unit.end_date:
                elapsed = sum(1 for d in unit.instructional_days if d <= as_of)
                mastery_probability *= 0.35 + 0.65 * (
                    elapsed / max(1, len(unit.instructional_days))
                )

            mastered = already_mastered or chance(
                rng, clamp(mastery_probability, 0.02, 0.98)
            )

            # --- Place the evidence in time ------------------------------------
            # Never after the viewing date: evidence dated in the future is the
            # clearest possible tell that a dataset is synthetic.
            teachable = [
                d for d in unit.instructional_days
                if (as_of is None or d <= as_of)
                and (enrolled_from is None or d >= enrolled_from)
            ]
            if not teachable:
                # Enrolled after this unit ended, or the unit had not begun by the
                # viewing date. No evidence is possible; falling back to the full
                # unit would date artifacts before the student was even enrolled.
                continue
            available = [d for d in teachable if d not in absences] or teachable
            evidence_days = sorted(
                rng.sample(available, min(count, len(available)))
            ) if available else []

            if not evidence_days:
                continue

            status = "mastered" if mastered else (
                "in_progress" if count >= 3 and chance(rng, 0.45) else "not_mastered"
            )

            record = _mastery_record(
                student, standard, school_year, unit, status,
                evidence_count=len(evidence_days),
                first_date=evidence_days[0],
                last_date=evidence_days[-1],
                quality_flags=[],
                re_demonstration=already_mastered and not full_evidence,
            )

            if full_evidence:
                for index, day in enumerate(evidence_days):
                    evidence_records.append(
                        _evidence_record(
                            rng, student, standard, record["id"], unit, day, index,
                            demonstrates=mastered and index >= len(evidence_days) - 2,
                        )
                    )
                record["evidence"] = [
                    e["id"] for e in evidence_records if e["masteryRecordId"] == record["id"]
                ]
            else:
                record["evidence"] = []

            mastery_records.append(record)

    return mastery_records, evidence_records


def _mastery_record(
    student,
    standard: Standard,
    school_year: str,
    unit: CurriculumUnit,
    status: str,
    evidence_count: int,
    first_date: dt.date | None,
    last_date: dt.date | None,
    quality_flags: list[str],
    re_demonstration: bool = False,
) -> dict:
    # Boilerplate is omitted rather than repeated on every record: metadata,
    # empty evidence lists, and false flags carried ~150 bytes each across
    # 112,000 records for no information. Absent means the default.
    record = {
        "id": f"mst-{student.id}-{school_year}-{standard.id}",
        "standardId": standard.id,
        "subject": standard.subject,
        "schoolYear": school_year,
        "curriculumUnitId": unit.id,
        "sectionId": unit.section_id,
        "status": status,
        "evidenceStrength": evidence_strength_for(evidence_count),
        "evidenceCount": evidence_count,
        "firstEvidenceDate": first_date.isoformat() if first_date else None,
        "mostRecentEvidenceDate": last_date.isoformat() if last_date else None,
        "evidence": [],
    }
    if re_demonstration:
        record["isReDemonstration"] = True
    if quality_flags:
        record["metadata"] = {"qualityFlags": quality_flags}
    return record


def _evidence_record(
    rng, student, standard: Standard, mastery_id: str,
    unit: CurriculumUnit, day: dt.date, index: int, demonstrates: bool,
) -> dict:
    source_type, source_name = rng.choice(DATA_SOURCES)
    title_template = rng.choice(ARTIFACT_TITLES[source_type])
    title = title_template.format(n=unit.sequence)

    return {
        "id": f"evd-{mastery_id}-{index + 1:02d}",
        "masteryRecordId": mastery_id,
        "studentId": student.id,
        "standardId": standard.id,
        "dataSourceType": source_type,
        # Note: NOT Python's hash() -- it is salted per process and would make the
        # dataset differ between runs, which defeats version tracking entirely.
        "dataSourceId": f"{source_name.lower().replace(' ', '-')}-{stable_digits(mastery_id, 5)}",
        "dataSourceName": source_name,
        "title": title,
        "evidenceDate": day.isoformat(),
        "studentArtifactLink": (
            f"https://classroom.example.edu/artifacts/{student.student_id}/{mastery_id}/{index + 1}"
        ),
        "analysis": {
            "demonstratesStandard": demonstrates,
            "contextNotes": rng.choice(CONTEXT_NOTES[demonstrates]),
        },
        "metadata": {
            "sourceAuthenticity": "api_integrated",
            "isApproximate": False,
        },
    }


# ---------------------------------------------------------------------------
# Participation (homework completion)
# ---------------------------------------------------------------------------

ASSIGNMENT_TITLES = [
    "Practice Set", "Reading Response", "Problem Set", "Lab Write-Up",
    "Reflection", "Review Packet", "Skills Practice", "Journal Entry",
]

# How many individual assignments to retain per section. Metrics are computed over
# all of them; only this many are stored. Enough to populate a "recent work" panel
# without carrying a full gradebook the UI never renders.
RECENT_ASSIGNMENT_WINDOW = 12


def build_participation(
    student,
    archetype: Archetype,
    section,
    units: list[CurriculumUnit],
    absences: set[dt.date],
    school_year: str,
    as_of: dt.date | None = None,
    retain_assignments: bool = True,
) -> dict:
    """Homework and assignment completion, tracked per marking period.

    Backs "homework completion dropped from 88% to 74% after the October 15th
    assembly". Completion tracks the trajectory multiplier, so a dipping student
    shows a real mid-year decline rather than uniform noise.
    """
    rng = stream(student.id, "participation", school_year, section.id)
    # (quarter, completed, assignment) so an assignment can be dropped from the
    # metrics and the retained window together. Work assigned before the cutoff
    # but not due until after it is not yet gradeable, and counting it as
    # incomplete would understate every student's completion rate mid-year.
    drafted: list[tuple[int, bool, dict]] = []

    for unit in units:
        quarter_index = min(3, max(0, unit.sequence - 1))
        count = rng.randint(6, 12)
        days = [d for d in unit.instructional_days if as_of is None or d <= as_of]
        if not days:
            continue

        base_rate = archetype.homework_completion * quarter_strength(archetype, quarter_index)

        for index in range(count):
            assigned = rng.choice(days[: max(1, len(days) - 3)])
            due = assigned + dt.timedelta(days=rng.randint(2, 6))

            # Missing the day work was assigned makes non-submission far likelier.
            rate = base_rate * (0.45 if assigned in absences else 1.0)
            rate = clamp(rate, 0.05, 0.99)

            if chance(rng, rate):
                late = chance(rng, 0.18)
                status = "completed_late" if late else "completed_on_time"
                submitted = due + dt.timedelta(days=rng.randint(1, 4)) if late else due
                completed = True
            elif assigned in absences and chance(rng, 0.35):
                status, submitted, completed = "excused", None, False
            else:
                status = "missing" if chance(rng, 0.6) else "incomplete"
                submitted, completed = None, False

            drafted.append(
                (
                    quarter_index + 1,
                    completed,
                    {
                        "id": f"asg-{student.id}-{unit.id}-{index + 1:02d}",
                        "assignmentTitle": f"{rng.choice(ASSIGNMENT_TITLES)} {unit.sequence}.{index + 1}",
                        "curriculumUnitId": unit.id,
                        "assignedDate": assigned.isoformat(),
                        "dueDate": due.isoformat(),
                        "submittedDate": submitted.isoformat() if submitted else None,
                        "completionStatus": status,
                        "standardIds": unit.standard_ids[:2],
                    },
                )
            )

    if as_of is not None:
        cutoff = as_of.isoformat()
        drafted = [entry for entry in drafted if entry[2]["dueDate"] <= cutoff]

    by_quarter: dict[int, list[bool]] = {}
    for quarter, was_completed, assignment in drafted:
        if assignment["completionStatus"] != "excused":
            by_quarter.setdefault(quarter, []).append(was_completed)

    assignments = [assignment for _, _, assignment in drafted]
    assignments.sort(key=lambda a: a["assignedDate"])
    graded = [a for a in assignments if a["completionStatus"] != "excused"]
    completed = [a for a in graded if a["completionStatus"].startswith("completed")]
    on_time = [a for a in graded if a["completionStatus"] == "completed_on_time"]

    # Store the metrics plus a recent window of assignments rather than every one.
    # The dashboards read completion RATES ("dropped from 88% to 74%"); a full
    # ledger of 240 individual assignments per secondary student is data no view
    # ever surfaces, and it dominates the dataset's size.
    recent = assignments[-RECENT_ASSIGNMENT_WINDOW:] if retain_assignments else []

    # A gradebook sync cannot have happened after the date the dataset is viewed
    # as of; for a closed prior year the last due date is the honest stand-in.
    max_due = max((a["dueDate"] for a in assignments), default=school_year[-4:] + "-06-02")

    return {
        "id": f"part-{student.id}-{school_year}-{section.id}",
        "studentId": student.id,
        "sectionId": section.id,
        "schoolYear": school_year,
        "recentAssignments": recent,
        "assignmentsRetained": len(recent),
        "assignmentsTotal": len(assignments),
        "participationObservations": [],
        "metrics": {
            "assignmentsAssigned": len(graded),
            "assignmentsCompleted": len(completed),
            "completionRate": round(100 * len(completed) / max(1, len(graded)), 1),
            "onTimeRate": round(100 * len(on_time) / max(1, len(graded)), 1),
            "completionRateByMarkingPeriod": [
                {
                    "markingPeriod": quarter,
                    "completionRate": round(100 * sum(values) / max(1, len(values)), 1),
                }
                for quarter, values in sorted(by_quarter.items())
            ],
        },
        "metadata": {
            "dataSource": "Google Classroom",
            "lastSyncDate": (as_of.isoformat() if as_of else max_due),
        },
    }


# ---------------------------------------------------------------------------
# Family engagement
# ---------------------------------------------------------------------------

CONTACT_TOPICS = {
    "positive": [
        "Sharing recent progress", "Recognition for classroom leadership",
        "Celebrating growth in reading", "Positive behavior note",
    ],
    "concern": [
        "Attendance concern", "Missing assignments", "Behavior follow-up",
        "Mastery progress discussion", "Support plan check-in",
    ],
    "routine": [
        "Fall conference", "Spring conference", "Progress report follow-up",
        "Back-to-school night", "Course selection",
    ],
}


def build_family_engagement(
    student, archetype: Archetype, calendar: SchoolCalendar, school_year: str,
    as_of: dt.date | None = None,
) -> dict:
    """Contact events and engagement metrics.

    The family-engagement-gap archetype produces solid attendance and ordinary
    mastery alongside minimal contact history -- testing whether the system
    surfaces engagement as its own signal rather than assuming a disengaged
    family means a struggling student.
    """
    rng = stream(student.id, "engagement", school_year)
    days = calendar.days_through(as_of)
    level = archetype.situation.engagement_level

    outreach_count = {
        "highly_engaged": rng.randint(8, 16),
        "moderately_engaged": rng.randint(4, 9),
        "minimally_engaged": rng.randint(3, 8),
    }[level]

    response_probability = {
        "highly_engaged": 0.92,
        "moderately_engaged": 0.70,
        "minimally_engaged": 0.24,
    }[level]

    # Concerning situations generate more school-initiated outreach regardless.
    if archetype.situation.key in ("chronic_absenteeism_recovery", "behavioral_cluster"):
        outreach_count += rng.randint(3, 7)

    events = []
    responded = 0
    school_initiated = 0
    conferences_attended = 0

    for index in range(outreach_count):
        day = rng.choice(days)
        initiator = "school staff" if chance(rng, 0.78) else "parent"
        if initiator == "school staff":
            school_initiated += 1

        if archetype.situation.key in ("chronic_absenteeism_recovery", "behavioral_cluster"):
            topic_pool = "concern"
        elif archetype.tier.key == "high_achiever":
            topic_pool = rng.choice(["positive", "routine", "routine"])
        else:
            topic_pool = rng.choice(["routine", "concern", "positive"])

        contact_type = rng.choice(
            ["phone_call", "email", "parent_conference", "meeting", "event_attendance"]
        )

        did_respond = initiator == "parent" or chance(rng, response_probability)
        if did_respond and initiator == "school staff":
            responded += 1
        if contact_type == "parent_conference" and did_respond:
            conferences_attended += 1

        events.append(
            {
                "date": day.isoformat(),
                "contactType": contact_type,
                "initiator": initiator,
                "topic": rng.choice(CONTACT_TOPICS[topic_pool]),
                "notes": (
                    "Family responded and discussed next steps."
                    if did_respond
                    else "No response received."
                ),
                "outcome": "Follow-up scheduled" if did_respond else "Additional outreach planned",
            }
        )

    events.sort(key=lambda e: e["date"])
    response_rate = round(100 * responded / max(1, school_initiated), 1)

    return {
        "id": f"eng-{student.id}-{school_year}",
        "studentId": student.id,
        "schoolYear": school_year,
        "contactEvents": events,
        "metrics": {
            "conferenceAttendance": conferences_attended,
            "outreachAttempts": school_initiated,
            "responseRate": response_rate,
            "engagementLevel": level,
        },
        "metadata": {
            "dataSource": "Student Information System",
            "lastSyncDate": (as_of or calendar.last_day).isoformat(),
        },
    }


# ---------------------------------------------------------------------------
# Prior achievement
# ---------------------------------------------------------------------------

BENCHMARK_NAMES = ["Fall Benchmark", "Winter Benchmark", "Spring Benchmark"]
SCREENER_NAMES = ["Universal Reading Screener", "Math Fact Fluency Screener", "Early Numeracy Screener"]


def build_prior_achievement(
    student, archetype: Archetype, school_year: str, subjects: list[str],
    prior_mastery_ids: list[str], as_of: dt.date | None = None,
) -> dict:
    """Benchmarks, screeners, and links to prior-year mastery.

    Transfer students carry a genuinely sparse record with honest data quality
    flags. The generator does not invent a full history to fill the gap -- the
    gap itself is the data.

    A full year's benchmark rounds are drawn regardless of `as_of`, then rounds
    dated after it are dropped. Filtering after the draw rather than skipping the
    draw keeps the random stream identical whether or not a cutoff applies, so
    prior years stay byte-identical while the current year stops where it should.
    """
    rng = stream(student.id, "prior", school_year)
    is_transfer = archetype.situation.key == "transfer_incomplete_history"

    tier_center = {"high_achiever": 78, "typical": 58, "underachiever": 38}[archetype.tier.key]

    benchmarks = []
    screeners = []
    quality_notes = []

    if is_transfer:
        quality_notes.append("Prior records incomplete: student transferred from outside the district")
        quality_notes.append("Benchmark history partially unavailable")
        benchmark_rounds = rng.randint(0, 1)
        screener_rounds = rng.randint(0, 1)
    else:
        benchmark_rounds = len(BENCHMARK_NAMES)
        screener_rounds = rng.randint(1, 2)

    fall_year = int(school_year.split("-")[0])

    for index in range(benchmark_rounds):
        for subject in rng.sample(sorted(subjects), min(3, len(subjects))):
            score = int(clamp(rng.gauss(tier_center, 11), 5, 99))
            benchmarks.append(
                {
                    "date": dt.date(
                        fall_year + (0 if index == 0 else 1),
                        [10, 1, 4][index % 3],
                        rng.randint(8, 22),
                    ).isoformat(),
                    "assessmentName": BENCHMARK_NAMES[index],
                    "subject": subject,
                    "score": score,
                    "performanceLevel": (
                        "above_grade_level" if score >= 70
                        else "at_grade_level" if score >= 45
                        else "below_grade_level"
                    ),
                    "notes": None,
                }
            )

    for index in range(screener_rounds):
        score = int(clamp(rng.gauss(tier_center, 12), 5, 99))
        risk = "low" if score >= 65 else "moderate" if score >= 40 else "high"
        screeners.append(
            {
                "date": dt.date(fall_year, 9, rng.randint(8, 25)).isoformat(),
                "screenerName": rng.choice(SCREENER_NAMES),
                "score": score,
                "riskLevel": risk,
                "recommendedIntervention": (
                    None if risk == "low"
                    else "Small-group targeted support"
                    if risk == "moderate"
                    else "Intensive intervention with progress monitoring"
                ),
            }
        )

    if as_of is not None:
        cutoff = as_of.isoformat()
        dropped = [b for b in benchmarks if b["date"] > cutoff]
        benchmarks = [b for b in benchmarks if b["date"] <= cutoff]
        screeners = [s for s in screeners if s["date"] <= cutoff]
        if dropped:
            quality_notes.append(
                f"Benchmark rounds after {cutoff} have not been administered yet"
            )

    return {
        "id": f"pri-{student.id}-{school_year}",
        "studentId": student.id,
        "schoolYear": school_year,
        "priorMasteryRecordIds": prior_mastery_ids,
        "benchmarkResults": sorted(benchmarks, key=lambda b: b["date"]),
        "screenerResults": sorted(screeners, key=lambda s: s["date"]),
        "gradeHistory": [],
        "metadata": {
            "dataSource": "Student Information System",
            "isApproximate": is_transfer,
            "historicalDataQualityNotes": quality_notes,
            "qualityFlags": ["incomplete_prior_history"] if is_transfer else [],
        },
    }
