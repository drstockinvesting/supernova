"""Precomputed rollups at every zoom level of the fractal architecture.

The design's premise is that the same structure repeats from a single section up
to the whole district. These aggregates are that structure, computed once at
generation time so dashboards read a number rather than sweeping 100,000 mastery
records on every page load.

Rollups reconcile by construction: section totals sum to grade, grade to school,
school to district. The validation suite checks that they actually do.
"""

from __future__ import annotations

from collections import defaultdict

from .config import CURRENT_SCHOOL_YEAR, SUBJECTS

# Below this many students, a "school-level aggregate" can identify individuals at
# the extremes. Public-facing views must suppress cells under this threshold.
PUBLIC_SUPPRESSION_THRESHOLD = 10


def _blank() -> dict:
    return {
        "studentCount": 0,
        "standardsTaughtToDate": 0,
        "standardsMastered": 0,
        "evidenceStrengthCounts": defaultdict(int),
        "attendanceRates": [],
        "behaviorIncidents": 0,
        "disciplineReferrals": 0,
        "chronicallyAbsentStudents": 0,
        "homeworkCompletionRates": [],
        "bySubject": defaultdict(lambda: {"taught": 0, "mastered": 0}),
    }


def _finalize(bucket: dict, label: str, extra: dict | None = None) -> dict:
    taught = bucket["standardsTaughtToDate"]
    mastered = bucket["standardsMastered"]
    attendance = bucket["attendanceRates"]
    homework = bucket["homeworkCompletionRates"]

    by_subject = {}
    for subject, entry in sorted(bucket["bySubject"].items()):
        by_subject[subject] = {
            "standardsTaughtToDate": entry["taught"],
            "standardsMastered": entry["mastered"],
            "masteryRate": round(100 * entry["mastered"] / max(1, entry["taught"]), 1),
        }

    result = {
        "label": label,
        "studentCount": bucket["studentCount"],
        "standardsTaughtToDate": taught,
        "standardsMastered": mastered,
        "masteryRate": round(100 * mastered / max(1, taught), 1),
        "evidenceStrengthCounts": dict(sorted(bucket["evidenceStrengthCounts"].items())),
        "attendanceRate": round(sum(attendance) / len(attendance), 1) if attendance else None,
        "chronicallyAbsentStudents": bucket["chronicallyAbsentStudents"],
        "chronicAbsenteeismRate": round(
            100 * bucket["chronicallyAbsentStudents"] / max(1, bucket["studentCount"]), 1
        ),
        "totalBehaviorIncidents": bucket["behaviorIncidents"],
        "disciplineReferrals": bucket["disciplineReferrals"],
        "homeworkCompletionRate": (
            round(sum(homework) / len(homework), 1) if homework else None
        ),
        "masteryBySubject": by_subject,
        # Public dashboards must suppress small cells; with three schools a
        # grade-level aggregate can be small enough to identify a student at the
        # extremes. The flag is computed here so every consumer applies the same rule.
        "suppressForPublicDisplay": bucket["studentCount"] < PUBLIC_SUPPRESSION_THRESHOLD,
    }
    if extra:
        result.update(extra)
    return result


def _accumulate(bucket: dict, summary: dict, mastery: list[dict]) -> None:
    bucket["studentCount"] += 1
    bucket["standardsTaughtToDate"] += summary["standardsTaughtToDate"]
    bucket["standardsMastered"] += summary["standardsMastered"]
    bucket["behaviorIncidents"] += summary["totalBehaviorIncidents"]
    bucket["disciplineReferrals"] += summary["disciplineReferralCount"]

    if summary["attendanceRate"] is not None:
        bucket["attendanceRates"].append(summary["attendanceRate"])
    if summary["chronicAbsenteeismFlag"]:
        bucket["chronicallyAbsentStudents"] += 1
    if summary["homeworkCompletionRate"] is not None:
        bucket["homeworkCompletionRates"].append(summary["homeworkCompletionRate"])

    for strength, count in summary["evidenceStrengthCounts"].items():
        bucket["evidenceStrengthCounts"][strength] += count

    for subject, entry in summary["masteryBySubject"].items():
        target = bucket["bySubject"][subject]
        target["taught"] += entry["total"]
        target["mastered"] += entry["mastered"]


def build_aggregates(dataset, school_year: str = CURRENT_SCHOOL_YEAR) -> dict:
    """Roll student summaries up through section, grade, school, and district."""
    students_by_id = {s["id"]: s for s in dataset.students}
    schools_by_id = {s["id"]: s for s in dataset.schools}
    sections_by_id = {s["id"]: s for s in dataset.sections}

    section_buckets: dict[str, dict] = defaultdict(_blank)
    grade_buckets: dict[tuple[str, str], dict] = defaultdict(_blank)
    school_buckets: dict[str, dict] = defaultdict(_blank)
    district_bucket = _blank()

    # Per-section mastery needs the section a record belongs to, which mastery
    # records carry directly.
    section_mastery: dict[str, dict] = defaultdict(
        lambda: {"taught": 0, "mastered": 0, "students": set()}
    )

    for student_id, profile in dataset.profiles.items():
        year = profile["years"].get(school_year)
        if not year:
            continue

        summary = year["summary"]
        student = students_by_id.get(student_id)
        if not student:
            continue

        school_id = student["schoolId"]
        grade = year["gradeLevel"]

        _accumulate(grade_buckets[(school_id, grade)], summary, year["mastery"])
        _accumulate(school_buckets[school_id], summary, year["mastery"])
        _accumulate(district_bucket, summary, year["mastery"])

        for record in year["mastery"]:
            if "unit_not_yet_taught" in record.get("metadata", {}).get("qualityFlags", []):
                continue
            entry = section_mastery[record["sectionId"]]
            entry["taught"] += 1
            entry["students"].add(student_id)
            if record["status"] == "mastered":
                entry["mastered"] += 1

    # --- Sections -----------------------------------------------------------
    sections = []
    for section_id, entry in sorted(section_mastery.items()):
        section = sections_by_id.get(section_id)
        if not section:
            continue
        sections.append(
            {
                "sectionId": section_id,
                "sectionName": section["name"],
                "schoolId": section["schoolId"],
                "gradeLevel": section["gradeLevel"],
                "subject": section["subject"],
                "teacherId": section["teacherId"],
                "studentCount": len(entry["students"]),
                "standardsTaughtToDate": entry["taught"],
                "standardsMastered": entry["mastered"],
                "masteryRate": round(100 * entry["mastered"] / max(1, entry["taught"]), 1),
                "suppressForPublicDisplay": True,  # section detail is never public
            }
        )

    # --- Grades -------------------------------------------------------------
    grades = []
    for (school_id, grade), bucket in sorted(grade_buckets.items()):
        grades.append(
            _finalize(
                bucket,
                label=f"Grade {grade}",
                extra={"schoolId": school_id, "gradeLevel": grade},
            )
        )

    # --- Schools ------------------------------------------------------------
    schools = []
    for school_id, bucket in sorted(school_buckets.items()):
        school = schools_by_id.get(school_id, {})
        schools.append(
            _finalize(
                bucket,
                label=school.get("name", school_id),
                extra={"schoolId": school_id, "gradesCovered": school.get("gradesCovered", [])},
            )
        )

    district = _finalize(
        district_bucket,
        label=dataset.district.get("name", "District"),
        extra={"districtId": dataset.district.get("id")},
    )

    return {
        "schoolYear": school_year,
        "district": district,
        "schools": schools,
        "grades": grades,
        "sections": sections,
        "publicSuppressionThreshold": PUBLIC_SUPPRESSION_THRESHOLD,
    }


# ---------------------------------------------------------------------------
# Section context
# ---------------------------------------------------------------------------
#
# `build_aggregates` gives a section its mastery rate and nothing else, which is
# all the district rollup needs. The teacher's classroom view needs the layers
# that *explain* that rate -- attendance, homework, behaviour, pacing, and
# interruptions -- per section and per unit. Computing them in the browser would
# mean fetching every roster member's profile, so they are computed here.
#
# The output splits the same way profiles do. The index carries one summary per
# section and is read by any view that shows a grid of classrooms; the roster
# detail is a file per section, fetched only when someone opens that classroom.
# Rosters are the bulk of the data and are duplicated across a secondary
# student's six sections, so keeping them out of the index is what keeps the
# index small enough to load eagerly.


# Unit fields the classroom drill-down needs and a classroom card does not. They
# are the bulk of a unit record, so they ride with the roster file rather than
# with the index that every classroom-grid view loads.
_UNIT_DETAIL_ONLY = {"standardIds", "keyInstructionDates", "markingPeriodId", "plannedInstructionalDays"}


def _rate(numerator: int, denominator: int) -> float:
    return round(100 * numerator / max(1, denominator), 1)


def _mean(values: list[float]) -> float | None:
    return round(sum(values) / len(values), 1) if values else None


def _attributed_to_section(incident: dict, section: dict) -> bool:
    """Whether an incident can be laid at this section's door.

    Behaviour is recorded per student per year, not per period -- the district's
    SIS has no notion of which class a student was in when something happened.
    What incidents do carry is a `subject`, set when the incident localizes to
    one. A self-contained elementary section is the student's whole day, so every
    incident belongs to it; a departmentalized section can only claim the ones
    naming its own subject. Incidents with no subject are counted separately
    rather than being assigned by guesswork.
    """
    if section["instructionalModel"] == "self_contained":
        return True
    return incident.get("subject") == section["subject"]


def build_sections_context(dataset, school_year: str = CURRENT_SCHOOL_YEAR) -> tuple[dict, dict]:
    """Per-section context, as (index, roster detail keyed by section id)."""
    students_by_id = {s["id"]: s for s in dataset.students}

    units_by_section: dict[str, list[dict]] = defaultdict(list)
    for unit in dataset.units:
        if unit["schoolYear"] == school_year:
            units_by_section[unit["sectionId"]].append(unit)

    interruptions_by_section = {
        record["sectionId"]: record
        for record in dataset.interruptions
        if record["schoolYear"] == school_year
    }

    index: list[dict] = []
    detail: dict[str, dict] = {}

    for section in sorted(dataset.sections, key=lambda s: s["id"]):
        if section["schoolYear"] != school_year:
            continue

        section_id = section["id"]
        units = sorted(units_by_section.get(section_id, []), key=lambda u: (u["subject"], u["sequence"]))
        interruption_record = interruptions_by_section.get(section_id)

        # --- Interruptions, bucketed by the unit they disrupted ---------------
        interruptions_by_unit: dict[str, dict] = defaultdict(
            lambda: {"count": 0, "unplanned": 0, "minutesLost": 0}
        )
        for entry in (interruption_record or {}).get("interruptions", []):
            bucket = interruptions_by_unit[entry.get("curriculumUnitId") or ""]
            bucket["count"] += 1
            bucket["minutesLost"] += entry["minutesLost"]
            if not entry["wasPlanned"]:
                bucket["unplanned"] += 1

        # --- Roster ----------------------------------------------------------
        roster: list[dict] = []
        unit_totals: dict[str, dict] = defaultdict(lambda: {"taught": 0, "mastered": 0})
        subject_totals: dict[str, dict] = defaultdict(lambda: {"taught": 0, "mastered": 0})
        strength_counts: dict[str, int] = defaultdict(int)

        taught_total = mastered_total = 0
        attendance_rates: list[float] = []
        homework_rates: list[float] = []
        chronically_absent = 0
        incidents_attributed = incidents_unattributed = 0
        referrals_total = 0

        for student_id in section["roster"]:
            profile = dataset.profiles.get(student_id)
            student = students_by_id.get(student_id)
            if not profile or not student:
                continue
            year = profile["years"].get(school_year)
            if not year:
                continue

            by_unit: dict[str, dict] = defaultdict(lambda: {"taught": 0, "mastered": 0})
            taught = mastered = 0
            for record in year["mastery"]:
                if record["sectionId"] != section_id:
                    continue
                # Content the class has not reached is not a failure to master it.
                if "unit_not_yet_taught" in record.get("metadata", {}).get("qualityFlags", []):
                    continue

                taught += 1
                strength_counts[record["evidenceStrength"]] += 1
                subject_totals[record["subject"]]["taught"] += 1
                unit_id = record.get("curriculumUnitId")
                if unit_id:
                    by_unit[unit_id]["taught"] += 1
                if record["status"] == "mastered":
                    mastered += 1
                    subject_totals[record["subject"]]["mastered"] += 1
                    if unit_id:
                        by_unit[unit_id]["mastered"] += 1

            for unit_id, entry in by_unit.items():
                unit_totals[unit_id]["taught"] += entry["taught"]
                unit_totals[unit_id]["mastered"] += entry["mastered"]

            taught_total += taught
            mastered_total += mastered

            participation = next(
                (p for p in year["participation"] if p["sectionId"] == section_id), None
            )
            completion = participation["metrics"]["completionRate"] if participation else None
            if completion is not None:
                homework_rates.append(completion)

            attendance = year["attendance"]["metrics"]
            if attendance["attendanceRate"] is not None:
                attendance_rates.append(attendance["attendanceRate"])
            if attendance["chronicAbsenteeismFlag"]:
                chronically_absent += 1

            incidents = [
                {
                    "date": incident["date"],
                    "incidentType": incident["incidentType"],
                    "severity": incident["severity"],
                    "subject": incident.get("subject"),
                    "description": incident["description"],
                    "attributedToSection": _attributed_to_section(incident, section),
                }
                for incident in year["behavior"]["incidents"]
            ]
            attributed = sum(1 for entry in incidents if entry["attributedToSection"])
            incidents_attributed += attributed
            incidents_unattributed += len(incidents) - attributed
            referrals_total += year["behavior"]["metrics"]["disciplineReferralCount"]

            roster.append(
                {
                    "studentId": student_id,
                    "firstName": student["firstName"],
                    "lastName": student["lastName"],
                    "standardsTaughtToDate": taught,
                    "standardsMastered": mastered,
                    "masteryRate": _rate(mastered, taught),
                    "masteryByUnit": {
                        unit_id: entry for unit_id, entry in sorted(by_unit.items())
                    },
                    # A student can be on a roster with no participation record for
                    # it. Absent is not the same as zero, so the flag is explicit
                    # rather than inferred from a null rate.
                    "hasParticipationRecord": participation is not None,
                    "homeworkCompletionRate": completion,
                    "completionRateByMarkingPeriod": (
                        participation["metrics"]["completionRateByMarkingPeriod"]
                        if participation
                        else []
                    ),
                    "attendanceRate": attendance["attendanceRate"],
                    "daysAbsent": attendance["daysAbsent"],
                    "chronicAbsenteeismFlag": attendance["chronicAbsenteeismFlag"],
                    # Exceptions only, as attendance is stored -- present days are
                    # recovered from the school calendar. Enough to plot an absence
                    # against the day a unit introduced its key content.
                    "attendanceExceptions": [
                        {"date": entry["date"], "status": entry["status"]}
                        for entry in year["attendance"]["attendanceExceptions"]
                    ],
                    "behaviorIncidents": incidents,
                    "disciplineReferralCount": year["behavior"]["metrics"][
                        "disciplineReferralCount"
                    ],
                }
            )

        # --- Units ------------------------------------------------------------
        unit_entries = []
        for unit in units:
            totals = unit_totals.get(unit["id"], {"taught": 0, "mastered": 0})
            disruption = interruptions_by_unit.get(
                unit["id"], {"count": 0, "unplanned": 0, "minutesLost": 0}
            )
            unit_entries.append(
                {
                    "unitId": unit["id"],
                    "name": unit["name"],
                    "subject": unit["subject"],
                    "sequence": unit["sequence"],
                    "markingPeriodId": unit["markingPeriodId"],
                    "startDate": unit["startDate"],
                    "endDate": unit["endDate"],
                    "status": unit["status"],
                    "plannedInstructionalDays": unit["plannedInstructionalDays"],
                    "pacing": unit["pacing"],
                    "standardIds": unit["standardIds"],
                    "keyInstructionDates": unit["keyInstructionDates"],
                    "standardsTaughtToDate": totals["taught"],
                    "standardsMastered": totals["mastered"],
                    "masteryRate": _rate(totals["mastered"], totals["taught"]),
                    "interruptions": dict(disruption),
                }
            )

        # A departmentalized section teaches one unit at a time. A self-contained
        # elementary section teaches six -- one per subject -- so this is a list,
        # and the view decides what "the current unit" means for each model.
        #
        # The index carries the units in progress and nothing else. A classroom
        # card shows the current unit's pacing and mastery; the full unit list,
        # with its standards and key instruction dates, is drill-down data and
        # rides with the roster file.
        active_units = [
            {key: value for key, value in unit.items() if key not in _UNIT_DETAIL_ONLY}
            for unit in unit_entries
            if unit["status"] == "in_progress"
        ]

        summary = {
            "sectionId": section_id,
            "sectionName": section["name"],
            "schoolId": section["schoolId"],
            "schoolYear": school_year,
            "gradeLevel": section["gradeLevel"],
            "subject": section["subject"],
            "instructionalModel": section["instructionalModel"],
            "teacherId": section["teacherId"],
            "coTeacherIds": section["coTeacherIds"],
            "period": section["period"],
            "roomNumber": section["roomNumber"],
            "studentCount": len(roster),
            "standardsTaughtToDate": taught_total,
            "standardsMastered": mastered_total,
            "masteryRate": _rate(mastered_total, taught_total),
            "evidenceStrengthCounts": dict(sorted(strength_counts.items())),
            "masteryBySubject": {
                subject: {
                    "standardsTaughtToDate": entry["taught"],
                    "standardsMastered": entry["mastered"],
                    "masteryRate": _rate(entry["mastered"], entry["taught"]),
                }
                for subject, entry in sorted(subject_totals.items())
            },
            # Attendance is a school-day record, not a period one. For a
            # departmentalized section this is the roster's whole-day attendance
            # rather than attendance in this period; the view says so.
            "attendanceRate": _mean(attendance_rates),
            "chronicallyAbsentStudents": chronically_absent,
            "chronicAbsenteeismRate": _rate(chronically_absent, len(roster)),
            "homeworkCompletionRate": _mean(homework_rates),
            "studentsWithoutParticipationRecord": sum(
                1 for row in roster if not row["hasParticipationRecord"]
            ),
            "attributedBehaviorIncidents": incidents_attributed,
            "unattributedBehaviorIncidents": incidents_unattributed,
            "disciplineReferrals": referrals_total,
            "interruptions": (interruption_record or {}).get(
                "metrics",
                {
                    "totalInterruptions": 0,
                    "unplannedInterruptions": 0,
                    "totalMinutesLost": 0,
                    "averageInterruptionsPerUnit": 0,
                },
            ),
            "activeUnits": active_units,
            "unitCount": len(unit_entries),
            "suppressForPublicDisplay": True,  # section detail is never public
        }

        index.append(summary)
        detail[section_id] = {
            "sectionId": section_id,
            "schoolYear": school_year,
            "units": unit_entries,
            "roster": roster,
        }

    return (
        {
            "schoolYear": school_year,
            "sections": index,
            "rosterFilePattern": "aggregates/sections/{sectionId}.json",
        },
        detail,
    )
