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
