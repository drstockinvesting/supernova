"""District, schools, staff, sections, students, guardians, and access control.

Built in dependency order: the district needs schools, schools need staff, sections
need teachers and students, and users need all of them to point at. Nothing here
touches the seven data streams -- this is the scaffolding they hang from.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field

from ..config import (
    CURRENT_SCHOOL_YEAR,
    DISTRICT_NAME,
    DISTRICT_STATE,
    SCHOOLS,
    SCHOOL_YEARS,
    SUBJECTS,
    SchoolConfig,
)
from ..names import (
    CITY,
    FIRST_NAMES,
    LAST_NAMES,
    STATE_ABBR,
    STREET_NAMES,
    STREET_TYPES,
)
from ..rng import chance, stream
from ..standards_catalog import GRADE_SEQUENCE, Catalog

DISTRICT_ID = "dist-constellation"


# ---------------------------------------------------------------------------
# People
# ---------------------------------------------------------------------------


def _full_name(rng) -> tuple[str, str]:
    return rng.choice(FIRST_NAMES), rng.choice(LAST_NAMES)


def _email(first: str, last: str, domain: str, discriminator: str) -> str:
    return f"{first[0].lower()}{last.lower().replace(' ', '')}{discriminator}@{domain}"


def _address(rng) -> str:
    number = rng.randint(12, 4890)
    return (
        f"{number} {rng.choice(STREET_NAMES)} {rng.choice(STREET_TYPES)}, "
        f"{CITY}, {STATE_ABBR} {rng.randint(15200, 15299)}"
    )


@dataclass
class Staff:
    id: str
    first_name: str
    last_name: str
    staff_id: str
    role: str
    school_id: str | None
    subjects_taught: list[str]
    grade_levels_taught: list[str]
    email: str
    hire_date: str

    @property
    def display_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    def to_record(self) -> dict:
        return {
            "id": self.id,
            "firstName": self.first_name,
            "lastName": self.last_name,
            "staffId": self.staff_id,
            "role": self.role,
            "schoolId": self.school_id,
            "districtId": DISTRICT_ID,
            "subjectsTaught": self.subjects_taught,
            "gradeLevelsTaught": self.grade_levels_taught,
            "email": self.email,
            "hireDate": self.hire_date,
            "employmentStatus": "active",
            "metadata": {"dataSource": "supernova-generator", "isApproximate": False},
        }


@dataclass
class Section:
    id: str
    school_id: str
    school_year: str
    name: str
    grade_level: str
    subject: str
    teacher_id: str
    period: str | None
    room_number: str
    instructional_model: str
    roster: list[str] = field(default_factory=list)

    def to_record(self) -> dict:
        return {
            "id": self.id,
            "schoolId": self.school_id,
            "schoolYear": self.school_year,
            "name": self.name,
            "gradeLevel": self.grade_level,
            "subject": self.subject,
            "teacherId": self.teacher_id,
            "coTeacherIds": [],
            "period": self.period,
            "roomNumber": self.room_number,
            "instructionalModel": self.instructional_model,
            "roster": self.roster,
            "enrollmentCount": len(self.roster),
            "metadata": {"dataSource": "supernova-generator", "isApproximate": False},
        }


@dataclass
class Student:
    id: str
    first_name: str
    last_name: str
    date_of_birth: str
    student_id: str
    grade_level: str  # current-year grade
    school_id: str
    enrollment_date: str
    enrollment_status: str
    quality_flags: list[str] = field(default_factory=list)
    # Years this student has data for, oldest first.
    school_years: list[str] = field(default_factory=list)

    @property
    def display_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    def to_record(self) -> dict:
        return {
            "id": self.id,
            "firstName": self.first_name,
            "lastName": self.last_name,
            "dateOfBirth": self.date_of_birth,
            "studentId": self.student_id,
            "currentGradeLevel": self.grade_level,
            "enrollmentStatus": self.enrollment_status,
            "enrollmentDate": self.enrollment_date,
            "schoolId": self.school_id,
            "districtId": DISTRICT_ID,
            "metadata": {
                "dataSource": "supernova-generator",
                "isApproximate": False,
                "qualityFlags": self.quality_flags,
                "schoolYearsOnRecord": self.school_years,
            },
        }


@dataclass
class Guardian:
    id: str
    first_name: str
    last_name: str
    relationship: str
    email: str
    phone: str
    preferred_contact_method: str
    preferred_language: str
    student_links: list[dict] = field(default_factory=list)

    @property
    def display_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    def to_record(self) -> dict:
        return {
            "id": self.id,
            "firstName": self.first_name,
            "lastName": self.last_name,
            "relationship": self.relationship,
            "email": self.email,
            "phone": self.phone,
            "preferredContactMethod": self.preferred_contact_method,
            "preferredLanguage": self.preferred_language,
            "studentLinks": self.student_links,
            "metadata": {"dataSource": "supernova-generator", "isApproximate": False},
        }


# ---------------------------------------------------------------------------
# Builders
# ---------------------------------------------------------------------------


def build_district(school_ids: list[str], frameworks: list[dict]) -> dict:
    return {
        "id": DISTRICT_ID,
        "name": DISTRICT_NAME,
        "state": DISTRICT_STATE,
        "superintendent": "Dr. Rosalind Achebe",
        "schools": school_ids,
        "metadata": {"dataSource": "supernova-generator", "isApproximate": False},
        "configuration": {
            "standardsFrameworksInUse": [f["framework"] for f in frameworks],
            "dataSourcesConnected": [
                "District Attendance System",
                "Google Classroom",
                "District Assessment Platform",
                "Student Information System",
                "Behavior Tracking System",
                "Health Office Records",
            ],
        },
    }


def build_school(config: SchoolConfig, student_ids: list[str]) -> dict:
    rng = stream(config.key, "school")
    return {
        "id": config.key,
        "name": config.name,
        "districtId": DISTRICT_ID,
        "gradesCovered": config.grades,
        "address": _address(rng),
        "principalName": f"{config.principal_first} {config.principal_last}",
        "instructionalModel": config.instructional_model,
        "metadata": {"dataSource": "supernova-generator", "isApproximate": False},
        "students": student_ids,
    }


def build_staff(config: SchoolConfig, catalog: Catalog) -> list[Staff]:
    """Teachers plus the support roles the health and services streams reference.

    Self-contained elementary needs one teacher per section covering all subjects.
    Departmentalized secondary needs a teacher per subject per section.
    """
    rng = stream(config.key, "staff")
    staff: list[Staff] = []
    used_names: set[tuple[str, str]] = set()
    counter = 0

    def make(role: str, subjects: list[str], grades: list[str]) -> Staff:
        nonlocal counter
        counter += 1
        for _ in range(60):
            first, last = _full_name(rng)
            if (first, last) not in used_names:
                break
        used_names.add((first, last))
        return Staff(
            id=f"staff-{config.key}-{counter:03d}",
            first_name=first,
            last_name=last,
            staff_id=f"{config.key[:3].upper()}{counter:04d}",
            role=role,
            school_id=config.key,
            subjects_taught=subjects,
            grade_levels_taught=grades,
            email=_email(first, last, "constellation.k12.pa.us", str(counter)),
            hire_date=f"{rng.randint(2004, 2023)}-08-{rng.randint(10, 28):02d}",
        )

    # Building administrator
    staff.append(make("building_administrator", [], config.grades))

    if config.is_self_contained:
        # One teacher per section, teaching every subject to that group.
        for grade in config.grades:
            for _ in range(config.sections_per_grade):
                staff.append(make("teacher", list(SUBJECTS), [grade]))
    else:
        # One teacher per subject per section slot; a secondary teacher covers
        # multiple grades in their subject, which is how real departments work.
        for subject in SUBJECTS:
            teachers_needed = max(2, (len(config.grades) * config.sections_per_grade) // 4)
            for _ in range(teachers_needed):
                staff.append(make("teacher", [subject], list(config.grades)))

    # Support roles referenced by the health and special services streams.
    staff.append(make("counselor", [], config.grades))
    staff.append(make("nurse", [], config.grades))
    staff.append(make("special_education_teacher", [], config.grades))

    return staff


def build_district_staff() -> list[Staff]:
    rng = stream("district", "staff")
    staff = []
    for index, role in enumerate(["district_administrator", "district_administrator"], start=1):
        first, last = _full_name(rng)
        staff.append(
            Staff(
                id=f"staff-district-{index:03d}",
                first_name=first,
                last_name=last,
                staff_id=f"DIS{index:04d}",
                role=role,
                school_id=None,
                subjects_taught=[],
                grade_levels_taught=list(GRADE_SEQUENCE),
                email=_email(first, last, "constellation.k12.pa.us", f"d{index}"),
                hire_date=f"{rng.randint(2006, 2020)}-07-01",
            )
        )
    return staff


def build_students(config: SchoolConfig) -> list[Student]:
    """Create the current-year roster for one school."""
    rng = stream(config.key, "students")
    students: list[Student] = []
    used_names: set[tuple[str, str]] = set()
    counter = 0

    current_fall_year = int(CURRENT_SCHOOL_YEAR.split("-")[0])

    for grade in config.grades:
        count = config.sections_per_grade * config.target_section_size
        # Vary section fill so every classroom isn't identically sized.
        count += rng.randint(-4, 4)

        for _ in range(count):
            counter += 1
            for _ in range(80):
                first, last = _full_name(rng)
                if (first, last) not in used_names:
                    break
            used_names.add((first, last))

            grade_index = GRADE_SEQUENCE.index(grade)
            # A kindergartner turns 5 the year they start; add grade index from there.
            birth_year = current_fall_year - 5 - grade_index
            dob = dt.date(birth_year, rng.randint(1, 12), rng.randint(1, 28))

            students.append(
                Student(
                    id=f"stu-{config.key[:3]}-{counter:04d}",
                    first_name=first,
                    last_name=last,
                    date_of_birth=dob.isoformat(),
                    student_id=f"{config.key[:3].upper()}{100000 + counter}",
                    grade_level=grade,
                    school_id=config.key,
                    enrollment_date="",  # filled once archetype is known
                    enrollment_status="active",
                )
            )

    return students


def assign_student_history(student: Student, situation_key: str) -> None:
    """Decide which school years a student has data for, and their enrollment date.

    Transfer students genuinely lack earlier years. The generator does not invent
    a history to fill the gap -- it records the gap as a data quality flag, which
    is what the guidelines document asks for.
    """
    rng = stream(student.id, "history")
    current_index = SCHOOL_YEARS.index(CURRENT_SCHOOL_YEAR)
    grade_index = GRADE_SEQUENCE.index(student.grade_level)

    # A student can't have more prior years than grades they've completed.
    max_years = min(len(SCHOOL_YEARS), grade_index + 1)

    if situation_key == "transfer_incomplete_history":
        years_present = rng.choice([1, 1, 2]) if max_years > 1 else 1
        student.quality_flags.append("incomplete_prior_history")
        student.quality_flags.append("transferred_from_outside_district")
    else:
        years_present = max_years

    years_present = min(years_present, max_years)
    student.school_years = SCHOOL_YEARS[current_index - years_present + 1 : current_index + 1]

    first_year = student.school_years[0]
    fall_year = int(first_year.split("-")[0])
    if situation_key == "transfer_incomplete_history" and len(student.school_years) < max_years:
        # Mid-year arrival.
        student.enrollment_date = dt.date(
            fall_year, rng.choice([10, 11, 1, 2]), rng.randint(6, 24)
        ).isoformat() if rng.random() < 0.5 else dt.date(
            fall_year + 1, rng.choice([1, 2]), rng.randint(6, 24)
        ).isoformat()
    else:
        student.enrollment_date = dt.date(fall_year, 8, rng.randint(22, 30)).isoformat()


def build_sections(
    config: SchoolConfig,
    staff: list[Staff],
    students: list[Student],
    school_year: str,
    catalog: Catalog,
) -> list[Section]:
    """Place students into sections.

    Self-contained: one section per student, covering every subject.
    Departmentalized: one section per subject per student, six in total.
    """
    rng = stream(config.key, "sections", school_year)
    sections: list[Section] = []

    teachers = [s for s in staff if s.role == "teacher"]

    for grade in config.grades:
        grade_students = sorted(
            [s for s in students if s.grade_level == grade], key=lambda s: s.id
        )
        if not grade_students:
            continue

        if config.is_self_contained:
            grade_teachers = [t for t in teachers if grade in t.grade_levels_taught]
            section_count = min(config.sections_per_grade, max(1, len(grade_teachers)))
            buckets = _split_evenly(grade_students, section_count)

            for index, bucket in enumerate(buckets):
                teacher = grade_teachers[index % len(grade_teachers)]
                sections.append(
                    Section(
                        id=f"sec-{config.key}-{school_year}-g{grade}-{index + 1}",
                        school_id=config.key,
                        school_year=school_year,
                        name=f"Grade {grade} - {teacher.last_name}",
                        grade_level=grade,
                        subject="all",
                        teacher_id=teacher.id,
                        period=None,
                        room_number=f"{grade if grade != 'K' else '0'}{index + 1:02d}",
                        instructional_model="self_contained",
                        roster=[s.id for s in bucket],
                    )
                )
        else:
            for subject in SUBJECTS:
                subject_teachers = [t for t in teachers if subject in t.subjects_taught]
                if not subject_teachers:
                    continue
                section_count = config.sections_per_grade
                buckets = _split_evenly(
                    _rotate(grade_students, SUBJECTS.index(subject)), section_count
                )
                course = catalog.course_name(grade, subject) or subject

                for index, bucket in enumerate(buckets):
                    if not bucket:
                        continue
                    teacher = subject_teachers[
                        (index + GRADE_SEQUENCE.index(grade)) % len(subject_teachers)
                    ]
                    period = str((SUBJECTS.index(subject) % 7) + 1)
                    sections.append(
                        Section(
                            id=(
                                f"sec-{config.key}-{school_year}-g{grade}-"
                                f"{subject.lower().replace(' ', '')}-{index + 1}"
                            ),
                            school_id=config.key,
                            school_year=school_year,
                            name=f"{course} - Period {period} ({teacher.last_name})",
                            grade_level=grade,
                            subject=subject,
                            teacher_id=teacher.id,
                            period=period,
                            room_number=f"{rng.randint(100, 320)}",
                            instructional_model="departmentalized",
                            roster=[s.id for s in bucket],
                        )
                    )

    return sections


def _split_evenly(items: list, buckets: int) -> list[list]:
    """Split a list into `buckets` near-equal groups, preserving order."""
    if buckets <= 0:
        return [items]
    result: list[list] = [[] for _ in range(buckets)]
    for index, item in enumerate(items):
        result[index % buckets].append(item)
    return result


def _rotate(items: list, offset: int) -> list:
    """Rotate a roster so students aren't grouped identically in every subject."""
    if not items:
        return items
    shift = (offset * 7) % len(items)
    return items[shift:] + items[:shift]


def build_guardians(students: list[Student]) -> list[Guardian]:
    """One or two guardians per student, with sibling links where surnames match."""
    rng = stream("district", "guardians")
    guardians: list[Guardian] = []
    by_surname: dict[str, Guardian] = {}
    counter = 0

    for student in sorted(students, key=lambda s: s.id):
        srng = stream(student.id, "guardian")

        # Siblings: a student may share a guardian with an earlier student of the
        # same surname at the same school. This is what makes the parent dashboard's
        # multi-child case real rather than hypothetical.
        sibling_key = f"{student.last_name}|{student.school_id}"
        if sibling_key in by_surname and chance(srng, 0.55):
            existing = by_surname[sibling_key]
            existing.student_links.append(
                {
                    "studentId": student.id,
                    "custodyStatus": "primary",
                    "hasEducationalRights": True,
                }
            )
            continue

        counter += 1
        relationship = srng.choice(
            ["mother", "mother", "father", "father", "grandparent", "legal_guardian"]
        )
        first = srng.choice(FIRST_NAMES)
        primary = Guardian(
            id=f"grd-{counter:05d}",
            first_name=first,
            last_name=student.last_name,
            relationship=relationship,
            email=_email(first, student.last_name, "example.com", str(counter)),
            phone=f"(724) 555-{srng.randint(1000, 9999)}",
            preferred_contact_method=srng.choice(["email", "phone", "text", "email"]),
            preferred_language=srng.choice(
                ["English"] * 12 + ["Spanish", "Spanish", "Vietnamese", "Arabic", "Mandarin"]
            ),
            student_links=[
                {
                    "studentId": student.id,
                    "custodyStatus": "primary",
                    "hasEducationalRights": True,
                }
            ],
        )
        guardians.append(primary)
        by_surname[sibling_key] = primary

        # A second guardian, sometimes without educational rights. Custody is
        # frequently asymmetric, and the permission model must handle that.
        if chance(srng, 0.62):
            counter += 1
            second_first = srng.choice(FIRST_NAMES)
            has_rights = chance(srng, 0.88)
            guardians.append(
                Guardian(
                    id=f"grd-{counter:05d}",
                    first_name=second_first,
                    last_name=student.last_name,
                    relationship="father" if relationship == "mother" else "mother",
                    email=_email(second_first, student.last_name, "example.com", str(counter)),
                    phone=f"(724) 555-{srng.randint(1000, 9999)}",
                    preferred_contact_method=srng.choice(["email", "phone", "text"]),
                    preferred_language=primary.preferred_language,
                    student_links=[
                        {
                            "studentId": student.id,
                            "custodyStatus": "secondary" if has_rights else "none",
                            "hasEducationalRights": has_rights,
                        }
                    ],
                )
            )

    return guardians
