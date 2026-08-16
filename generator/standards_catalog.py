"""Load and index the curated standards catalog.

The catalog lives as one JSON file per framework under ``generator/standards/``.
Each file carries framework metadata (version, source URL, text fidelity) alongside
its standards, so provenance travels with the data rather than living in a README.

Standard IDs are *derived* from the standard code rather than stored, which keeps
the JSON files readable and guarantees that the same code always produces the same
ID across regenerations.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterator

STANDARDS_DIR = Path(__file__).parent / "standards"

# Grade levels in the order a student moves through them.
GRADE_SEQUENCE = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]

SUBJECTS = [
    "Math",
    "ELA",
    "Science",
    "Social Studies",
    "Arts",
    "Physical Education",
]


def standard_id(code: str) -> str:
    """Derive a stable, filesystem- and URL-safe ID from a standard code.

    ``CCSS.MATH.CONTENT.3.OA.A.1`` -> ``std-ccss-math-content-3-oa-a-1``
    ``VA:Cr1.1.HSI``               -> ``std-va-cr1-1-hsi``
    """
    slug = re.sub(r"[^a-z0-9]+", "-", code.lower()).strip("-")
    return f"std-{slug}"


@dataclass(frozen=True)
class Standard:
    id: str
    code: str
    framework: str
    framework_abbreviation: str
    framework_version: str
    subject: str
    grade_level: str
    course: str
    domain: str
    cluster: str
    text: str
    advanced: bool = False
    proficiency_level: str | None = None

    def to_record(self) -> dict:
        """Serialize to the Standard record shape from the data structures doc."""
        record = {
            "id": self.id,
            "framework": self.framework,
            "subject": self.subject,
            "gradeLevel": self.grade_level,
            "course": self.course,
            "standardCode": self.code,
            "standardText": self.text,
            "domainOrCluster": self.domain,
            "cluster": self.cluster,
            "metadata": {
                "frameworkVersion": self.framework_version,
                "frameworkAbbreviation": self.framework_abbreviation,
            },
        }
        if self.advanced:
            record["advanced"] = True
        if self.proficiency_level:
            record["proficiencyLevel"] = self.proficiency_level
        return record


@dataclass
class Catalog:
    standards: list[Standard] = field(default_factory=list)
    frameworks: list[dict] = field(default_factory=list)

    def __iter__(self) -> Iterator[Standard]:
        return iter(self.standards)

    def __len__(self) -> int:
        return len(self.standards)

    def for_grade_subject(self, grade_level: str, subject: str) -> list[Standard]:
        """All standards a student at this grade studies in this subject."""
        return [
            s
            for s in self.standards
            if s.grade_level == grade_level and s.subject == subject
        ]

    def course_name(self, grade_level: str, subject: str) -> str | None:
        matches = self.for_grade_subject(grade_level, subject)
        return matches[0].course if matches else None

    def by_id(self) -> dict[str, Standard]:
        return {s.id: s for s in self.standards}


def load_catalog(standards_dir: Path = STANDARDS_DIR) -> Catalog:
    """Load every framework file, sorted by filename for deterministic ordering."""
    catalog = Catalog()

    for path in sorted(standards_dir.glob("*.json")):
        with path.open(encoding="utf-8") as handle:
            data = json.load(handle)

        catalog.frameworks.append(
            {
                "framework": data["framework"],
                "abbreviation": data["frameworkAbbreviation"],
                "version": data["frameworkVersion"],
                "subject": data["subject"],
                "sourceUrl": data["sourceUrl"],
                "textFidelity": data["textFidelity"],
                "attribution": data.get("attribution"),
                "note": data.get("note"),
                "standardCount": len(data["standards"]),
            }
        )

        for entry in data["standards"]:
            catalog.standards.append(
                Standard(
                    id=standard_id(entry["code"]),
                    code=entry["code"],
                    framework=data["framework"],
                    framework_abbreviation=data["frameworkAbbreviation"],
                    framework_version=data["frameworkVersion"],
                    subject=data["subject"],
                    grade_level=entry["gradeLevel"],
                    course=entry["course"],
                    domain=entry["domain"],
                    cluster=entry["cluster"],
                    text=entry["text"],
                    advanced=entry.get("advanced", False),
                    proficiency_level=entry.get("proficiencyLevel"),
                )
            )

    return catalog


def validate_catalog(catalog: Catalog) -> list[str]:
    """Structural checks on the catalog itself, before any student data exists.

    A gap here silently becomes a gap in every mastery map, so these run first.
    """
    problems: list[str] = []

    seen_ids: dict[str, str] = {}
    for standard in catalog:
        if standard.id in seen_ids:
            problems.append(
                f"Duplicate standard ID {standard.id!r}: "
                f"{seen_ids[standard.id]!r} and {standard.code!r}"
            )
        seen_ids[standard.id] = standard.code

        if standard.grade_level not in GRADE_SEQUENCE:
            problems.append(
                f"{standard.code}: grade level {standard.grade_level!r} is not a valid grade"
            )
        if standard.subject not in SUBJECTS:
            problems.append(
                f"{standard.code}: subject {standard.subject!r} is not a known subject"
            )
        if not standard.text.strip():
            problems.append(f"{standard.code}: empty standard text")

    # Every grade must have standards in every subject, or that grade's mastery map
    # renders with an empty column and the fractal view breaks down.
    for grade in GRADE_SEQUENCE:
        for subject in SUBJECTS:
            matches = catalog.for_grade_subject(grade, subject)
            if not matches:
                problems.append(f"No standards for grade {grade} in {subject}")
            elif len(matches) < 5:
                problems.append(
                    f"Only {len(matches)} standards for grade {grade} in {subject} "
                    "(a mastery map needs at least 5 to read as populated)"
                )

            # One course per grade per subject, per the fixed course model.
            courses = {s.course for s in matches}
            if len(courses) > 1:
                problems.append(
                    f"Grade {grade} {subject} maps to multiple courses: {sorted(courses)}"
                )

    # A standard shared between two grades would arrive at the second grade already
    # mastered, because mastery is permanent.
    by_code: dict[str, set[str]] = {}
    for standard in catalog:
        by_code.setdefault(standard.code, set()).add(standard.grade_level)
    for code, grades in by_code.items():
        if len(grades) > 1:
            problems.append(
                f"{code} is assigned to multiple grades {sorted(grades)}; "
                "mastery permanence would pre-master it in the later grade"
            )

    return problems


if __name__ == "__main__":
    catalog = load_catalog()
    problems = validate_catalog(catalog)

    print(f"Loaded {len(catalog)} standards from {len(catalog.frameworks)} frameworks\n")

    for framework in catalog.frameworks:
        print(f"  {framework['abbreviation']:8} {framework['subject']:20} "
              f"{framework['standardCount']:4} standards")

    print("\nStandards per grade and subject:")
    header = "  grade  " + "".join(f"{s[:12]:>14}" for s in SUBJECTS)
    print(header)
    for grade in GRADE_SEQUENCE:
        counts = "".join(
            f"{len(catalog.for_grade_subject(grade, subject)):>14}" for subject in SUBJECTS
        )
        print(f"  {grade:>5}  {counts}")

    total_per_grade = {
        grade: sum(len(catalog.for_grade_subject(grade, s)) for s in SUBJECTS)
        for grade in GRADE_SEQUENCE
    }
    print(f"\nStandards per grade: min {min(total_per_grade.values())}, "
          f"max {max(total_per_grade.values())}")

    if problems:
        print(f"\n{len(problems)} PROBLEM(S):")
        for problem in problems:
            print(f"  - {problem}")
        raise SystemExit(1)

    print("\nCatalog validation passed.")
