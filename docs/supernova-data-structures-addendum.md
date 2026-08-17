# Supernova LMS: Data Structures Addendum

## Purpose

`supernova-data-structures.md` defines the student-centric core and the seven data streams.
`supernova-ui-ux-design.md` describes dashboards that reference information those structures
never define — teacher names on classroom cards, unit pacing percentages, interruption counts,
homework completion trends, role-based login, and research citations.

This document defines the missing entities so those dashboards have something to render from.
It is **additive**: nothing in the original document changes, and the notation matches it.

### The Gap

| UI element (from `supernova-ui-ux-design.md`) | Entity defined here |
|---|---|
| `[Teacher Name] - [Grade] [Subject]` classroom cards | `Staff`, `Section` |
| `Pacing: 73% (on track)`, `Current Unit Mastery: 68%` | `CurriculumUnit` |
| `Interruptions This Unit: 2`, "two hours of lost instruction" | `InterruptionRecord` |
| "Homework completion dropped from 88% to 74%" | `ParticipationRecord` |
| Unified login, permission-aware drill-down | `User`, `RoleAssignment` |
| Parent dashboard: "see only their own child's data" | `Guardian` |
| "missed the Unit 2 introduction on September 14th" | `SchoolCalendar`, `MarkingPeriod` |
| "Research shows students who miss 10% of the school year…" | `ResearchCitation` |

---

## Organizational Entities

### Staff

Teachers and administrators. Referenced by name on nearly every administrator view.

```
Staff
├── id (unique identifier)
├── firstName
├── lastName
├── staffId (school-assigned ID)
├── role (enum: teacher, building_administrator, district_administrator,
│         counselor, nurse, special_education_teacher, support_staff)
├── schoolId (primary building; null for district-level roles)
├── districtId
├── subjectsTaught (array of subjects; empty for non-teaching roles)
├── gradeLevelsTaught (array; empty for non-teaching roles)
├── email
├── hireDate
├── employmentStatus (enum: active, inactive, former)
└── metadata (created date, last updated, data quality flags)
```

### Section

A specific class: one teacher, one group of students, one subject, one period. This is the
unit the administrator dashboard's classroom grid iterates over.

**Elementary sections are self-contained** — a single section covers all six subjects with one
teacher, so `subject` is `"all"` and the same roster persists across every subject's mastery
data. **Secondary sections are departmentalized** — a student belongs to one section per
subject, each with a different teacher.

```
Section
├── id (unique identifier)
├── schoolId (references School)
├── schoolYear (e.g., 2024-2025)
├── name (e.g., "Grade 3 - Whitfield", "Algebra I - Period 4")
├── gradeLevel (K-12)
├── subject (Math, ELA, Science, Social Studies, Arts, Physical Education,
│            or "all" for self-contained elementary)
├── teacherId (references Staff)
├── coTeacherIds (array; used for inclusion/co-taught sections)
├── period (class period identifier; null for self-contained)
├── roomNumber
├── instructionalModel (enum: self_contained, departmentalized)
├── roster (array of Student IDs enrolled in this section)
├── enrollmentCount (integer)
└── metadata (created date, last updated, data quality flags)
```

**Integrity rule:** every Student must belong to at least one Section per school year. In
secondary schools, a student belongs to exactly one Section per subject taught that year.

### Course Model

`Standard.gradeLevel` alone is sufficient through grade 8, where standards are published
grade by grade. High school is different: CCSS mathematics is organized by *conceptual
category* rather than grade, NCAS arts uses proficiency levels, and students take named
courses. To keep grade-level comparison working across the district — the administrator and
board dashboards both depend on it — **Supernova models one fixed course per subject per
grade.** Every 10th grader takes Geometry; there are no divergent pathways.

This is a deliberate simplification of real high school scheduling, made so that "which grades
are strongest in mathematics" stays an answerable question. The course sequences themselves
follow the predominant US pattern.

```
Course
├── id (unique identifier)
├── name (e.g., "Algebra I", "American Literature")
├── subject
├── gradeLevel (the single grade at which this course is taken)
├── standardIds (array of Standard IDs this course covers)
├── framework (which standards framework supplies its standards)
└── description
```

| Grade | Math | ELA | Science | Social Studies | Arts | PE |
|---|---|---|---|---|---|---|
| 9 | Algebra I | Literature & Composition | Biology | World Geography | Art I | Physical Education 9 |
| 10 | Geometry | World Literature | Chemistry | World History | Art II | Physical Education 10 |
| 11 | Algebra II | American Literature | Physics | United States History | Art III | Fitness & Wellness |
| 12 | Pre-Calculus | British Literature | Environmental Science | US Government & Economics | Art IV | Lifetime Fitness |

**How each framework maps onto the courses:**

- **Math (CCSS)** — high school standards carry conceptual-category codes (`HSA-REI`, `HSG-CO`,
  `HSF-TF`) rather than grade numbers. Algebra I draws from Algebra and Functions, Geometry from
  the Geometry category, Algebra II from advanced Algebra plus Complex Numbers, and Pre-Calculus
  from the standards CCSS marks with `(+)` as beyond the college-ready threshold — which is
  exactly what a Pre-Calculus course is for.
- **ELA (CCSS)** — published in 9–10 and 11–12 grade bands. English 9 and 10 share the 9–10
  band; English 11 and 12 share 11–12. The band is shared; the course content and its evidence
  artifacts are not.
- **Science (NGSS)** — high school performance expectations are banded 9–12 and organized by
  domain, which maps cleanly onto the Biology→Chemistry→Physics sequence: Biology to `HS-LS`,
  Chemistry to `HS-PS1`, Physics to `HS-PS2`/`PS3`/`PS4`, Environmental Science to `HS-ESS`
  and `HS-LS2`.
- **Social Studies (C3)** — banded 9–12 across four dimensions. Each course draws its
  disciplinary standards from the matching strand (`D2.Geo`, `D2.His`, `D2.Civ`, `D2.Eco`) plus
  the inquiry dimensions `D1`, `D3`, and `D4` that apply to all four courses.
- **Arts (NCAS)** — uses proficiency levels, not grades. Art I and II map to HS Proficient
  (`HSI`), Art III to Accomplished (`HSII`), Art IV to Advanced (`HSIII`).
- **PE (SHAPE America)** — high school outcomes come at Level 1 and Level 2. PE 9 and 10 use
  Level 1; Fitness & Wellness and Lifetime Fitness use Level 2.

**Middle school note:** NGSS and C3 are also banded (6–8) rather than grade-specific. Science
follows the common Earth (6) → Life (7) → Physical (8) rotation so each grade has a distinct
standard set; social studies distributes its 6–8 band the same way. CCSS math and ELA remain
grade-specific through grade 8 and are used as published.

### Guardian

Enables the parent dashboard's "see only their own child" permission boundary. A guardian may
be linked to multiple students (siblings), and a student may have multiple guardians.

```
Guardian
├── id (unique identifier)
├── firstName
├── lastName
├── relationship (enum: mother, father, stepparent, grandparent,
│                 foster_parent, legal_guardian, other)
├── email
├── phone
├── preferredContactMethod (enum: email, phone, text, mail)
├── preferredLanguage
├── studentLinks (array)
│   ├── studentId (references Student)
│   ├── custodyStatus (enum: primary, secondary, joint, none)
│   └── hasEducationalRights (boolean: may this guardian view records?)
└── metadata (created date, last updated, data quality flags)
```

**Integrity rule:** a Guardian may only view a Student's data where the corresponding
`studentLink` has `hasEducationalRights` set true. This is the enforcement point for the parent
dashboard, and it is deliberately a per-link property rather than a per-guardian one — custody
arrangements are frequently asymmetric.

---

## Calendar Entities

### SchoolCalendar

Without an explicit calendar, attendance events can't be generated against real instructional
days, and the UI/UX doc's narratives ("missed the Unit 2 introduction on September 14th") have
no dates to anchor to.

```
SchoolCalendar
├── id (unique identifier)
├── schoolId (references School)
├── schoolYear (e.g., 2024-2025)
├── firstInstructionalDay
├── lastInstructionalDay
├── totalInstructionalDays (integer, typically ~180)
├── instructionalDays (array of dates on which school was in session)
├── nonInstructionalDays (array)
│   ├── date
│   ├── reason (enum: weekend, holiday, in_service, weather_closure,
│   │            break, other)
│   └── description
├── markingPeriods (array of MarkingPeriod - see below)
└── metadata (created date, last updated, data source)
```

### MarkingPeriod

```
MarkingPeriod
├── id (unique identifier)
├── schoolCalendarId (references SchoolCalendar)
├── schoolYear
├── name (e.g., "Quarter 1", "Marking Period 3")
├── sequence (integer: 1-4)
├── startDate
├── endDate
├── instructionalDayCount (integer: school days in this window)
└── metadata
```

**Integrity rule:** every dated record in every data stream — attendance events, behavior
incidents, evidence artifacts, contact events — must fall on or within a date range covered by
the relevant school's calendar. Evidence dated on a weather closure day is a data quality
failure, not a rounding error.

---

## Curriculum Entities

### CurriculumUnit

The administrator dashboard's `Pacing: 73% (on track)` and `Current Unit Mastery: 68%` both
require knowing which standards a section is teaching, when, and how far through the plan it
should be. This is also what makes the flagship attendance-to-mastery correlation possible: a
student's absence dates are only meaningful when compared against the unit being taught on
those dates.

```
CurriculumUnit
├── id (unique identifier)
├── sectionId (references Section)
├── schoolYear
├── subject
├── name (e.g., "Unit 2: Multiplication and Division Concepts")
├── sequence (integer: order within the school year)
├── markingPeriodId (references MarkingPeriod)
├── startDate
├── endDate
├── plannedInstructionalDays (integer)
├── standardIds (array of Standard IDs taught in this unit)
├── keyInstructionDates (array — dates of instruction critical to the unit,
│                        used to flag consequential absences)
│   ├── date
│   ├── description (e.g., "Unit 2 introduction and core concept")
│   └── standardIds (which standards were introduced or developed)
├── pacing
│   ├── percentContentCovered (0-100)
│   ├── percentTimeElapsed (0-100)
│   └── pacingStatus (enum: ahead, on_track, slightly_behind, behind)
├── status (enum: not_started, in_progress, completed)
└── metadata (created date, last updated, data quality flags)
```

**On `keyInstructionDates`:** this is the mechanism behind the narrative "Three students missed
the Unit 2 introduction on September 14th, which may explain their slower mastery development."
Without flagging which days actually mattered, every absence looks equally consequential, and
the system can only report absence counts rather than absence *impact*.

### InterruptionRecord

Named repeatedly in the UI/UX doc — classroom cards, the interruptions context layer, and the
analytics summary — and defined nowhere.

```
InterruptionRecord
├── id (unique identifier)
├── sectionId (references Section)
├── schoolYear
├── interruptions (array)
│   ├── id
│   ├── date
│   ├── interruptionType (enum: assembly, fire_drill, lockdown_drill,
│   │                      schedule_change, early_dismissal, pull_out,
│   │                      testing_window, technology_failure,
│   │                      substitute_coverage, other)
│   ├── description
│   ├── minutesLost (integer: instructional time lost)
│   ├── wasPlanned (boolean)
│   ├── curriculumUnitId (which unit was disrupted, if any)
│   └── loggedBy (references Staff)
├── metrics (aggregated for the period)
│   ├── totalInterruptions
│   ├── unplannedInterruptions
│   ├── totalMinutesLost
│   └── averageInterruptionsPerUnit
└── metadata (data source system, last sync date)
```

### ParticipationRecord

Backs "Homework completion dropped from 88% to 74% after the October 15th assembly."

```
ParticipationRecord
├── id (unique identifier)
├── studentId (references Student)
├── sectionId (references Section)
├── schoolYear
├── assignments (array)
│   ├── id
│   ├── assignmentTitle
│   ├── curriculumUnitId (references CurriculumUnit)
│   ├── assignedDate
│   ├── dueDate
│   ├── submittedDate (null if never submitted)
│   ├── completionStatus (enum: completed_on_time, completed_late,
│   │                      incomplete, missing, excused)
│   └── standardIds (standards the assignment addressed)
├── participationObservations (array — optional teacher input)
│   ├── date
│   ├── engagementLevel (enum: high, moderate, low, disengaged)
│   └── notes
├── metrics (aggregated for the period)
│   ├── assignmentsAssigned
│   ├── assignmentsCompleted
│   ├── completionRate (percentage)
│   ├── onTimeRate (percentage)
│   └── completionRateByMarkingPeriod (array — enables trend narratives)
└── metadata (data source system, last sync date)
```

**Relationship to Evidence:** a completed assignment may also be an `Evidence` artifact
supporting a MasteryRecord, but the two are not the same thing. Participation measures whether
work was *done*; evidence measures whether work *demonstrated a standard*. A student can
complete every assignment and demonstrate mastery of nothing, and that gap is itself a signal
worth surfacing.

---

## Access Control Entities

### User

The UI/UX doc specifies "Unified Login, Role-Based Adaptation" — one portal that adapts to the
viewer. That requires accounts distinct from the people records (a Staff member, a Guardian,
and a Student are all different kinds of people who all need to log in).

```
User
├── id (unique identifier)
├── username
├── email
├── displayName
├── principalType (enum: staff, guardian, student, community_member)
├── principalId (references Staff, Guardian, or Student; null for community)
├── roleAssignments (array of RoleAssignment - see below)
├── accountStatus (enum: active, inactive, locked, pending)
├── lastLoginDate
└── metadata (created date, last updated)
```

**Note:** no credential material (passwords, hashes, tokens) appears in this structure or in
the generated dataset. Authentication is out of scope for the prototype; the dataset carries
identity and authorization only.

### RoleAssignment

Authorization is a **role plus a scope**. "Administrator" alone is meaningless — a building
administrator and a district administrator hold the same role at different scopes, and the
UI/UX doc treats that distinction as the difference between two dashboards.

```
RoleAssignment
├── id (unique identifier)
├── userId (references User)
├── role (enum: teacher, building_administrator, district_administrator,
│         school_board_member, guardian, student, community_member)
├── scopeType (enum: section, school, district, student, public)
├── scopeIds (array of IDs matching scopeType — the boundary of what this
│             assignment can see)
├── permissions (array of capability strings)
│   ├── view_aggregate_mastery
│   ├── view_individual_students
│   ├── view_student_names
│   ├── view_attendance_detail
│   ├── view_behavior_detail
│   ├── view_health_detail
│   ├── view_special_services_detail
│   ├── view_evidence_artifacts
│   ├── record_mastery
│   ├── log_interruptions
│   └── add_intervention_notes
├── effectiveDate
├── expirationDate (if applicable)
└── metadata (created date, granted by, last updated)
```

**Reference role definitions**, matching the permission model in `lms-vision-document.md`:

| Role | Scope | Sees |
|---|---|---|
| Teacher | Their sections | Full detail for their own students; aggregates only for other classes |
| Building administrator | Their school | All sections and students in the building, named |
| District administrator | The district | All buildings, all students, named |
| School board member | The district | Aggregates only — no individual identifiers; buildings may be named |
| Guardian | Their linked students | One child's full record, where educational rights apply |
| Student | Themselves | Own mastery map, attendance, and goal progress, age-appropriate |
| Community member | Public | School-level aggregates only |

**Amended in Phase 3.** Two rows above were rewritten against what building them revealed.

The board member's row read "aggregates only — no school or student identifiers", and Phase 2
implemented it literally: the board saw district totals while an anonymous visitor saw three
named schools and a grade-level breakdown. That put an elected body governing the district
behind a member of the public, which no reading of the vision document supports. The rule the
row was reaching for is **aggregates, not individuals** — the board's limit is the student, not
the building. Both audiences now read the same figures; the board additionally reads the
disclosure rules those figures were produced under.

The student's row gained attendance. `view_attendance_detail` at student scope is the right to
read one's own attendance record, which the guardian on the row above already held. A mastery
map without the attendance beside it withholds the most common explanation of its shape from
the one person it is about.

**Integrity rule — health and special services are separately gated.** `view_health_detail` and
`view_special_services_detail` are not implied by `view_individual_students`. A teacher sees
that a student has accommodations without necessarily seeing counselor notes or a mental health
flag. The original data structures doc already carries a `confidentialityLevel` on those
records; this is the permission side of the same boundary.

**Integrity rule — permission boundaries are invisible, not blocked.** Per the UI/UX doc, users
never see "access denied." The UI renders only what the scope contains, so out-of-scope items
have no affordance to click. Enforcement is a filtering operation, not a gate.

*Clarified in Phase 3, which had to implement it.* The rule holds for everything reachable by
clicking, and that remains true: no view offers a link out of the viewer's scope. What the rule
did not cover is a **typed address**, and something has to happen there. Silence is not the
answer — a redirect with nothing said is indistinguishable from a broken link, and the same
document's insistence that absent is not the same as zero argues against pretending nothing
occurred. So a refused address returns the viewer to their own dashboard with one neutral line,
and nothing about what was on the other side: not the record, not whether the id exists, not
what the account would have needed. An unknown id and an out-of-scope one are refused
identically and deliberately, so the boundary cannot be used to enumerate the district.

**Integrity rule — a role is a permission set and a scope is a set of ids, and both must
agree.** Neither is sufficient alone, and the district issues counterexamples to each. A school
board member holds `district` scope, so every id in the district is inside their scope, and
holds only `view_aggregate_mastery` — no page naming a student or a teacher is open to them. A
nurse is the mirror: named students, attendance, and health at their building, and no aggregate
mastery, so the building's rollups are not theirs to read. An authorization check written as a
role comparison gets both of these wrong.

---

## Research Context Entities

### ResearchCitation

Every dashboard in the UI/UX doc pairs data with research-backed context. Storing citations as
records — rather than hardcoding sentences into components — means the same claim renders
identically at every zoom level, and the sourcing is auditable.

```
ResearchCitation
├── id (unique identifier)
├── claim (the plain-language statement shown to users)
├── topic (enum: attendance, behavior, engagement, mastery_progression,
│          family_involvement, interruptions, special_services,
│          prior_achievement)
├── source
│   ├── authorOrOrganization
│   ├── title
│   ├── publicationYear
│   ├── url
│   └── sourceType (enum: peer_reviewed, government_report,
│                    research_organization, meta_analysis, other)
├── applicableRoles (array of roles this context is surfaced to)
├── triggerConditions (when the system should surface this citation)
│   ├── metric (e.g., "attendanceRate")
│   ├── comparator (enum: below, above, equals, between)
│   └── threshold
├── confidenceNote (any caveat about strength or generalizability)
└── metadata (added date, last reviewed date, review status)
```

**On `confidenceNote` and `reviewStatus`:** the vision documents commit to being
"research-grounded" and "accountable, not punitive." A citation library that overstates
correlational findings as causal would undercut both. Every generated citation carries a review
status, and none should reach a stakeholder-facing view until a human has verified the source
says what the claim says.

---

## Summary of Integrity Rules Added

Extending the numbered list in `supernova-data-structures.md`:

9. Every Student belongs to at least one Section per school year; in departmentalized schools,
   exactly one Section per subject.
10. Every dated record falls on or within a date range covered by the relevant SchoolCalendar.
11. Evidence artifacts must be dated on instructional days.
12. A Guardian may view a Student's record only where `hasEducationalRights` is true on that link.
13. Every CurriculumUnit's `standardIds` must reference standards matching the section's subject
    and grade level.
14. Health and special services detail require their own explicit permissions; they are not
    implied by access to individual student data.
15. Attendance events must exist for every instructional day a student was enrolled — a missing
    day is a data quality flag, not an implicit "present."
16. Interruptions logged against a section must fall within that section's school year and on
    instructional days.
