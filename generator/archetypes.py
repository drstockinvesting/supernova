"""The archetype engine: three axes that seed every data stream for a student.

Per the data generation guidelines, students are seeded archetype-first and every
stream is generated *from* that seed, so attendance, behavior, mastery, and the
rest stay mutually consistent. Independently randomizing each field produces
statistically valid but narratively incoherent students -- perfect attendance with
no mastery, a discipline record from a school the student never attended -- and
leaves the dashboards' correlation features with nothing real to surface.

The three axes:

**Tier** -- how much a student engages and how strong the resulting evidence is.
Maps directly onto the evidenceStrength enum already in the schema.

**Trajectory** -- how the tier moves across marking periods, so trend indicators
have something to indicate. "Late Start, Strong Finish" lives here as an
Underachiever who is Rising: the same student moving, not a different kind of
student.

**Situation** -- drives attendance, behavior, health, services, and family
engagement, and determines *where* mastery gaps localize. Tier determines how
deep they run; situation determines where they fall.

Tier and trajectory are drawn conditional on situation, never independently.
"""

from __future__ import annotations

from dataclasses import dataclass

from .config import (
    SITUATION_WEIGHTS,
    TIER_GIVEN_SITUATION,
    TRAJECTORY_GIVEN_SITUATION,
)
from .rng import chance, clamp, jitter, stream, weighted_choice


@dataclass(frozen=True)
class TierProfile:
    """How an achievement tier expresses itself in the academic stream."""

    key: str
    label: str
    # Fraction of the grade's standards the student produces any evidence for.
    engagement_range: tuple[float, float]
    # Evidence artifacts per engaged standard.
    evidence_range: tuple[int, int]
    # Probability an engaged standard reaches "mastered".
    mastery_rate_range: tuple[float, float]
    description: str


TIERS = {
    "high_achiever": TierProfile(
        key="high_achiever",
        label="High Achiever",
        engagement_range=(0.94, 1.00),
        evidence_range=(6, 9),
        mastery_rate_range=(0.88, 0.97),
        description=(
            "Works on everything to a substantial level beyond moderate. Evidence "
            "accumulates well past the substantial threshold on nearly every standard."
        ),
    ),
    "typical": TierProfile(
        key="typical",
        label="Typical",
        engagement_range=(0.78, 0.92),
        evidence_range=(3, 5),
        mastery_rate_range=(0.62, 0.80),
        description=(
            "Works on most things and masters them to moderate levels. Real gaps on "
            "a handful of standards; nothing dramatic in either direction."
        ),
    ),
    "underachiever": TierProfile(
        key="underachiever",
        label="Underachiever",
        engagement_range=(0.42, 0.66),
        evidence_range=(1, 2),
        mastery_rate_range=(0.28, 0.48),
        description=(
            "Produces insubstantial evidence in many places and often none at all. "
            "Where mastery is reached, it rests on a thin evidence trail."
        ),
    ),
}


@dataclass(frozen=True)
class TrajectoryProfile:
    key: str
    label: str
    # Multiplier applied to engagement and evidence in each of the 4 marking periods.
    quarter_multipliers: tuple[float, float, float, float]
    description: str


TRAJECTORIES = {
    "steady": TrajectoryProfile(
        key="steady",
        label="Steady",
        quarter_multipliers=(0.96, 1.00, 1.02, 1.02),
        description="Holds their tier across the year with ordinary variation.",
    ),
    "rising": TrajectoryProfile(
        key="rising",
        label="Rising",
        quarter_multipliers=(0.55, 0.78, 1.10, 1.35),
        description=(
            "Starts below tier and climbs. Evidence strengthens and standards flip "
            "from not_mastered to mastered concentrated in the back half of the year."
        ),
    ),
    "dipping": TrajectoryProfile(
        key="dipping",
        label="Dipping",
        quarter_multipliers=(1.18, 1.05, 0.68, 0.74),
        description="A mid-year decline, usually with a situational cause behind it.",
    ),
}


@dataclass(frozen=True)
class SituationProfile:
    key: str
    label: str
    attendance_rate_range: tuple[float, float]
    absences_cluster: bool
    behavior_incident_range: tuple[int, int]
    behavior_localized: bool  # incidents concentrate in one subject
    health_event_range: tuple[int, int]
    engagement_level: str
    has_services: bool
    homework_completion_range: tuple[float, float]
    description: str


SITUATIONS = {
    "none": SituationProfile(
        key="none",
        label="No flagged situation",
        attendance_rate_range=(0.93, 0.99),
        absences_cluster=False,
        behavior_incident_range=(0, 2),
        behavior_localized=False,
        health_event_range=(0, 2),
        engagement_level="moderately_engaged",
        has_services=False,
        homework_completion_range=(0.74, 0.96),
        description="Nothing flagged. Most of the room looks like this.",
    ),
    "iep_services": SituationProfile(
        key="iep_services",
        label="IEP or active services",
        attendance_rate_range=(0.89, 0.97),
        absences_cluster=False,
        behavior_incident_range=(0, 4),
        behavior_localized=False,
        health_event_range=(1, 5),
        engagement_level="highly_engaged",
        has_services=True,
        homework_completion_range=(0.60, 0.90),
        description=(
            "Active IEP with accommodations. Mastery evidence is generated against "
            "IEP goals rather than as a disconnected stream. Progress is steady but "
            "slower on specific standards."
        ),
    ),
    "family_engagement_gap": SituationProfile(
        key="family_engagement_gap",
        label="Family engagement gap",
        attendance_rate_range=(0.91, 0.98),
        absences_cluster=False,
        behavior_incident_range=(0, 2),
        behavior_localized=False,
        health_event_range=(0, 2),
        engagement_level="minimally_engaged",
        has_services=False,
        homework_completion_range=(0.58, 0.86),
        description=(
            "Solid attendance and ordinary mastery, but minimal family contact "
            "history. Tests whether the system surfaces engagement as its own signal "
            "rather than assuming disengaged families mean struggling students."
        ),
    ),
    "chronic_absenteeism_recovery": SituationProfile(
        key="chronic_absenteeism_recovery",
        label="Chronic absenteeism, recovering",
        attendance_rate_range=(0.68, 0.86),
        absences_cluster=True,
        behavior_incident_range=(0, 3),
        behavior_localized=False,
        health_event_range=(1, 6),
        engagement_level="minimally_engaged",
        has_services=False,
        homework_completion_range=(0.35, 0.68),
        description=(
            "Missed significant instructional time earlier in the year, with mastery "
            "gaps concentrated in the units taught during those absences. Attendance "
            "improves in recent months with early signs of catching up."
        ),
    ),
    "behavioral_cluster": SituationProfile(
        key="behavioral_cluster",
        label="Behavioral incidents in one class",
        attendance_rate_range=(0.92, 0.98),
        absences_cluster=False,
        behavior_incident_range=(4, 11),
        behavior_localized=True,
        health_event_range=(0, 3),
        engagement_level="moderately_engaged",
        has_services=False,
        homework_completion_range=(0.55, 0.88),
        description=(
            "No attendance or health flags. Fine in most subjects, but a cluster of "
            "incidents during one class period with a mastery dip in that subject "
            "specifically. Tests whether the system isolates correlation instead of "
            "assuming a struggling student struggles everywhere."
        ),
    ),
    "transfer_incomplete_history": SituationProfile(
        key="transfer_incomplete_history",
        label="Transfer student, incomplete history",
        attendance_rate_range=(0.88, 0.97),
        absences_cluster=False,
        behavior_incident_range=(0, 3),
        behavior_localized=False,
        health_event_range=(0, 3),
        engagement_level="moderately_engaged",
        has_services=False,
        homework_completion_range=(0.62, 0.92),
        description=(
            "Enrolled from another district. Prior achievement and longitudinal "
            "records are genuinely sparse; data quality flags reflect the gap rather "
            "than the generator inventing a history to fill it."
        ),
    ),
    "health_wellness_factor": SituationProfile(
        key="health_wellness_factor",
        label="Health or wellness factor",
        attendance_rate_range=(0.82, 0.94),
        absences_cluster=True,
        behavior_incident_range=(0, 3),
        behavior_localized=False,
        health_event_range=(4, 12),
        engagement_level="moderately_engaged",
        has_services=False,
        homework_completion_range=(0.52, 0.85),
        description=(
            "A chronic condition or wellness concern producing recurring nurse or "
            "counselor contact and clustered absences around flare-ups."
        ),
    ),
}


@dataclass(frozen=True)
class Archetype:
    """A student's full generative seed. Every stream reads from this."""

    tier: TierProfile
    trajectory: TrajectoryProfile
    situation: SituationProfile

    # Per-student values drawn once, so students sharing an archetype differ.
    engagement: float
    mastery_rate: float
    attendance_rate: float
    homework_completion: float
    behavior_incident_count: int
    health_event_count: int
    focus_subject: str | None  # subject a behavioral cluster localizes to

    @property
    def key(self) -> str:
        return f"{self.tier.key}/{self.trajectory.key}/{self.situation.key}"

    def to_record(self) -> dict:
        """Serialized onto the student for validation and dashboard explanation.

        This is generator provenance, not student data. It is what lets the
        validation suite check that a chronic-absenteeism student actually shows
        clustered absences, rather than trusting that the generator did its job.
        """
        return {
            "tier": self.tier.key,
            "tierLabel": self.tier.label,
            "trajectory": self.trajectory.key,
            "trajectoryLabel": self.trajectory.label,
            "situation": self.situation.key,
            "situationLabel": self.situation.label,
            "targetEngagement": round(self.engagement, 3),
            "targetMasteryRate": round(self.mastery_rate, 3),
            "targetAttendanceRate": round(self.attendance_rate, 3),
            "targetHomeworkCompletion": round(self.homework_completion, 3),
            "focusSubject": self.focus_subject,
            "description": self.situation.description,
        }


def assign_archetype(student_id: str, school_year: str, subjects: list[str]) -> Archetype:
    """Draw a student's three axes, then their per-student parameter values.

    Situation is drawn first because tier and trajectory depend on it. Drawing
    them independently would produce combinations a teacher would not recognize --
    which is the exact failure the guidelines document warns against.
    """
    rng = stream(student_id, "archetype", school_year)

    situation_key = weighted_choice(rng, SITUATION_WEIGHTS)
    situation = SITUATIONS[situation_key]

    tier_key = weighted_choice(rng, TIER_GIVEN_SITUATION[situation_key])
    tier = TIERS[tier_key]

    trajectory_key = weighted_choice(rng, TRAJECTORY_GIVEN_SITUATION[situation_key])
    trajectory = TRAJECTORIES[trajectory_key]

    engagement = rng.uniform(*tier.engagement_range)
    mastery_rate = rng.uniform(*tier.mastery_rate_range)
    attendance_rate = rng.uniform(*situation.attendance_rate_range)
    homework_completion = rng.uniform(*situation.homework_completion_range)

    # Homework completion tracks tier as well as situation -- a high achiever with
    # a family engagement gap still turns work in.
    tier_homework_nudge = {"high_achiever": 0.10, "typical": 0.0, "underachiever": -0.10}
    homework_completion = clamp(
        homework_completion + tier_homework_nudge[tier_key], 0.20, 0.99
    )

    behavior_incidents = rng.randint(*situation.behavior_incident_range)
    health_events = rng.randint(*situation.health_event_range)

    focus_subject = rng.choice(sorted(subjects)) if situation.behavior_localized else None

    return Archetype(
        tier=tier,
        trajectory=trajectory,
        situation=situation,
        engagement=clamp(jitter(rng, engagement, 0.03), 0.30, 1.0),
        mastery_rate=clamp(jitter(rng, mastery_rate, 0.04), 0.15, 0.99),
        attendance_rate=clamp(attendance_rate, 0.60, 1.0),
        homework_completion=homework_completion,
        behavior_incident_count=behavior_incidents,
        health_event_count=health_events,
        focus_subject=focus_subject,
    )


def quarter_strength(archetype: Archetype, quarter_index: int) -> float:
    """The trajectory multiplier for a given marking period (0-indexed)."""
    return archetype.trajectory.quarter_multipliers[quarter_index]


def evidence_count_for(
    archetype: Archetype,
    rng,
    quarter_index: int,
    subject: str,
) -> int:
    """How many evidence artifacts a standard accumulates.

    Tier sets the band, trajectory scales it by marking period, and a localized
    behavioral cluster suppresses it in the affected subject only -- which is what
    makes the "struggles here but not everywhere" narrative testable.
    """
    low, high = archetype.tier.evidence_range
    base = rng.randint(low, high)

    scaled = base * quarter_strength(archetype, quarter_index)

    if archetype.situation.behavior_localized and subject == archetype.focus_subject:
        scaled *= 0.55

    return max(0, round(scaled))


def summarize_population(archetypes: list[Archetype]) -> dict:
    """Observed distribution across the three axes, for the validation report."""
    total = len(archetypes) or 1

    def tally(attr: str) -> dict[str, float]:
        counts: dict[str, int] = {}
        for archetype in archetypes:
            key = getattr(archetype, attr).key
            counts[key] = counts.get(key, 0) + 1
        return {k: round(v / total, 4) for k, v in sorted(counts.items())}

    pairings: dict[str, int] = {}
    for archetype in archetypes:
        pair = f"{archetype.situation.key} + {archetype.tier.key}"
        pairings[pair] = pairings.get(pair, 0) + 1

    return {
        "total": len(archetypes),
        "tier": tally("tier"),
        "trajectory": tally("trajectory"),
        "situation": tally("situation"),
        "situationTierPairings": dict(sorted(pairings.items())),
    }
