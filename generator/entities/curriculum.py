"""Curriculum units, key instruction dates, and interruptions.

This is the layer that makes the flagship correlation possible. A student's
absence dates only mean something when compared against what was being taught on
those dates. Without units carrying date windows and standard lists, the system
can report absence *counts* but never absence *impact* -- and "three students
missed the Unit 2 introduction on September 14th" has nothing behind it.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field

from ..calendar import MarkingPeriod, SchoolCalendar
from ..config import UNITS_PER_MARKING_PERIOD
from ..rng import chance, clamp, stream
from ..standards_catalog import Catalog, Standard

# Unit naming by subject. Real units have topic names, not "Unit 3".
UNIT_THEMES = {
    "Math": [
        "Number Sense and Operations", "Patterns and Relationships",
        "Measurement and Data", "Geometry and Spatial Reasoning",
        "Fractions and Proportional Thinking", "Algebraic Reasoning",
        "Data Analysis and Probability", "Modeling with Mathematics",
    ],
    "ELA": [
        "Foundations of Reading", "Narrative Craft", "Informational Text and Research",
        "Argument and Evidence", "Language and Conventions", "Poetry and Figurative Language",
        "Comparative Reading", "Speaking, Listening, and Presentation",
    ],
    "Science": [
        "Scientific Inquiry", "Matter and Its Properties", "Forces and Motion",
        "Energy and Transfer", "Living Systems", "Ecosystems and Interdependence",
        "Earth Systems", "Human Impact and Sustainability",
    ],
    "Social Studies": [
        "Communities and Citizenship", "Geography and Place", "Economics and Choice",
        "Historical Inquiry", "Government and Civic Life", "Culture and Society",
        "Change and Continuity", "Taking Informed Action",
    ],
    "Arts": [
        "Elements and Principles", "Studio Practice and Media", "Composition and Design",
        "Critique and Response", "Art in Context", "Portfolio and Presentation",
        "Experimentation and Risk", "Personal Voice",
    ],
    "Physical Education": [
        "Movement Fundamentals", "Fitness Concepts", "Invasion Games",
        "Net and Wall Games", "Rhythm and Dance", "Personal and Social Responsibility",
        "Lifetime Activity", "Health-Related Fitness",
    ],
}

INTERRUPTION_TYPES = [
    ("assembly", "School-wide assembly", 45, True),
    ("fire_drill", "Scheduled fire drill", 20, True),
    ("lockdown_drill", "Safety drill", 25, True),
    ("schedule_change", "Modified bell schedule", 30, False),
    ("early_dismissal", "Weather-related early dismissal", 60, False),
    ("pull_out", "Student pull-out for testing", 40, True),
    ("testing_window", "State assessment window", 90, True),
    ("technology_failure", "Network or device outage", 35, False),
    ("substitute_coverage", "Unfilled substitute coverage", 50, False),
]


@dataclass
class CurriculumUnit:
    id: str
    section_id: str
    school_year: str
    subject: str
    name: str
    sequence: int
    marking_period_id: str
    start_date: dt.date
    end_date: dt.date
    instructional_days: list[dt.date]
    standard_ids: list[str]
    key_instruction_dates: list[dict]
    percent_content_covered: int
    percent_time_elapsed: int
    pacing_status: str
    status: str

    def covers_date(self, date: dt.date) -> bool:
        return self.start_date <= date <= self.end_date

    @property
    def key_dates(self) -> list[dt.date]:
        return [dt.date.fromisoformat(k["date"]) for k in self.key_instruction_dates]

    def to_record(self) -> dict:
        return {
            "id": self.id,
            "sectionId": self.section_id,
            "schoolYear": self.school_year,
            "subject": self.subject,
            "name": self.name,
            "sequence": self.sequence,
            "markingPeriodId": self.marking_period_id,
            "startDate": self.start_date.isoformat(),
            "endDate": self.end_date.isoformat(),
            "plannedInstructionalDays": len(self.instructional_days),
            "standardIds": self.standard_ids,
            "keyInstructionDates": self.key_instruction_dates,
            "pacing": {
                "percentContentCovered": self.percent_content_covered,
                "percentTimeElapsed": self.percent_time_elapsed,
                "pacingStatus": self.pacing_status,
            },
            "status": self.status,
            "metadata": {"dataSource": "supernova-generator", "isApproximate": False},
        }


def build_units_for_section(
    section,
    calendar: SchoolCalendar,
    catalog: Catalog,
    subject: str,
    as_of: dt.date | None = None,
) -> list[CurriculumUnit]:
    """Lay a subject's standards out across the year as sequenced units.

    Every standard for the grade and subject lands in exactly one unit, so a
    mastery map covers the year completely and no standard is orphaned.
    """
    rng = stream(section.id, "units", subject)
    standards = catalog.for_grade_subject(section.grade_level, subject)
    if not standards:
        return []

    total_units = len(calendar.marking_periods) * UNITS_PER_MARKING_PERIOD
    buckets = _distribute_standards(standards, total_units)
    themes = UNIT_THEMES.get(subject, [f"{subject} Unit"] * total_units)

    units: list[CurriculumUnit] = []
    sequence = 0
    used_themes: set[str] = set()

    for period in calendar.marking_periods:
        day_chunks = _split_days(period.instructional_days, UNITS_PER_MARKING_PERIOD)

        for chunk in day_chunks:
            if not chunk:
                continue
            unit_standards = buckets[sequence] if sequence < len(buckets) else []
            sequence += 1

            theme = _unit_theme(unit_standards, themes, sequence)
            if theme in used_themes:
                # A domain large enough to span two units continues into the next
                # one. Say so, rather than borrowing an unrelated generic theme --
                # a Biology unit must never end up named "Forces and Motion".
                part = sum(1 for t in used_themes if t.startswith(theme)) + 1
                theme = f"{theme}, Part {part}"
            used_themes.add(theme)

            key_dates = _key_instruction_dates(rng, chunk, unit_standards)

            unit = CurriculumUnit(
                id=f"unit-{section.id}-{sequence}",
                section_id=section.id,
                school_year=section.school_year,
                subject=subject,
                name=f"Unit {sequence}: {theme}",
                sequence=sequence,
                marking_period_id=period.id,
                start_date=chunk[0],
                end_date=chunk[-1],
                instructional_days=chunk,
                standard_ids=[s.id for s in unit_standards],
                key_instruction_dates=key_dates,
                percent_content_covered=0,
                percent_time_elapsed=0,
                pacing_status="on_track",
                status="not_started",
            )
            _apply_pacing(unit, rng, as_of)
            units.append(unit)

    return units


def _unit_theme(standards: list[Standard], fallback_themes: list[str], sequence: int) -> str:
    """Name a unit after the standards it actually contains.

    A generic theme list would put "Number Sense and Operations" on an Algebra II
    unit. Deriving the name from the dominant domain of the unit's own standards
    keeps unit names true to their content -- which matters, because the unit name
    is what a teacher reads on the classroom card.
    """
    if not standards:
        return fallback_themes[(sequence - 1) % len(fallback_themes)]

    counts: dict[str, int] = {}
    for standard in standards:
        counts[standard.domain] = counts.get(standard.domain, 0) + 1
    dominant = max(sorted(counts), key=lambda d: counts[d])

    # Framework domains carry a category prefix ("Algebra - Creating Equations",
    # "Dimension 2: History"). The trailing part is the readable topic.
    for separator in (" - ", ": "):
        if separator in dominant:
            dominant = dominant.split(separator, 1)[1]

    return dominant


def _distribute_standards(standards: list[Standard], buckets: int) -> list[list[Standard]]:
    """Spread standards across units in contiguous, domain-ordered chunks.

    Contiguous rather than round-robin: a real unit covers a coherent group of
    related standards, not one standard from each domain. Round-robin also makes
    every unit share the same dominant domain, which produces four units with
    identical names.
    """
    ordered = sorted(standards, key=lambda s: (s.domain, s.code))
    result: list[list[Standard]] = [[] for _ in range(buckets)]

    base, remainder = divmod(len(ordered), buckets)
    cursor = 0
    for index in range(buckets):
        size = base + (1 if index < remainder else 0)
        result[index] = ordered[cursor : cursor + size]
        cursor += size

    return result


def _split_days(days: list[dt.date], chunks: int) -> list[list[dt.date]]:
    if chunks <= 1:
        return [days]
    size = len(days) // chunks
    result = []
    for index in range(chunks):
        start = index * size
        end = len(days) if index == chunks - 1 else (index + 1) * size
        result.append(days[start:end])
    return result


def _key_instruction_dates(rng, days: list[dt.date], standards: list[Standard]) -> list[dict]:
    """Flag the days that actually mattered in a unit.

    Without this, every absence looks equally consequential. Marking introduction
    and core-concept days is what lets the system distinguish a student who missed
    a review day from one who missed the day a standard was introduced.
    """
    if not days or not standards:
        return []

    key_dates = []
    # The opening day is always consequential.
    key_dates.append(
        {
            "date": days[0].isoformat(),
            "description": "Unit introduction and core concept",
            "standardIds": [s.id for s in standards[: max(1, len(standards) // 2)]],
        }
    )

    # One or two mid-unit development days.
    if len(days) > 6:
        for _ in range(rng.randint(1, 2)):
            index = rng.randint(2, len(days) - 3)
            key_dates.append(
                {
                    "date": days[index].isoformat(),
                    "description": "Core skill development",
                    "standardIds": [s.id for s in rng.sample(
                        standards, min(len(standards), rng.randint(1, 3))
                    )],
                }
            )

    seen = set()
    unique = []
    for entry in sorted(key_dates, key=lambda k: k["date"]):
        if entry["date"] not in seen:
            seen.add(entry["date"])
            unique.append(entry)
    return unique


def _apply_pacing(unit: CurriculumUnit, rng, as_of: dt.date | None) -> None:
    """Set pacing figures relative to a point in time.

    Pacing is the administrator dashboard's headline number ("Pacing: 73%, on
    track"), and it only means something as a comparison between content covered
    and time elapsed.
    """
    if as_of is None or as_of > unit.end_date:
        unit.status = "completed"
        unit.percent_time_elapsed = 100
        unit.percent_content_covered = int(clamp(rng.gauss(98, 4), 82, 100))
    elif as_of < unit.start_date:
        unit.status = "not_started"
        unit.percent_time_elapsed = 0
        unit.percent_content_covered = 0
    else:
        unit.status = "in_progress"
        elapsed = sum(1 for d in unit.instructional_days if d <= as_of)
        unit.percent_time_elapsed = int(100 * elapsed / len(unit.instructional_days))
        # Content coverage drifts around time elapsed, sometimes ahead, sometimes behind.
        drift = rng.gauss(4, 12)
        unit.percent_content_covered = int(
            clamp(unit.percent_time_elapsed + drift, 0, 100)
        )

    delta = unit.percent_content_covered - unit.percent_time_elapsed
    if unit.status == "not_started":
        unit.pacing_status = "on_track"
    elif delta >= 8:
        unit.pacing_status = "ahead"
    elif delta >= -6:
        unit.pacing_status = "on_track"
    elif delta >= -15:
        unit.pacing_status = "slightly_behind"
    else:
        unit.pacing_status = "behind"


def build_interruptions(
    section, calendar: SchoolCalendar, units: list[CurriculumUnit], staff_id: str
) -> dict:
    """Interruptions logged against a section, placed on real instructional days.

    Named repeatedly in the UI/UX design -- classroom cards, the interruptions
    context layer, the analytics summary -- and defined nowhere in the original
    schema. Time lost is what turns "four interruptions" into "approximately two
    hours of lost instruction".
    """
    rng = stream(section.id, "interruptions")
    incidents = []

    count = rng.randint(6, 16)
    days = calendar.instructional_days

    for index in range(count):
        day = rng.choice(days)
        kind, description, base_minutes, planned = rng.choice(INTERRUPTION_TYPES)
        minutes = max(10, int(rng.gauss(base_minutes, base_minutes * 0.25)))

        unit = next((u for u in units if u.covers_date(day)), None)

        incidents.append(
            {
                "id": f"int-{section.id}-{index + 1:03d}",
                "date": day.isoformat(),
                "interruptionType": kind,
                "description": description,
                "minutesLost": minutes,
                "wasPlanned": planned,
                "curriculumUnitId": unit.id if unit else None,
                "loggedBy": staff_id,
            }
        )

    incidents.sort(key=lambda i: i["date"])
    unplanned = [i for i in incidents if not i["wasPlanned"]]
    total_minutes = sum(i["minutesLost"] for i in incidents)

    return {
        "id": f"intrec-{section.id}",
        "sectionId": section.id,
        "schoolYear": section.school_year,
        "interruptions": incidents,
        "metrics": {
            "totalInterruptions": len(incidents),
            "unplannedInterruptions": len(unplanned),
            "totalMinutesLost": total_minutes,
            "averageInterruptionsPerUnit": round(
                len(incidents) / max(1, len(units)), 2
            ),
        },
        "metadata": {
            "dataSource": "Teacher-logged via Supernova",
            "lastSyncDate": "2025-06-02",
        },
    }
