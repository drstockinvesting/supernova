"""Generation configuration: district shape, seed, and density knobs.

Everything that determines the size and character of the dataset lives here, so
regenerating a different district is a config change rather than a code change.
"""

from __future__ import annotations

from dataclasses import dataclass, field

# The master seed. Changing this produces a completely different but equally
# valid district. Keeping it fixed is what makes regeneration reproducible.
MASTER_SEED = "supernova-constellation-2024"

DATASET_VERSION = "0.1.0"

# School years present in the dataset, oldest first. The last is the current year.
SCHOOL_YEARS = ["2022-2023", "2023-2024", "2024-2025"]
CURRENT_SCHOOL_YEAR = SCHOOL_YEARS[-1]

# Full evidence artifacts are generated for the current year only. Prior years
# carry mastery records with evidence counts plus benchmark and screener results,
# which is what PriorAchievementRecord specifies. This keeps the dataset near
# 60MB instead of several hundred.
FULL_EVIDENCE_YEARS = [CURRENT_SCHOOL_YEAR]

# Scales evidence artifact counts across the whole dataset. Lower this if the
# generated data proves too heavy to work with.
EVIDENCE_DENSITY = 1.0

DISTRICT_NAME = "Constellation Area School District"
DISTRICT_STATE = "Pennsylvania"


@dataclass(frozen=True)
class SchoolConfig:
    key: str
    name: str
    grades: list[str]
    instructional_model: str  # self_contained | departmentalized
    sections_per_grade: int
    target_section_size: int
    principal_first: str
    principal_last: str

    @property
    def is_self_contained(self) -> bool:
        return self.instructional_model == "self_contained"


# Elementary is self-contained: one teacher covers all six subjects, so a
# "classroom" is a single section. Secondary is departmentalized: a student sits
# in six different sections with six different teachers. The two models make a
# classroom card mean genuinely different things, which is what exercises the
# fractal architecture rather than just repeating one shape.
SCHOOLS = [
    SchoolConfig(
        key="nova-elementary",
        name="Nova Elementary School",
        grades=["K", "1", "2", "3", "4", "5"],
        instructional_model="self_contained",
        sections_per_grade=3,
        target_section_size=20,
        principal_first="Dolores",
        principal_last="Ashby",
    ),
    SchoolConfig(
        key="meridian-middle",
        name="Meridian Middle School",
        grades=["6", "7", "8"],
        instructional_model="departmentalized",
        sections_per_grade=5,
        target_section_size=20,
        principal_first="Terrence",
        principal_last="Okonkwo",
    ),
    SchoolConfig(
        key="constellation-high",
        name="Constellation High School",
        grades=["9", "10", "11", "12"],
        instructional_model="departmentalized",
        sections_per_grade=6,
        target_section_size=18,
        principal_last="Vance",
        principal_first="Marguerite",
    ),
]

SUBJECTS = ["Math", "ELA", "Science", "Social Studies", "Arts", "Physical Education"]

# Evidence strength thresholds, from the integrity rules in the data structures doc.
EVIDENCE_STRENGTH_THRESHOLDS = {
    "insubstantial": (1, 2),
    "moderate": (3, 5),
    "substantial": (6, None),
}


def evidence_strength_for(count: int) -> str:
    """Map an evidence artifact count onto its strength band."""
    if count >= 6:
        return "substantial"
    if count >= 3:
        return "moderate"
    if count >= 1:
        return "insubstantial"
    return "none"


# ---------------------------------------------------------------------------
# Calendar shape
# ---------------------------------------------------------------------------

INSTRUCTIONAL_DAYS_TARGET = 180
MARKING_PERIODS_PER_YEAR = 4
UNITS_PER_MARKING_PERIOD = 2

# School year runs late August through early June.
SCHOOL_YEAR_START = (8, 26)  # (month, day) of the first instructional day
SCHOOL_YEAR_END = (6, 12)  # latest possible last day


# ---------------------------------------------------------------------------
# Population shape
# ---------------------------------------------------------------------------

# Achievement tier drives how many standards a student engages and how strong the
# resulting evidence is. Maps directly onto the evidenceStrength enum.
TIER_WEIGHTS = {
    "high_achiever": 0.20,
    "typical": 0.55,
    "underachiever": 0.25,
}

# How the tier moves across marking periods.
TRAJECTORY_WEIGHTS = {
    "steady": 0.74,
    "rising": 0.16,
    "dipping": 0.10,
}

# Situations drive the non-academic streams and localize where gaps fall.
SITUATION_WEIGHTS = {
    "none": 0.55,
    "iep_services": 0.10,
    "family_engagement_gap": 0.09,
    "chronic_absenteeism_recovery": 0.08,
    "behavioral_cluster": 0.07,
    "transfer_incomplete_history": 0.06,
    "health_wellness_factor": 0.05,
}

# Tier is drawn CONDITIONAL on situation. Independent draws would produce
# combinations no teacher would recognize -- a high achiever with severe chronic
# absenteeism, for instance. Each entry re-weights the base tier distribution.
TIER_GIVEN_SITUATION = {
    "none": {"high_achiever": 0.26, "typical": 0.58, "underachiever": 0.16},
    "iep_services": {"high_achiever": 0.06, "typical": 0.46, "underachiever": 0.48},
    "family_engagement_gap": {"high_achiever": 0.14, "typical": 0.56, "underachiever": 0.30},
    "chronic_absenteeism_recovery": {"high_achiever": 0.02, "typical": 0.33, "underachiever": 0.65},
    "behavioral_cluster": {"high_achiever": 0.10, "typical": 0.52, "underachiever": 0.38},
    "transfer_incomplete_history": {"high_achiever": 0.16, "typical": 0.54, "underachiever": 0.30},
    "health_wellness_factor": {"high_achiever": 0.12, "typical": 0.50, "underachiever": 0.38},
}

# Trajectory also shifts with situation: a chronic-absenteeism *recovery* student
# is by definition on the way up, and the source doc's IEP archetype is explicitly
# "on track" rather than declining.
TRAJECTORY_GIVEN_SITUATION = {
    "none": {"steady": 0.80, "rising": 0.13, "dipping": 0.07},
    "iep_services": {"steady": 0.72, "rising": 0.22, "dipping": 0.06},
    "family_engagement_gap": {"steady": 0.76, "rising": 0.12, "dipping": 0.12},
    "chronic_absenteeism_recovery": {"steady": 0.20, "rising": 0.68, "dipping": 0.12},
    "behavioral_cluster": {"steady": 0.55, "rising": 0.15, "dipping": 0.30},
    "transfer_incomplete_history": {"steady": 0.62, "rising": 0.28, "dipping": 0.10},
    "health_wellness_factor": {"steady": 0.58, "rising": 0.17, "dipping": 0.25},
}


def expected_marginal(conditional: dict[str, dict[str, float]]) -> dict[str, float]:
    """Marginal distribution implied by SITUATION_WEIGHTS and a conditional table.

    Because tier and trajectory are drawn conditional on situation, the observed
    population distribution is a mixture, not the base weights. Validation must
    compare against this derived marginal -- comparing against TIER_WEIGHTS would
    flag a correct generator as broken.
    """
    marginal: dict[str, float] = {}
    for situation, weight in SITUATION_WEIGHTS.items():
        for key, probability in conditional[situation].items():
            marginal[key] = marginal.get(key, 0.0) + weight * probability
    total = sum(marginal.values()) or 1.0
    return {k: v / total for k, v in sorted(marginal.items())}


# TIER_WEIGHTS and TRAJECTORY_WEIGHTS above are the *design intent*; these are what
# the conditional tables actually produce, and what validation checks against.
EXPECTED_TIER_MARGINAL = expected_marginal(TIER_GIVEN_SITUATION)
EXPECTED_TRAJECTORY_MARGINAL = expected_marginal(TRAJECTORY_GIVEN_SITUATION)
