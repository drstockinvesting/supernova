"""Write the generated dataset to disk as JSON.

Sharding matters here. One file per student keeps git diffs legible -- changing
one student's data touches one file, not a 60MB blob -- and lets a future UI
lazy-load a profile instead of parsing the district.

All JSON is written sorted and with a stable separator so byte-identical input
produces byte-identical output. That is what makes the determinism check
(`regenerate, then confirm git diff is empty`) meaningful.
"""

from __future__ import annotations

import datetime as dt
import json
import shutil
from pathlib import Path

from .aggregates import build_aggregates, build_caseload_index, build_sections_context
from .archetypes import summarize_population
from .config import (
    CURRENT_SCHOOL_YEAR,
    DATASET_VERSION,
    EVIDENCE_DENSITY,
    FULL_EVIDENCE_YEARS,
    MASTER_SEED,
    SCHOOL_YEARS,
)

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "data"


def _write(path: Path, payload, compact: bool = False) -> int:
    """Write JSON deterministically.

    Reference and district files are indented -- people read those directly.
    Student profiles are compact: they are machine-read, and indentation triples
    the dataset's size for no benefit. Diff locality comes from one-file-per-student,
    not from line breaks inside the file.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    if compact:
        text = json.dumps(payload, separators=(",", ":"), sort_keys=True, ensure_ascii=False)
    else:
        text = json.dumps(payload, indent=2, sort_keys=True, ensure_ascii=False)
    path.write_text(text + "\n", encoding="utf-8")
    return len(text)


def emit(dataset, data_dir: Path = DATA_DIR) -> dict:
    """Write the full dataset. Returns a summary for the manifest."""
    # Clear generated output so removed records don't linger as stale files.
    for subdir in ("reference", "district", "students", "aggregates"):
        target = data_dir / subdir
        if target.exists():
            shutil.rmtree(target)

    bytes_written = 0

    # --- Reference ----------------------------------------------------------
    bytes_written += _write(
        data_dir / "reference" / "standards.json",
        {"frameworks": dataset.frameworks, "standards": dataset.standards},
    )
    bytes_written += _write(
        data_dir / "reference" / "research-citations.json",
        {
            "reviewWarning": (
                "No claim in this library has been signed off. A source check ran "
                "on 2026-08-18 and found no clean claim in it; each citation's "
                "`review` records what that check found. A source check is not a "
                "verification -- only a named human accepting a claim produces "
                "review.status 'verified', and none has. Nothing here should be "
                "surfaced in a stakeholder-facing view without its unverified "
                "marker. See docs/supernova-research-review.md."
            ),
            "citations": dataset.citations,
        },
    )
    bytes_written += _write(
        data_dir / "reference" / "calendars.json", dataset.calendars, compact=True
    )

    # --- District -----------------------------------------------------------
    bytes_written += _write(data_dir / "district" / "district.json", dataset.district)
    bytes_written += _write(data_dir / "district" / "schools.json", dataset.schools)
    bytes_written += _write(data_dir / "district" / "staff.json", dataset.staff)
    bytes_written += _write(data_dir / "district" / "sections.json", dataset.sections)
    bytes_written += _write(
        data_dir / "district" / "curriculum-units.json", dataset.units, compact=True
    )
    bytes_written += _write(
        data_dir / "district" / "interruptions.json", dataset.interruptions
    )
    bytes_written += _write(data_dir / "district" / "guardians.json", dataset.guardians)
    bytes_written += _write(
        data_dir / "district" / "users.json", dataset.users, compact=True
    )
    bytes_written += _write(data_dir / "district" / "students.json", dataset.students)

    # --- Students: profile and evidence in separate files -------------------
    # Evidence artifacts are roughly three quarters of a student's data but are
    # only needed when someone drills into a specific standard. Splitting them out
    # keeps the profile -- mastery map, attendance, context layers -- small enough
    # to load on its own, which is how the UI will actually consume it.
    for student in dataset.students:
        student_id = student["id"]
        profile = dataset.profiles[student_id]
        base = data_dir / "students" / student["schoolId"]

        evidence_by_year = {}
        slim = {**profile, "years": {}}
        for year, payload in profile["years"].items():
            evidence_by_year[year] = payload["evidence"]
            slim["years"][year] = {**payload, "evidence": []}
            slim["years"][year]["evidenceCount"] = len(payload["evidence"])
        slim["evidenceFile"] = f"{student_id}.evidence.json"

        bytes_written += _write(base / f"{student_id}.json", slim, compact=True)
        if any(evidence_by_year.values()):
            bytes_written += _write(
                base / f"{student_id}.evidence.json",
                {"studentId": student_id, "evidenceByYear": evidence_by_year},
                compact=True,
            )

    # --- Aggregates ---------------------------------------------------------
    aggregates = build_aggregates(dataset)
    bytes_written += _write(data_dir / "aggregates" / "current-year.json", aggregates)

    # Section context splits the way profiles do: an index every classroom-grid
    # view can load eagerly, and one roster file per section fetched only when
    # that classroom is opened. Rosters carry per-student attendance, behaviour,
    # and per-unit mastery, duplicated across a secondary student's six sections
    # -- keeping them out of the index is what keeps the index small.
    sections_index, sections_detail = build_sections_context(dataset)
    bytes_written += _write(data_dir / "aggregates" / "sections-context.json", sections_index)
    for section_id, payload in sorted(sections_detail.items()):
        bytes_written += _write(
            data_dir / "aggregates" / "sections" / f"{section_id}.json", payload, compact=True
        )

    # The caseload index splits by building rather than by section, because the
    # accounts that read it are scoped to a building and two of the three hold no
    # aggregate mastery at all. One file per school is the whole grain: a nurse
    # loads their own building and never the other two.
    for school_id, payload in sorted(build_caseload_index(dataset).items()):
        bytes_written += _write(
            data_dir / "aggregates" / "caseload" / f"{school_id}.json", payload, compact=True
        )

    # --- Manifest -----------------------------------------------------------
    population = summarize_population(list(dataset.archetypes.values()))
    manifest = {
        "datasetVersion": DATASET_VERSION,
        "generator": "supernova-generator",
        "masterSeed": MASTER_SEED,
        "deterministic": True,
        "determinismNote": (
            "The same master seed always produces byte-identical output. After "
            "regenerating, `git diff` should be empty unless the generator changed."
        ),
        "schoolYears": SCHOOL_YEARS,
        "currentSchoolYear": CURRENT_SCHOOL_YEAR,
        "fullEvidenceYears": FULL_EVIDENCE_YEARS,
        "evidenceDensity": EVIDENCE_DENSITY,
        "counts": dataset.counts,
        "populationDistribution": population,
        "approximateBytes": bytes_written,
        "syntheticDataNotice": (
            "Every student, guardian, and staff member in this dataset is "
            "synthetic. No real student record, name, or artifact appears anywhere."
        ),
    }
    _write(data_dir / "manifest.json", manifest)

    return manifest
