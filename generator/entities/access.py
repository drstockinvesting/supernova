"""User accounts, role assignments, and permission scopes.

The UI/UX design specifies "Unified Login, Role-Based Adaptation" -- one portal
that adapts to whoever is looking. That needs accounts distinct from people
records, because a Staff member, a Guardian, and a Student are three different
kinds of person who all sign in.

Authorization here is always a **role plus a scope**. "Administrator" alone means
nothing: a building administrator and a district administrator hold the same role
at different scopes, and the design treats that as the difference between two
entirely different dashboards.

No credential material is generated. The dataset carries identity and
authorization only; authentication is out of scope for the prototype.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from ..rng import stream

# Capability sets per role. Health and special services are deliberately separate
# from view_individual_students: a teacher can see that a student has
# accommodations without seeing counselor notes or a mental health flag.
ROLE_PERMISSIONS = {
    "teacher": [
        "view_aggregate_mastery",
        "view_individual_students",
        "view_student_names",
        "view_attendance_detail",
        "view_behavior_detail",
        "view_evidence_artifacts",
        "record_mastery",
        "log_interruptions",
        "add_intervention_notes",
    ],
    "building_administrator": [
        "view_aggregate_mastery",
        "view_individual_students",
        "view_student_names",
        "view_attendance_detail",
        "view_behavior_detail",
        "view_health_detail",
        "view_special_services_detail",
        "view_evidence_artifacts",
        "log_interruptions",
        "add_intervention_notes",
    ],
    "district_administrator": [
        "view_aggregate_mastery",
        "view_individual_students",
        "view_student_names",
        "view_attendance_detail",
        "view_behavior_detail",
        "view_health_detail",
        "view_special_services_detail",
        "view_evidence_artifacts",
        "log_interruptions",
        "add_intervention_notes",
    ],
    # Board members see district aggregates with no school or student identifiers.
    "school_board_member": [
        "view_aggregate_mastery",
    ],
    "guardian": [
        "view_individual_students",
        "view_student_names",
        "view_attendance_detail",
        "view_evidence_artifacts",
    ],
    "student": [
        "view_individual_students",
        "view_evidence_artifacts",
    ],
    "community_member": [
        "view_aggregate_mastery",
    ],
}

# Support staff get the confidential streams their job requires and nothing else.
SUPPORT_ROLE_PERMISSIONS = {
    "counselor": [
        "view_aggregate_mastery",
        "view_individual_students",
        "view_student_names",
        "view_attendance_detail",
        "view_behavior_detail",
        "view_health_detail",
        "view_special_services_detail",
        "add_intervention_notes",
    ],
    "nurse": [
        "view_individual_students",
        "view_student_names",
        "view_attendance_detail",
        "view_health_detail",
    ],
    "special_education_teacher": [
        "view_aggregate_mastery",
        "view_individual_students",
        "view_student_names",
        "view_attendance_detail",
        "view_behavior_detail",
        "view_special_services_detail",
        "view_evidence_artifacts",
        "record_mastery",
        "add_intervention_notes",
    ],
}


@dataclass
class RoleAssignment:
    id: str
    user_id: str
    role: str
    scope_type: str  # section | school | district | student | public
    scope_ids: list[str]
    permissions: list[str]
    effective_date: str

    def to_record(self) -> dict:
        return {
            "id": self.id,
            "userId": self.user_id,
            "role": self.role,
            "scopeType": self.scope_type,
            "scopeIds": self.scope_ids,
            "permissions": self.permissions,
            "effectiveDate": self.effective_date,
            "expirationDate": None,
            "metadata": {"dataSource": "supernova-generator", "grantedBy": "system"},
        }


@dataclass
class User:
    id: str
    username: str
    email: str
    display_name: str
    principal_type: str  # staff | guardian | student | community_member
    principal_id: str | None
    role_assignments: list[RoleAssignment] = field(default_factory=list)
    last_login_date: str | None = None

    def to_record(self) -> dict:
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "displayName": self.display_name,
            "principalType": self.principal_type,
            "principalId": self.principal_id,
            "roleAssignments": [ra.to_record() for ra in self.role_assignments],
            "accountStatus": "active",
            "lastLoginDate": self.last_login_date,
            "metadata": {"dataSource": "supernova-generator"},
        }


def _recent_login(seed_key: str) -> str:
    rng = stream(seed_key, "login")
    return f"2025-0{rng.randint(4, 5)}-{rng.randint(10, 28):02d}T{rng.randint(7, 19):02d}:{rng.randint(0, 59):02d}:00"


def build_users(
    staff_by_school: dict[str, list],
    district_staff: list,
    sections: list,
    students: list,
    guardians: list,
    school_ids: list[str],
    district_id: str,
) -> list[User]:
    """One account per staff member, guardian, secondary student, and board member."""
    users: list[User] = []
    counter = 0

    def next_id() -> str:
        nonlocal counter
        counter += 1
        return f"usr-{counter:05d}"

    # --- Staff -------------------------------------------------------------
    sections_by_teacher: dict[str, list[str]] = {}
    for section in sections:
        sections_by_teacher.setdefault(section.teacher_id, []).append(section.id)

    for school_id, staff_list in sorted(staff_by_school.items()):
        for member in staff_list:
            user_id = next_id()
            if member.role == "teacher":
                scope_type, scope_ids = "section", sorted(
                    sections_by_teacher.get(member.id, [])
                )
                permissions = ROLE_PERMISSIONS["teacher"]
                role = "teacher"
            elif member.role == "building_administrator":
                scope_type, scope_ids = "school", [school_id]
                permissions = ROLE_PERMISSIONS["building_administrator"]
                role = "building_administrator"
            else:
                # Counselor, nurse, special education teacher: building scope with
                # a narrower capability set than the administrator.
                scope_type, scope_ids = "school", [school_id]
                permissions = SUPPORT_ROLE_PERMISSIONS[member.role]
                role = member.role

            user = User(
                id=user_id,
                username=member.email.split("@")[0],
                email=member.email,
                display_name=member.display_name,
                principal_type="staff",
                principal_id=member.id,
                last_login_date=_recent_login(member.id),
            )
            user.role_assignments.append(
                RoleAssignment(
                    id=f"ra-{user_id}-1",
                    user_id=user_id,
                    role=role,
                    scope_type=scope_type,
                    scope_ids=scope_ids,
                    permissions=permissions,
                    effective_date=member.hire_date,
                )
            )
            users.append(user)

    # --- District administrators -------------------------------------------
    for member in district_staff:
        user_id = next_id()
        user = User(
            id=user_id,
            username=member.email.split("@")[0],
            email=member.email,
            display_name=member.display_name,
            principal_type="staff",
            principal_id=member.id,
            last_login_date=_recent_login(member.id),
        )
        user.role_assignments.append(
            RoleAssignment(
                id=f"ra-{user_id}-1",
                user_id=user_id,
                role="district_administrator",
                scope_type="district",
                scope_ids=[district_id],
                permissions=ROLE_PERMISSIONS["district_administrator"],
                effective_date=member.hire_date,
            )
        )
        users.append(user)

    # --- School board -------------------------------------------------------
    board_rng = stream("district", "board")
    from ..names import FIRST_NAMES, LAST_NAMES

    for seat in range(1, 8):
        first = board_rng.choice(FIRST_NAMES)
        last = board_rng.choice(LAST_NAMES)
        user_id = next_id()
        user = User(
            id=user_id,
            username=f"board.{last.lower()}{seat}",
            email=f"{first[0].lower()}{last.lower()}{seat}@constellationboard.org",
            display_name=f"{first} {last}",
            principal_type="staff",
            principal_id=None,
            last_login_date=_recent_login(f"board-{seat}"),
        )
        user.role_assignments.append(
            RoleAssignment(
                id=f"ra-{user_id}-1",
                user_id=user_id,
                role="school_board_member",
                scope_type="district",
                scope_ids=[district_id],
                permissions=ROLE_PERMISSIONS["school_board_member"],
                effective_date="2023-12-04",
            )
        )
        users.append(user)

    # --- Guardians ----------------------------------------------------------
    # Scope is the set of students where educational rights actually apply. A
    # guardian linked without rights gets an empty scope rather than a blocked
    # account, which is how "permission boundaries are invisible" is enforced.
    for guardian in guardians:
        permitted = [
            link["studentId"]
            for link in guardian.student_links
            if link.get("hasEducationalRights")
        ]
        user_id = next_id()
        user = User(
            id=user_id,
            username=guardian.email.split("@")[0],
            email=guardian.email,
            display_name=guardian.display_name,
            principal_type="guardian",
            principal_id=guardian.id,
            last_login_date=_recent_login(guardian.id),
        )
        user.role_assignments.append(
            RoleAssignment(
                id=f"ra-{user_id}-1",
                user_id=user_id,
                role="guardian",
                scope_type="student",
                scope_ids=sorted(permitted),
                permissions=ROLE_PERMISSIONS["guardian"],
                effective_date="2024-08-26",
            )
        )
        users.append(user)

    # --- Students -----------------------------------------------------------
    # Accounts for grade 6 and up. The design calls for age-appropriate student
    # views; elementary students do not get their own login in this prototype.
    from ..standards_catalog import GRADE_SEQUENCE

    for student in students:
        if GRADE_SEQUENCE.index(student.grade_level) < GRADE_SEQUENCE.index("6"):
            continue
        user_id = next_id()
        username = f"{student.first_name[0].lower()}{student.last_name.lower()}{student.student_id[-4:]}"
        user = User(
            id=user_id,
            username=username,
            email=f"{username}@students.constellation.k12.pa.us",
            display_name=student.display_name,
            principal_type="student",
            principal_id=student.id,
            last_login_date=_recent_login(student.id),
        )
        user.role_assignments.append(
            RoleAssignment(
                id=f"ra-{user_id}-1",
                user_id=user_id,
                role="student",
                scope_type="student",
                scope_ids=[student.id],
                permissions=ROLE_PERMISSIONS["student"],
                effective_date=student.enrollment_date,
            )
        )
        users.append(user)

    # --- Community ----------------------------------------------------------
    # A single anonymous principal backing the public dashboard. Community access
    # is a scope, not an account per visitor.
    user_id = next_id()
    community = User(
        id=user_id,
        username="community",
        email="public@constellation.k12.pa.us",
        display_name="Community Member",
        principal_type="community_member",
        principal_id=None,
        last_login_date=None,
    )
    community.role_assignments.append(
        RoleAssignment(
            id=f"ra-{user_id}-1",
            user_id=user_id,
            role="community_member",
            scope_type="public",
            scope_ids=school_ids,
            permissions=ROLE_PERMISSIONS["community_member"],
            effective_date="2024-08-26",
        )
    )
    users.append(community)

    return users
