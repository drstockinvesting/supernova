"""The generation pipeline.

Strict dependency order, because the order is what produces the correlations:

    1. Reference    calendar, standards catalog, research citations
    2. Organization district, schools, staff, sections, guardians, users
    3. Curriculum   units with date windows and pacing, interruptions
    4. Enrollment   students into sections, archetype assignment
    5. Streams      per student, in dependency order (mastery LAST)
    6. Longitudinal prior years, with mastery permanence carried forward
    7. Aggregates   rollups at section / grade / school / district level
"""

from __future__ import annotations

import datetime as dt
import json
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

from .archetypes import Archetype, assign_archetype, summarize_population
from .calendar import SchoolCalendar, build_calendar
from .config import (
    CURRENT_SCHOOL_YEAR,
    DATASET_VERSION,
    FULL_EVIDENCE_YEARS,
    MASTER_SEED,
    SCHOOLS,
    SCHOOL_YEARS,
    SUBJECTS,
)
from .entities import organization as org
from .entities.access import build_users
from .entities.curriculum import build_interruptions, build_units_for_section
from .entities.mastery import (
    build_family_engagement,
    build_mastery_for_subject,
    build_participation,
    build_prior_achievement,
)
from .entities.streams import (
    absent_dates,
    build_attendance,
    build_behavior,
    build_health,
    build_special_services,
)
from .research import RESEARCH_CITATIONS
from .standards_catalog import GRADE_SEQUENCE, Catalog, load_catalog

# The dataset is generated as if viewed partway through the current year, so the
# dashboards have in-progress units and live pacing rather than a finished year.
AS_OF_DATE = dt.date(2025, 2, 10)


@dataclass
class Dataset:
    district: dict = field(default_factory=dict)
    schools: list[dict] = field(default_factory=list)
    staff: list[dict] = field(default_factory=list)
    students: list[dict] = field(default_factory=list)
    guardians: list[dict] = field(default_factory=list)
    users: list[dict] = field(default_factory=list)
    calendars: list[dict] = field(default_factory=list)
    sections: list[dict] = field(default_factory=list)
    units: list[dict] = field(default_factory=list)
    interruptions: list[dict] = field(default_factory=list)
    standards: list[dict] = field(default_factory=list)
    frameworks: list[dict] = field(default_factory=list)
    citations: list[dict] = field(default_factory=list)
    # studentId -> full longitudinal profile
    profiles: dict[str, dict] = field(default_factory=dict)
    archetypes: dict[str, Archetype] = field(default_factory=dict)
    counts: dict = field(default_factory=dict)


def generate() -> Dataset:
    dataset = Dataset()
    catalog = load_catalog()
    standards_by_id = catalog.by_id()

    dataset.standards = [s.to_record() for s in catalog]
    dataset.frameworks = catalog.frameworks
    dataset.citations = RESEARCH_CITATIONS

    # --- 1. Reference: calendars -------------------------------------------
    calendars: dict[tuple[str, str], SchoolCalendar] = {}
    for config in SCHOOLS:
        for year in SCHOOL_YEARS:
            calendar = build_calendar(config.key, year)
            calendars[(config.key, year)] = calendar
            dataset.calendars.append(calendar.to_record())

    # --- 2. Organization ----------------------------------------------------
    staff_by_school: dict[str, list] = {}
    students_by_school: dict[str, list] = {}
    all_students: list = []

    for config in SCHOOLS:
        staff = org.build_staff(config, catalog)
        staff_by_school[config.key] = staff
        dataset.staff.extend(s.to_record() for s in staff)

        students = org.build_students(config)
        students_by_school[config.key] = students
        all_students.extend(students)

    district_staff = org.build_district_staff()
    dataset.staff.extend(s.to_record() for s in district_staff)

    # --- 3. Enrollment: archetypes and history ------------------------------
    for student in all_students:
        archetype = assign_archetype(student.id, CURRENT_SCHOOL_YEAR, SUBJECTS)
        dataset.archetypes[student.id] = archetype
        org.assign_student_history(student, archetype.situation.key)

    # --- 4. Sections and curriculum, per year -------------------------------
    sections_by_year: dict[str, list] = {}
    units_by_section: dict[str, list] = {}

    for year in SCHOOL_YEARS:
        year_sections: list = []
        for config in SCHOOLS:
            # A student's grade in a prior year is their current grade minus the
            # year offset. Students who were below K that year simply weren't enrolled.
            offset = len(SCHOOL_YEARS) - 1 - SCHOOL_YEARS.index(year)
            enrolled = []
            for student in students_by_school[config.key]:
                if year not in student.school_years:
                    continue
                grade_index = GRADE_SEQUENCE.index(student.grade_level) - offset
                if grade_index < 0:
                    continue
                enrolled.append((student, GRADE_SEQUENCE[grade_index]))

            # Sections are built against the grade the student was in THAT year.
            shadow = [_shadow_student(s, g) for s, g in enrolled]
            shadow_by_grade = defaultdict(list)
            for item in shadow:
                shadow_by_grade[item.grade_level].append(item)

            # Only build sections for grades this school actually covers.
            in_school = [s for s in shadow if s.grade_level in config.grades]
            if not in_school:
                continue

            sections = org.build_sections(config, staff_by_school[config.key], in_school, year, catalog)
            year_sections.extend(sections)

        sections_by_year[year] = year_sections
        if year == CURRENT_SCHOOL_YEAR:
            dataset.sections = [s.to_record() for s in year_sections]

        for section in year_sections:
            calendar = calendars[(section.school_id, year)]
            subjects = SUBJECTS if section.subject == "all" else [section.subject]
            units: list = []
            for subject in subjects:
                units.extend(
                    build_units_for_section(
                        section, calendar, catalog, subject,
                        as_of=AS_OF_DATE if year == CURRENT_SCHOOL_YEAR else None,
                    )
                )
            units_by_section[section.id] = units

            if year == CURRENT_SCHOOL_YEAR:
                dataset.units.extend(u.to_record() for u in units)
                teacher_id = section.teacher_id
                dataset.interruptions.append(
                    build_interruptions(section, calendar, units, teacher_id)
                )

    # --- 5. Guardians and users ---------------------------------------------
    guardians = org.build_guardians(all_students)
    dataset.guardians = [g.to_record() for g in guardians]

    current_sections = sections_by_year[CURRENT_SCHOOL_YEAR]
    users = build_users(
        staff_by_school, district_staff, current_sections, all_students,
        guardians, [c.key for c in SCHOOLS], org.DISTRICT_ID,
    )
    dataset.users = [u.to_record() for u in users]

    # --- 6. Per-student streams, all years ----------------------------------
    sections_for_student: dict[tuple[str, str], list] = defaultdict(list)
    for year, sections in sections_by_year.items():
        for section in sections:
            for student_id in section.roster:
                sections_for_student[(student_id, year)].append(section)

    for student in all_students:
        archetype = dataset.archetypes[student.id]
        dataset.students.append(student.to_record())
        dataset.profiles[student.id] = _build_profile(
            student, archetype, calendars, sections_for_student,
            units_by_section, standards_by_id, catalog,
        )

    # --- 7. School and district records --------------------------------------
    for config in SCHOOLS:
        roster = [s.id for s in students_by_school[config.key]]
        dataset.schools.append(org.build_school(config, roster))

    dataset.district = org.build_district([c.key for c in SCHOOLS], catalog.frameworks)

    # --- 8. Counts -----------------------------------------------------------
    dataset.counts = _count(dataset)
    return dataset


@dataclass
class _ShadowStudent:
    """A student as they were in a prior year -- same identity, earlier grade."""

    id: str
    first_name: str
    last_name: str
    grade_level: str
    school_id: str
    student_id: str
    enrollment_date: str

    @property
    def display_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


def _shadow_student(student, grade_level: str) -> _ShadowStudent:
    return _ShadowStudent(
        id=student.id,
        first_name=student.first_name,
        last_name=student.last_name,
        grade_level=grade_level,
        school_id=student.school_id,
        student_id=student.student_id,
        enrollment_date=student.enrollment_date,
    )


def _build_profile(
    student,
    archetype: Archetype,
    calendars: dict,
    sections_for_student: dict,
    units_by_section: dict,
    standards_by_id: dict,
    catalog: Catalog,
) -> dict:
    """One student's full longitudinal profile across every year they attended."""
    profile = {
        "studentId": student.id,
        "student": student.to_record(),
        "generatorArchetype": archetype.to_record(),
        "schoolYears": student.school_years,
        "years": {},
    }

    # Mastery is permanent: once a standard is mastered it stays mastered in every
    # later year. Carried forward across years, never reverted.
    carried_forward: set[str] = set()
    prior_mastery_ids: list[str] = []

    for year in student.school_years:
        calendar = calendars[(student.school_id, year)]
        sections = sections_for_student.get((student.id, year), [])
        full_evidence = year in FULL_EVIDENCE_YEARS

        as_of = AS_OF_DATE if year == CURRENT_SCHOOL_YEAR else None

        # --- attendance first: everything downstream reads from it ------------
        attendance = build_attendance(student, archetype, calendar, year, as_of=as_of)
        absences = absent_dates(attendance)

        behavior = build_behavior(
            student, archetype, calendar, year, sections, {}, as_of=as_of
        )
        health = build_health(student, archetype, calendar, year, as_of=as_of)
        services = build_special_services(
            student, archetype, calendar, year, SUBJECTS, as_of=as_of
        )

        participation: list[dict] = []
        mastery: list[dict] = []
        evidence: list[dict] = []

        for section in sections:
            units = units_by_section.get(section.id, [])
            if not units:
                continue

            participation.append(
                build_participation(
                    student, archetype, section, units, absences, year, as_of=as_of
                )
            )

            subjects = SUBJECTS if section.subject == "all" else [section.subject]
            for subject in subjects:
                subject_units = [u for u in units if u.subject == subject]
                if not subject_units:
                    continue
                records, artifacts = build_mastery_for_subject(
                    student, archetype, year, subject, subject_units,
                    standards_by_id, absences, calendar, carried_forward,
                    full_evidence,
                    as_of=AS_OF_DATE if year == CURRENT_SCHOOL_YEAR else None,
                )
                mastery.extend(records)
                evidence.extend(artifacts)

        # Carry newly mastered standards into every later year.
        for record in mastery:
            if record["status"] == "mastered":
                carried_forward.add(record["standardId"])

        engagement = build_family_engagement(
            student, archetype, calendar, year, as_of=as_of
        )
        prior = build_prior_achievement(
            student, archetype, year, SUBJECTS, prior_mastery_ids[-40:]
        )
        prior_mastery_ids.extend(r["id"] for r in mastery if r["status"] == "mastered")

        # Link IEP goals to the mastery evidence that supports them, per integrity
        # rule 6 -- IEP goals must not float free of the academic record.
        if services and services.get("iepStatus"):
            _link_iep_goals(services["iepStatus"], mastery)

        profile["years"][year] = {
            "schoolYear": year,
            "gradeLevel": _grade_for_year(student, year),
            "sectionIds": [s.id for s in sections],
            "attendance": attendance,
            "behavior": behavior,
            "health": health,
            "specialServices": services,
            "participation": participation,
            "mastery": mastery,
            "evidence": evidence,
            "familyEngagement": engagement,
            "priorAchievement": prior,
            "summary": _year_summary(mastery, attendance, behavior, participation),
        }

    return profile


def _grade_for_year(student, year: str) -> str:
    offset = len(SCHOOL_YEARS) - 1 - SCHOOL_YEARS.index(year)
    index = GRADE_SEQUENCE.index(student.grade_level) - offset
    return GRADE_SEQUENCE[max(0, index)]


def _link_iep_goals(iep_status: dict, mastery: list[dict]) -> None:
    """Attach supporting mastery records to each IEP goal in its subject."""
    by_subject: dict[str, list[str]] = defaultdict(list)
    for record in mastery:
        if record["evidenceCount"] > 0:
            by_subject[record["subject"]].append(record["id"])

    for goal in iep_status["goals"]:
        goal["evidence"] = by_subject.get(goal.get("subject", ""), [])[:6]


def _not_yet_taught(record: dict) -> bool:
    return "unit_not_yet_taught" in record["metadata"]["qualityFlags"]


def _year_summary(mastery, attendance, behavior, participation) -> dict:
    """Precomputed per-year rollup, so dashboards read rather than recompute.

    Mastery rates are computed over standards actually TAUGHT so far, not over
    the whole year's standards. In February a student has not been taught the
    fourth-quarter content, and counting it against them would make every
    mid-year mastery rate meaninglessly low and identical across students.
    """
    taught = [m for m in mastery if not _not_yet_taught(m)]

    total = len(taught)
    mastered = sum(1 for m in taught if m["status"] == "mastered")
    in_progress = sum(1 for m in taught if m["status"] == "in_progress")
    no_evidence = sum(1 for m in taught if m["evidenceCount"] == 0)
    not_yet_taught = len(mastery) - total

    strength_counts: dict[str, int] = defaultdict(int)
    for record in taught:
        strength_counts[record["evidenceStrength"]] += 1

    by_subject: dict[str, dict] = defaultdict(lambda: {"total": 0, "mastered": 0})
    for record in taught:
        entry = by_subject[record["subject"]]
        entry["total"] += 1
        if record["status"] == "mastered":
            entry["mastered"] += 1
    for entry in by_subject.values():
        entry["masteryRate"] = round(100 * entry["mastered"] / max(1, entry["total"]), 1)

    completion_rates = [p["metrics"]["completionRate"] for p in participation]

    return {
        "standardsTaughtToDate": total,
        "standardsNotYetTaught": not_yet_taught,
        "standardsTrackedFullYear": len(mastery),
        "standardsMastered": mastered,
        "standardsInProgress": in_progress,
        "standardsWithNoEvidence": no_evidence,
        "masteryRate": round(100 * mastered / max(1, total), 1),
        "evidenceStrengthCounts": dict(sorted(strength_counts.items())),
        "masteryBySubject": {k: dict(v) for k, v in sorted(by_subject.items())},
        "attendanceRate": attendance["metrics"]["attendanceRate"],
        "chronicAbsenteeismFlag": attendance["metrics"]["chronicAbsenteeismFlag"],
        "totalBehaviorIncidents": behavior["metrics"]["totalIncidents"],
        "disciplineReferralCount": behavior["metrics"]["disciplineReferralCount"],
        "homeworkCompletionRate": (
            round(sum(completion_rates) / len(completion_rates), 1)
            if completion_rates else None
        ),
    }


def _count(dataset: Dataset) -> dict:
    mastery_total = evidence_total = 0
    for profile in dataset.profiles.values():
        for year in profile["years"].values():
            mastery_total += len(year["mastery"])
            evidence_total += len(year["evidence"])

    return {
        "schools": len(dataset.schools) or len(SCHOOLS),
        "staff": len(dataset.staff),
        "students": len(dataset.students),
        "guardians": len(dataset.guardians),
        "users": len(dataset.users),
        "sections": len(dataset.sections),
        "curriculumUnits": len(dataset.units),
        "interruptionRecords": len(dataset.interruptions),
        "standards": len(dataset.standards),
        "researchCitations": len(dataset.citations),
        "masteryRecords": mastery_total,
        "evidenceArtifacts": evidence_total,
        "schoolYears": len(SCHOOL_YEARS),
    }
