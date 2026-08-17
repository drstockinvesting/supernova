"""Validation: structural integrity and narrative coherence.

Two tiers, and the second is the one that matters.

**Structural** checks the dataset is well-formed -- referential integrity, legal
enums, dates on instructional days, mastery permanence never violated.

**Narrative coherence** checks the dataset tells a believable story. Well-formed
data can still be nonsense: a student with a 68% attendance rate whose mastery
gaps are spread evenly across every unit passes every structural check and fails
the actual test of the system. These checks measure the correlations the
dashboards depend on, as distributions rather than anecdotes.
"""

from __future__ import annotations

import datetime as dt
import statistics as st
from collections import defaultdict

from .config import (
    CURRENT_SCHOOL_YEAR,
    EXPECTED_TIER_MARGINAL,
    EXPECTED_TRAJECTORY_MARGINAL,
    SITUATION_WEIGHTS,
    evidence_strength_for,
)

VALID_MASTERY_STATUS = {"mastered", "not_mastered", "in_progress"}
VALID_ATTENDANCE_STATUS = {
    "present", "absent", "excused_absent", "tardy", "excused_tardy", "partial_day",
}
VALID_STRENGTH = {"insubstantial", "moderate", "substantial", "none"}

# How far an observed population share may drift from its expected value before
# it counts as a distribution failure rather than sampling noise.
DISTRIBUTION_TOLERANCE = 0.05


class Report:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.findings: list[tuple[str, str]] = []

    def error(self, message: str) -> None:
        self.errors.append(message)

    def warn(self, message: str) -> None:
        self.warnings.append(message)

    def finding(self, label: str, value: str) -> None:
        self.findings.append((label, value))

    @property
    def passed(self) -> bool:
        return not self.errors


# ---------------------------------------------------------------------------
# Structural
# ---------------------------------------------------------------------------


def validate_structure(dataset, report: Report) -> None:
    standard_ids = {s["id"] for s in dataset.standards}
    student_ids = {s["id"] for s in dataset.students}
    section_ids = {s["id"] for s in dataset.sections}
    unit_ids = {u["id"] for u in dataset.units}
    staff_ids = {s["id"] for s in dataset.staff}

    instructional_days: dict[tuple[str, str], set[str]] = {}
    for calendar in dataset.calendars:
        key = (calendar["schoolId"], calendar["schoolYear"])
        instructional_days[key] = set(calendar["instructionalDays"])

    students_by_id = {s["id"]: s for s in dataset.students}

    orphan_mastery = orphan_evidence = bad_status = bad_strength = 0
    off_calendar_evidence = off_calendar_attendance = 0
    permanence_violations = 0
    evidence_link_breaks = 0

    for student_id, profile in dataset.profiles.items():
        if student_id not in student_ids:
            report.error(f"Profile {student_id} has no matching Student record")
            continue

        school_id = students_by_id[student_id]["schoolId"]
        mastered_so_far: set[str] = set()

        for year, payload in sorted(profile["years"].items()):
            days = instructional_days.get((school_id, year), set())
            mastery_ids = set()

            for record in payload["mastery"]:
                mastery_ids.add(record["id"])

                if record["standardId"] not in standard_ids:
                    orphan_mastery += 1
                if record["status"] not in VALID_MASTERY_STATUS:
                    bad_status += 1
                if record["evidenceStrength"] not in VALID_STRENGTH:
                    bad_strength += 1
                if record["sectionId"] and record["sectionId"] not in section_ids:
                    # Prior-year sections aren't emitted; only current year must match.
                    if year == CURRENT_SCHOOL_YEAR:
                        report.error(
                            f"Mastery {record['id']} references unknown section"
                        )

                # Integrity rule 3: strength must follow from count.
                expected = evidence_strength_for(record["evidenceCount"])
                if record["evidenceStrength"] != expected:
                    bad_strength += 1

                # Mastery permanence: a standard mastered in an earlier year must
                # never appear as not_mastered later.
                if (
                    record["standardId"] in mastered_so_far
                    and record["status"] != "mastered"
                ):
                    permanence_violations += 1

            for record in payload["mastery"]:
                if record["status"] == "mastered":
                    mastered_so_far.add(record["standardId"])

            for artifact in payload["evidence"]:
                if artifact["masteryRecordId"] not in mastery_ids:
                    orphan_evidence += 1
                if days and artifact["evidenceDate"] not in days:
                    off_calendar_evidence += 1

            for event in payload["attendance"]["attendanceExceptions"]:
                if event["status"] not in VALID_ATTENDANCE_STATUS:
                    report.error(f"Illegal attendance status {event['status']!r}")
                if days and event["date"] not in days:
                    off_calendar_attendance += 1

    for label, count, rule in [
        ("Mastery records referencing an unknown standard", orphan_mastery, "rule 1"),
        ("Evidence referencing an unknown mastery record", orphan_evidence, "rule 2"),
        ("Mastery records with an illegal status", bad_status, "enum"),
        ("Evidence strength inconsistent with evidence count", bad_strength, "rule 3"),
        ("Evidence dated on a non-instructional day", off_calendar_evidence, "rule 11"),
        ("Attendance dated on a non-instructional day", off_calendar_attendance, "rule 10"),
        ("Mastery permanence violations", permanence_violations, "rule 4"),
    ]:
        if count:
            report.error(f"{label}: {count:,} ({rule})")
        else:
            report.finding(label, "0")

    _validate_access(dataset, report, student_ids, section_ids, staff_ids)
    _validate_units(dataset, report, standard_ids, section_ids)


def _validate_access(dataset, report: Report, student_ids, section_ids, staff_ids) -> None:
    """Permission scopes must point at things that exist and stay inside bounds."""
    dangling = 0
    guardians_without_scope = 0
    over_scoped = 0

    for user in dataset.users:
        for assignment in user["roleAssignments"]:
            scope_type = assignment["scopeType"]
            for scope_id in assignment["scopeIds"]:
                if scope_type == "student" and scope_id not in student_ids:
                    dangling += 1
                elif scope_type == "section" and scope_id not in section_ids:
                    dangling += 1

            if assignment["role"] == "guardian" and not assignment["scopeIds"]:
                guardians_without_scope += 1

            # Integrity rule 14: health and services detail are separately gated.
            perms = set(assignment["permissions"])
            if assignment["role"] == "teacher" and (
                "view_health_detail" in perms or "view_special_services_detail" in perms
            ):
                over_scoped += 1
            # Board members must never hold student-identifying permissions.
            if assignment["role"] == "school_board_member" and (
                perms - {"view_aggregate_mastery"}
            ):
                over_scoped += 1

    if dangling:
        report.error(f"Role assignments with dangling scope references: {dangling}")
    else:
        report.finding("Role assignment scope references", "all valid")

    if over_scoped:
        report.error(f"Role assignments exceeding their permitted scope: {over_scoped}")
    else:
        report.finding("Permission boundaries (health, services, board)", "enforced")

    # Guardians without educational rights get an empty scope by design, not a bug.
    report.finding(
        "Guardians with no viewable student (no educational rights)",
        f"{guardians_without_scope} (expected: custody is often asymmetric)",
    )


def _validate_units(dataset, report: Report, standard_ids, section_ids) -> None:
    """Integrity rule 13: a unit's standards must match its section's subject."""
    bad_reference = 0
    empty_units = 0
    for unit in dataset.units:
        if unit["sectionId"] not in section_ids:
            bad_reference += 1
        if not unit["standardIds"]:
            empty_units += 1
        for standard_id in unit["standardIds"]:
            if standard_id not in standard_ids:
                bad_reference += 1

    if bad_reference:
        report.error(f"Curriculum units with broken references: {bad_reference}")
    else:
        report.finding("Curriculum unit references", "all valid")
    if empty_units:
        report.warn(f"Curriculum units carrying no standards: {empty_units}")

    # Unit ids must be unique. They were not, once: a self-contained elementary
    # section teaches six subjects, and an id built from section and sequence alone
    # collided across all of them, so a mastery record's curriculumUnitId resolved
    # to an arbitrary one of six units. An existence check passes in that state --
    # only a uniqueness check catches it.
    counts: dict[str, int] = defaultdict(int)
    for unit in dataset.units:
        counts[unit["id"]] += 1
    collisions = sorted(unit_id for unit_id, count in counts.items() if count > 1)
    if collisions:
        report.error(
            f"Curriculum unit ids are not unique: {len(collisions)} reused "
            f"(e.g. {collisions[0]})"
        )
    else:
        report.finding("Curriculum unit id uniqueness", f"{len(counts)} unique ids")


def validate_aggregates(dataset, aggregates: dict, report: Report) -> None:
    """Rollups must reconcile: grades sum to schools, schools sum to district."""
    school_totals: dict[str, int] = defaultdict(int)
    school_mastered: dict[str, int] = defaultdict(int)

    for grade in aggregates["grades"]:
        school_totals[grade["schoolId"]] += grade["standardsTaughtToDate"]
        school_mastered[grade["schoolId"]] += grade["standardsMastered"]

    mismatches = 0
    for school in aggregates["schools"]:
        school_id = school["schoolId"]
        if school["standardsTaughtToDate"] != school_totals[school_id]:
            mismatches += 1
        if school["standardsMastered"] != school_mastered[school_id]:
            mismatches += 1

    district_taught = sum(s["standardsTaughtToDate"] for s in aggregates["schools"])
    district_mastered = sum(s["standardsMastered"] for s in aggregates["schools"])
    if aggregates["district"]["standardsTaughtToDate"] != district_taught:
        mismatches += 1
    if aggregates["district"]["standardsMastered"] != district_mastered:
        mismatches += 1

    if mismatches:
        report.error(f"Aggregate rollups that do not reconcile: {mismatches}")
    else:
        report.finding(
            "Aggregate reconciliation (grade -> school -> district)", "exact"
        )


# ---------------------------------------------------------------------------
# Narrative coherence
# ---------------------------------------------------------------------------


def validate_narrative(dataset, report: Report) -> None:
    units_by_id = {u["id"]: u for u in dataset.units}

    _check_absence_correlation(dataset, units_by_id, report)
    _check_behavioral_localization(dataset, report)
    _check_tier_fidelity(dataset, report)
    _check_trajectory(dataset, report)
    _check_transfer_honesty(dataset, report)
    _check_distributions(dataset, report)
    _check_impossible_combinations(dataset, report)


def _current(profile):
    return profile["years"].get(CURRENT_SCHOOL_YEAR)


ABSENCE_BUCKETS = [(0, 3, "0-3"), (4, 7, "4-7"), (8, 12, "8-12"), (13, 10**6, "13+")]


def _check_absence_correlation(dataset, units_by_id, report: Report) -> None:
    """Do chronic absentees' gaps concentrate in the units they missed?

    This is the flagship narrative. If mastery were generated independently of
    attendance, gaps would spread evenly and mastery would be flat across every
    absence level.

    Measured two ways deliberately:

    - **Pooled dose-response.** Every mastery record from every chronic-absentee
      student, bucketed by how many days that student missed during that unit.
      A real relationship shows a monotonic decline across buckets. This is
      pooled rather than averaged per student because a per-student split has
      only two completed units to work with in a February view -- far too noisy
      to distinguish a weak correlation from a strong one.
    - **Completed units only.** The in-progress unit has depressed mastery for
      every student regardless of attendance (41% vs 31% district-wide), so
      including it would confound the measurement.
    """
    buckets: dict[str, list[int]] = {label: [0, 0] for _, _, label in ABSENCE_BUCKETS}

    for profile in dataset.profiles.values():
        if profile["generatorArchetype"]["situation"] != "chronic_absenteeism_recovery":
            continue
        year = _current(profile)
        if not year:
            continue

        absences = {
            dt.date.fromisoformat(e["date"])
            for e in year["attendance"]["attendanceExceptions"]
            if e["status"] in ("absent", "excused_absent")
        }

        per_unit: dict[str, int] = {}
        for record in year["mastery"]:
            unit = units_by_id.get(record["curriculumUnitId"])
            if not unit or unit["status"] != "completed":
                continue
            if unit["id"] not in per_unit:
                start = dt.date.fromisoformat(unit["startDate"])
                end = dt.date.fromisoformat(unit["endDate"])
                per_unit[unit["id"]] = sum(1 for d in absences if start <= d <= end)

            missed = per_unit[unit["id"]]
            for low, high, label in ABSENCE_BUCKETS:
                if low <= missed <= high:
                    buckets[label][0] += 1
                    buckets[label][1] += record["status"] == "mastered"
                    break

    populated = [
        (label, 100 * hits / total)
        for label, (total, hits) in buckets.items()
        if total >= 30
    ]
    if len(populated) < 2:
        report.warn("Not enough chronic-absenteeism data to measure the correlation")
        return

    detail = ", ".join(f"{label}: {rate:.1f}%" for label, rate in populated)
    spread = populated[0][1] - populated[-1][1]
    report.finding(
        "Absence-to-mastery correlation (pooled dose-response)",
        f"mastery by absences-in-unit -- {detail} (spread {spread:+.1f} pts)",
    )

    rates = [rate for _, rate in populated]
    monotonic = all(earlier >= later for earlier, later in zip(rates, rates[1:]))
    if not monotonic:
        report.error(
            "Mastery does not decline monotonically as absences rise; gaps are "
            "not tracking the units students actually missed."
        )
    if spread < 10:
        report.error(
            f"Absence-to-mastery spread is only {spread:+.1f} pts. Mastery gaps "
            "are not landing in the units students actually missed."
        )


def _check_behavioral_localization(dataset, report: Report) -> None:
    """Behavioral-cluster students must dip in ONE subject, not everywhere.

    This is the check that proves the system isolates correlation rather than
    assuming a struggling student struggles across the board.
    """
    deltas = []
    for profile in dataset.profiles.values():
        archetype = profile["generatorArchetype"]
        if archetype["situation"] != "behavioral_cluster" or not archetype["focusSubject"]:
            continue
        year = _current(profile)
        if not year:
            continue

        by_subject = year["summary"]["masteryBySubject"]
        focus = archetype["focusSubject"]
        if focus not in by_subject:
            continue
        others = [v["masteryRate"] for k, v in by_subject.items() if k != focus]
        if others:
            deltas.append(by_subject[focus]["masteryRate"] - st.mean(others))

    if not deltas:
        report.warn("No behavioral-cluster students had enough data to measure")
        return

    mean_delta = st.mean(deltas)
    share = 100 * sum(1 for d in deltas if d < 0) / len(deltas)
    report.finding(
        "Behavioral localization",
        f"focus subject runs {mean_delta:+.1f} pts below the student's other "
        f"subjects (n={len(deltas)}, {share:.0f}% show the dip)",
    )
    if mean_delta > -6:
        report.error(
            f"Behavioral clusters are not localizing ({mean_delta:+.1f} pts). "
            "The dip should appear in the affected subject, not across the board."
        )


def _check_tier_fidelity(dataset, report: Report) -> None:
    """Each tier must be dominated by its own evidence-strength band.

    Measured on COMPLETED units only. The in-progress unit legitimately has thin
    evidence for everyone in February, which would blur the tier signal.
    """
    by_tier: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for profile in dataset.profiles.values():
        tier = profile["generatorArchetype"]["tier"]
        year = _current(profile)
        if not year:
            continue
        for record in year["mastery"]:
            flags = record.get("metadata", {}).get("qualityFlags", [])
            if "unit_not_yet_taught" in flags:
                continue
            by_tier[tier][record["evidenceStrength"]] += 1

    expectations = {
        "high_achiever": "substantial",
        "typical": "moderate",
        "underachiever": "insubstantial",
    }

    for tier, expected_band in expectations.items():
        counts = by_tier.get(tier)
        if not counts:
            continue
        total = sum(counts.values())
        shares = {k: 100 * v / total for k, v in counts.items()}
        summary = "  ".join(f"{k}={shares.get(k, 0):.1f}%" for k in sorted(VALID_STRENGTH))
        report.finding(f"Tier fidelity: {tier}", summary)

        evidenced = {k: v for k, v in shares.items() if k != "none"}
        if evidenced:
            dominant = max(evidenced, key=lambda k: evidenced[k])
            if dominant != expected_band:
                report.error(
                    f"Tier {tier} is dominated by {dominant!r} evidence, "
                    f"expected {expected_band!r}"
                )

    # Underachievers must show a meaningful count of standards with NO evidence.
    under = by_tier.get("underachiever", {})
    if under:
        none_share = 100 * under.get("none", 0) / sum(under.values())
        if none_share < 15:
            report.error(
                f"Underachievers show only {none_share:.1f}% standards with no "
                "evidence; the archetype calls for many with none at all"
            )


def _check_trajectory(dataset, report: Report) -> None:
    """Rising students must improve in the back half, not uniformly."""
    gains = []
    for profile in dataset.profiles.values():
        if profile["generatorArchetype"]["trajectory"] != "rising":
            continue
        year = _current(profile)
        if not year:
            continue
        rates = year["summary"].get("homeworkCompletionRate")
        by_period = []
        for record in year["participation"]:
            by_period.extend(record["metrics"]["completionRateByMarkingPeriod"])
        if len(by_period) < 2:
            continue
        early = [p["completionRate"] for p in by_period if p["markingPeriod"] <= 2]
        late = [p["completionRate"] for p in by_period if p["markingPeriod"] >= 3]
        if early and late:
            gains.append(st.mean(late) - st.mean(early))

    if not gains:
        report.warn("No rising-trajectory students had enough data to measure")
        return

    mean_gain = st.mean(gains)
    report.finding(
        "Rising trajectory",
        f"back-half engagement exceeds front-half by {mean_gain:+.1f} pts (n={len(gains)})",
    )
    if mean_gain < 5:
        report.error(
            f"Rising students are not actually rising ({mean_gain:+.1f} pts)."
        )


def _check_transfer_honesty(dataset, report: Report) -> None:
    """Transfers must carry honest gaps, not an invented history."""
    transfers = flagged = with_full_history = 0
    for profile in dataset.profiles.values():
        if profile["generatorArchetype"]["situation"] != "transfer_incomplete_history":
            continue
        transfers += 1
        flags = profile["student"]["metadata"].get("qualityFlags", [])
        if "incomplete_prior_history" in flags:
            flagged += 1
        if len(profile["years"]) >= 3:
            with_full_history += 1

    if not transfers:
        return

    report.finding(
        "Transfer students",
        f"{transfers} total, {flagged} carry an incomplete-history flag, "
        f"{with_full_history} have a full 3-year record",
    )
    if flagged < transfers:
        report.error(
            f"{transfers - flagged} transfer students lack a data quality flag"
        )
    if with_full_history:
        report.error(
            f"{with_full_history} transfer students have a full history; the "
            "generator should record the gap, not invent a past to fill it"
        )


def _check_distributions(dataset, report: Report) -> None:
    """Observed population shares must match the configured conditional model."""
    counts: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    total = len(dataset.profiles)

    for profile in dataset.profiles.values():
        archetype = profile["generatorArchetype"]
        for axis in ("tier", "trajectory", "situation"):
            counts[axis][archetype[axis]] += 1

    expectations = {
        "tier": EXPECTED_TIER_MARGINAL,
        "trajectory": EXPECTED_TRAJECTORY_MARGINAL,
        "situation": SITUATION_WEIGHTS,
    }

    for axis, expected in expectations.items():
        for key, expected_share in sorted(expected.items()):
            observed = counts[axis].get(key, 0) / max(1, total)
            drift = abs(observed - expected_share)
            if drift > DISTRIBUTION_TOLERANCE:
                report.error(
                    f"{axis} '{key}': observed {observed:.1%} vs expected "
                    f"{expected_share:.1%} (drift {drift:.1%})"
                )
        report.finding(
            f"Population distribution: {axis}",
            "within tolerance of the conditional model",
        )


def _check_impossible_combinations(dataset, report: Report) -> None:
    """Combinations no teacher would recognize."""
    perfect_attendance_no_mastery = 0
    high_achiever_severe_absence = 0
    evidence_before_enrollment = 0

    for profile in dataset.profiles.values():
        year = _current(profile)
        if not year:
            continue
        summary = year["summary"]
        archetype = profile["generatorArchetype"]

        if summary["attendanceRate"] >= 99 and summary["masteryRate"] == 0:
            perfect_attendance_no_mastery += 1

        if archetype["tier"] == "high_achiever" and summary["attendanceRate"] < 80:
            high_achiever_severe_absence += 1

        enrolled = profile["student"]["enrollmentDate"]
        for record in year["mastery"]:
            first = record.get("firstEvidenceDate")
            if first and first < enrolled:
                evidence_before_enrollment += 1

    for label, count in [
        ("Perfect attendance with zero mastery", perfect_attendance_no_mastery),
        ("Evidence dated before enrollment", evidence_before_enrollment),
    ]:
        if count:
            report.error(f"{label}: {count}")
        else:
            report.finding(label, "0")

    # Rare rather than impossible: a bright student can miss a lot of school.
    report.finding(
        "High achievers with severe absence",
        f"{high_achiever_severe_absence} (rare by design, not forbidden)",
    )
