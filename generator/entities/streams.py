"""The seven student data streams.

Generated in strict dependency order, because the order is what produces the
correlations the dashboards depend on:

    attendance -> behavior -> health -> services -> participation
                                                 -> MASTERY + EVIDENCE
                                                 -> engagement -> prior achievement

Mastery comes last among current-year streams. It reads the student's actual
absence dates against the unit date windows, so gaps land in the units taught
while the student was out. Generating mastery independently would destroy the
flagship narrative -- "three students missed the Unit 2 introduction on September
14th, which may explain their slower mastery development" -- and leave the
correlation engine with nothing real to surface.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass

from ..archetypes import Archetype, evidence_count_for, quarter_strength
from ..calendar import SchoolCalendar
from ..config import evidence_strength_for
from ..entities.curriculum import CurriculumUnit
from ..rng import chance, clamp, spread_across, stream
from ..standards_catalog import Standard

# ---------------------------------------------------------------------------
# 1. Attendance
# ---------------------------------------------------------------------------

ABSENCE_REASONS = [
    "Parent note - illness", "Parent note - family", "Medical appointment",
    "Illness reported by nurse", "Unexcused", "Transportation",
    "Family emergency", "Religious observance",
]


def build_attendance(
    student, archetype: Archetype, calendar: SchoolCalendar, school_year: str,
    as_of: dt.date | None = None,
) -> dict:
    """Daily attendance events across the year.

    Absences cluster when the archetype says they should. A chronic-absenteeism
    student's absences fall in identifiable runs -- an illness, a housing
    disruption -- not scattered uniformly. Uniform scatter is precisely what makes
    synthetic data read as synthetic, and it would also destroy the unit-level
    correlation, since scattered absences touch every unit equally.
    """
    rng = stream(student.id, "attendance", school_year)
    days = calendar.days_through(as_of)

    # Enrollment can start mid-year for transfers.
    enrolled_from = dt.date.fromisoformat(student.enrollment_date)
    active_days = [d for d in days if d >= enrolled_from] or days

    target_rate = archetype.attendance_rate
    absent_count = round(len(active_days) * (1 - target_rate))

    situation = archetype.situation.key
    cluster = archetype.situation.absences_cluster

    if situation == "chronic_absenteeism_recovery":
        # The recovery story: absences weight heavily into the first half, then
        # taper. This is what makes "attendance improves in recent months" visible
        # and gives the correlation something directional to find.
        first_half = active_days[: len(active_days) // 2]
        second_half = active_days[len(active_days) // 2 :]
        early = spread_across(rng, first_half, int(absent_count * 0.75), cluster=True)
        late = spread_across(rng, second_half, absent_count - len(early), cluster=True)
        absent_days = sorted(set(early + late))
    else:
        absent_days = sorted(set(spread_across(rng, active_days, absent_count, cluster=cluster)))

    absent_set = set(absent_days)
    # Tardies are independent of absences and skew toward lower-engagement students.
    tardy_target = round(len(active_days) * rng.uniform(0.005, 0.05))
    if archetype.tier.key == "underachiever":
        tardy_target = round(tardy_target * 1.7)
    tardy_days = set(
        spread_across(rng, [d for d in active_days if d not in absent_set], tardy_target)
    )

    # Only non-present days are stored. A year is ~180 rows of "present" otherwise,
    # which is 90 percent of the attendance stream carrying no information: the
    # default is recoverable from the school calendar minus these exceptions. The
    # UI needs absence dates aligned to the instructional timeline, and that is
    # exactly what this is.
    events = []
    days_present = days_absent = days_excused = tardy_count = 0

    for day in active_days:
        if day in absent_set:
            excused = chance(rng, 0.72 if situation != "chronic_absenteeism_recovery" else 0.48)
            status = "excused_absent" if excused else "absent"
            reason = rng.choice(ABSENCE_REASONS[:4] if excused else ABSENCE_REASONS[4:])
            days_absent += 1
            if excused:
                days_excused += 1
        elif day in tardy_days:
            status = "tardy"
            reason = "Late arrival"
            tardy_count += 1
            days_present += 1
        else:
            status = "present"
            reason = None
            days_present += 1

        if status != "present":
            events.append(
                {"date": day.isoformat(), "status": status, "notes": reason}
            )

    total = len(active_days)
    rate = round(100 * days_present / total, 1) if total else 0.0

    return {
        "id": f"att-{student.id}-{school_year}",
        "studentId": student.id,
        "schoolYear": school_year,
        "attendanceExceptions": events,
        "attendanceModel": "exceptions_only",
        "metrics": {
            "daysEnrolled": total,
            "daysPresent": days_present,
            "daysAbsent": days_absent,
            "daysExcusedAbsent": days_excused,
            "tardyCount": tardy_count,
            "attendanceRate": rate,
            "chronicAbsenteeismFlag": rate < 90.0,
        },
        "metadata": {
            "dataSource": "District Attendance System",
            "lastSyncDate": (as_of or calendar.last_day).isoformat(),
            "isApproximate": False,
        },
    }


def absent_dates(attendance: dict) -> set[dt.date]:
    return {
        dt.date.fromisoformat(e["date"])
        for e in attendance["attendanceExceptions"]
        if e["status"] in ("absent", "excused_absent")
    }


# ---------------------------------------------------------------------------
# 2. Behavior
# ---------------------------------------------------------------------------

INCIDENT_TYPES = [
    ("discipline_referral", "medium"), ("office_visit", "low"),
    ("detention", "medium"), ("suspension", "high"),
    ("positive_recognition", None),
]

INCIDENT_DESCRIPTIONS = {
    "discipline_referral": [
        "Disruption of instructional time", "Refusal to follow staff direction",
        "Inappropriate language toward peer", "Repeated off-task behavior after redirection",
    ],
    "office_visit": [
        "Sent to office to reset", "Conflict with peer during transition",
        "Voluntary check-in with administrator",
    ],
    "detention": ["Assigned after repeated class disruptions", "Accumulated tardies"],
    "suspension": ["Physical altercation with peer", "Repeated defiance following intervention"],
    "positive_recognition": [
        "Recognized for helping a classmate", "Student of the month nomination",
        "Consistent improvement noted by teacher", "Leadership during group work",
    ],
}

LOCATIONS = ["Classroom", "Hallway", "Cafeteria", "Gymnasium", "Bus", "Library", "Playground"]


def build_behavior(
    student,
    archetype: Archetype,
    calendar: SchoolCalendar,
    school_year: str,
    sections: list,
    staff_lookup: dict,
    as_of: dt.date | None = None,
) -> dict:
    """Behavior incidents, clustered into one class where the archetype localizes them.

    For a behavioral-cluster student, incidents concentrate in a single subject and
    a narrow date window. That is what lets the system show a mastery dip in that
    subject specifically rather than assuming a struggling student struggles
    everywhere -- the exact distinction the guidelines document asks the data to test.
    """
    rng = stream(student.id, "behavior", school_year)
    days = calendar.days_through(as_of)
    incidents = []

    count = archetype.behavior_incident_count
    localized = archetype.situation.behavior_localized

    if localized and count:
        # Concentrate in one marking period, in the focus subject's section.
        elapsed = set(days)
        period = rng.choice(calendar.marking_periods)
        window = [d for d in period.instructional_days if d in elapsed] or days
        incident_days = spread_across(rng, window, count, cluster=True)
        focus_sections = [s for s in sections if s.subject == archetype.focus_subject]
        location_section = focus_sections[0] if focus_sections else None
    else:
        incident_days = spread_across(rng, days, count)
        location_section = None

    for index, day in enumerate(incident_days):
        # Higher-tier students skew toward positive recognition.
        positive_odds = {"high_achiever": 0.72, "typical": 0.42, "underachiever": 0.16}[
            archetype.tier.key
        ]
        if localized:
            positive_odds *= 0.25

        if chance(rng, positive_odds):
            kind, severity = "positive_recognition", None
        else:
            kind, severity = rng.choice(INCIDENT_TYPES[:4])
            # Suspensions are rare; downgrade most draws.
            if kind == "suspension" and not chance(rng, 0.25):
                kind, severity = "discipline_referral", "medium"

        staff_id = (
            staff_lookup.get(location_section.teacher_id, {}).get("id")
            if location_section
            else None
        )

        incidents.append(
            {
                "id": f"beh-{student.id}-{school_year}-{index + 1:03d}",
                "date": day.isoformat(),
                "incidentType": kind,
                "severity": severity,
                "description": rng.choice(INCIDENT_DESCRIPTIONS[kind]),
                "staff": staff_id or "staff-unassigned",
                "location": location_section.name if location_section else rng.choice(LOCATIONS),
                "subject": archetype.focus_subject if localized else None,
                "outcome": _incident_outcome(kind),
            }
        )

    incidents.sort(key=lambda i: i["date"])
    referrals = [i for i in incidents if i["incidentType"] == "discipline_referral"]
    suspensions = [i for i in incidents if i["incidentType"] == "suspension"]
    positives = [i for i in incidents if i["incidentType"] == "positive_recognition"]

    return {
        "id": f"beh-{student.id}-{school_year}",
        "studentId": student.id,
        "schoolYear": school_year,
        "incidents": incidents,
        "metrics": {
            "totalIncidents": len(incidents),
            "disciplineReferralCount": len(referrals),
            "suspensionCount": len(suspensions),
            "suspensionDays": sum(1 for _ in suspensions),
            "positiveRecognitionCount": len(positives),
        },
        "metadata": {
            "dataSource": "Behavior Tracking System",
            "lastSyncDate": (as_of or calendar.last_day).isoformat(),
            "isApproximate": False,
        },
    }


def _incident_outcome(kind: str) -> str:
    return {
        "discipline_referral": "Conference with student; family contacted",
        "office_visit": "Returned to class after reset",
        "detention": "Lunch detention served",
        "suspension": "One day out-of-school suspension; re-entry meeting held",
        "positive_recognition": "Noted in student record; family notified",
    }[kind]


# ---------------------------------------------------------------------------
# 3. Health and wellness
# ---------------------------------------------------------------------------

HEALTH_EVENTS = [
    ("nurse_visit", "Reported headache", "Rested; returned to class"),
    ("nurse_visit", "Minor playground injury", "First aid administered"),
    ("nurse_visit", "Stomach discomfort", "Family contacted; student remained at school"),
    ("medication_flag", "Scheduled daily medication", "Administered per care plan"),
    ("counselor_referral", "Teacher referral following classroom conflict", "Counselor check-in scheduled"),
    ("counselor_referral", "Self-referral for support", "Ongoing check-ins established"),
    ("mental_health_flag", "Anxiety reported affecting class participation", "Support plan discussed with family"),
    ("chronic_condition", "Asthma action plan on file", "Care plan reviewed with family"),
    ("immunization_status", "Annual immunization record review", "Record complete"),
]


def build_health(
    student, archetype: Archetype, calendar: SchoolCalendar, school_year: str,
    as_of: dt.date | None = None,
) -> dict:
    rng = stream(student.id, "health", school_year)
    days = calendar.days_through(as_of)
    count = archetype.health_event_count

    is_health_situation = archetype.situation.key == "health_wellness_factor"
    event_days = spread_across(rng, days, count, cluster=is_health_situation)

    events = []
    for index, day in enumerate(event_days):
        if is_health_situation and index == 0:
            kind, description, outcome = HEALTH_EVENTS[7]  # chronic condition on file
        else:
            pool = HEALTH_EVENTS if is_health_situation else HEALTH_EVENTS[:5]
            kind, description, outcome = rng.choice(pool)
        events.append(
            {
                "date": day.isoformat(),
                "eventType": kind,
                "description": description,
                "staff": "School Nurse" if kind in ("nurse_visit", "medication_flag") else "School Counselor",
                "outcome": outcome,
            }
        )

    events.sort(key=lambda e: e["date"])
    kinds = {e["eventType"] for e in events}

    return {
        "id": f"hlth-{student.id}-{school_year}",
        "studentId": student.id,
        "schoolYear": school_year,
        "healthEvents": events,
        "flags": {
            "chronicHealthCondition": is_health_situation and "chronic_condition" in kinds,
            "mentalHealthConcern": "mental_health_flag" in kinds,
            "foodInsecurityRisk": chance(rng, 0.09),
            "housingInstability": chance(rng, 0.04),
            "otherWellnessFactors": [],
        },
        "metadata": {
            "dataSource": "Health Office Records",
            "confidentialityLevel": "restricted",
            "lastSyncDate": (as_of or calendar.last_day).isoformat(),
        },
    }


# ---------------------------------------------------------------------------
# 4. Special services
# ---------------------------------------------------------------------------

IEP_GOAL_TEMPLATES = {
    "Math": "Given grade-level problems, {name} will solve multi-step tasks with {pct}% accuracy across three consecutive sessions.",
    "ELA": "{name} will read grade-level text and answer comprehension questions with {pct}% accuracy across three consecutive sessions.",
    "Science": "{name} will construct written explanations from evidence with {pct}% accuracy given a graphic organizer.",
    "Social Studies": "{name} will identify main ideas in informational text with {pct}% accuracy using guided notes.",
    "Arts": "{name} will complete multi-step studio tasks with {pct}% independence.",
    "Physical Education": "{name} will demonstrate cooperative participation in group activities in {pct}% of observed sessions.",
}

ACCOMMODATIONS = [
    "Extended time on assessments (1.5x)",
    "Preferential seating near point of instruction",
    "Directions repeated and rephrased",
    "Frequent check-ins for understanding",
    "Assignments broken into smaller segments",
    "Access to text-to-speech tools",
    "Reduced-distraction testing environment",
    "Use of graphic organizers for writing tasks",
    "Movement breaks as needed",
]

ELIGIBILITY_CATEGORIES = [
    "Specific Learning Disability", "Other Health Impairment", "Speech or Language Impairment",
    "Autism", "Emotional Disturbance",
]


def build_special_services(
    student, archetype: Archetype, calendar: SchoolCalendar, school_year: str,
    subjects: list[str], as_of: dt.date | None = None,
) -> dict | None:
    """IEP, 504, or other services -- only where the archetype calls for them."""
    if not archetype.situation.has_services:
        # A small number of students carry a non-IEP service without the situation flag.
        rng_check = stream(student.id, "services-check", school_year)
        if not chance(rng_check, 0.06):
            return None
        return _minor_service_record(student, school_year, rng_check, calendar, as_of)

    rng = stream(student.id, "services", school_year)
    fall_year = int(school_year.split("-")[0])
    start = dt.date(fall_year - rng.randint(0, 3), 9, rng.randint(5, 28))

    service_type = "IEP" if chance(rng, 0.68) else "504_plan"
    goal_subjects = rng.sample(sorted(subjects), rng.randint(1, 3))

    goals = []
    for index, subject in enumerate(goal_subjects):
        goals.append(
            {
                "goalId": f"goal-{student.id}-{index + 1}",
                "description": IEP_GOAL_TEMPLATES[subject].format(
                    name=student.first_name, pct=rng.choice([70, 75, 80, 85])
                ),
                "subject": subject,
                "targetDate": dt.date(fall_year + 1, 5, 30).isoformat(),
                # The source archetype is explicitly "IEP student ON TRACK", so
                # progress skews positive rather than defaulting to struggling.
                "progressTowardGoal": rng.choices(
                    ["on_track", "needs_support", "exceeded"], weights=[0.62, 0.28, 0.10]
                )[0],
                "evidence": [],  # populated once mastery evidence exists
            }
        )

    record = {
        "id": f"svc-{student.id}",
        "studentId": student.id,
        "startDate": start.isoformat(),
        "status": "active",
        "services": [
            {
                "serviceType": service_type,
                "startDate": start.isoformat(),
                "endDate": None,
                "description": f"{service_type} with specially designed instruction and accommodations",
                "responsibleStaff": "Special Education Teacher",
                "notes": "Progress reviewed each marking period.",
            }
        ],
        "metadata": {
            "dataSource": "Student Information System",
            "confidentialityLevel": "restricted",
            "lastSyncDate": (as_of or calendar.last_day).isoformat(),
        },
    }

    if service_type == "IEP":
        record["iepStatus"] = {
            "iepId": f"iep-{student.id}",
            "goals": goals,
            "accommodations": rng.sample(ACCOMMODATIONS, rng.randint(3, 5)),
            "reviewDates": [
                dt.date(fall_year, 11, 15).isoformat(),
                dt.date(fall_year + 1, 3, 15).isoformat(),
            ],
        }
        record["eligibilityCategories"] = [rng.choice(ELIGIBILITY_CATEGORIES)]
    else:
        record["iepStatus"] = None
        record["eligibilityCategories"] = []
        record["services"][0]["notes"] = "504 accommodations reviewed annually."
        record["accommodations"] = rng.sample(ACCOMMODATIONS, rng.randint(2, 4))

    return record


def _minor_service_record(
    student, school_year: str, rng, calendar: SchoolCalendar,
    as_of: dt.date | None = None,
) -> dict:
    """ELL, gifted identification, speech, or intervention -- no IEP attached."""
    fall_year = int(school_year.split("-")[0])
    service_type = rng.choice(
        ["ELL", "gifted_identification", "speech_services", "intervention_program", "counseling"]
    )
    return {
        "id": f"svc-{student.id}",
        "studentId": student.id,
        "startDate": dt.date(fall_year, 9, rng.randint(5, 28)).isoformat(),
        "status": "active",
        "services": [
            {
                "serviceType": service_type,
                "startDate": dt.date(fall_year, 9, rng.randint(5, 28)).isoformat(),
                "endDate": None,
                "description": f"{service_type.replace('_', ' ').title()} services",
                "responsibleStaff": "Support Services Staff",
                "notes": "Reviewed at each marking period.",
            }
        ],
        "iepStatus": None,
        "eligibilityCategories": [],
        "metadata": {
            "dataSource": "Student Information System",
            "confidentialityLevel": "restricted",
            "lastSyncDate": (as_of or calendar.last_day).isoformat(),
        },
    }
