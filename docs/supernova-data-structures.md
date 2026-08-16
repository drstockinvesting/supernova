# Supernova LMS: Data Structures

## Overview

This document defines the data structures for the Supernova Learning Management System. The system is organized around a **student-centric** foundation, with seven integrated data streams that inform mastery tracking and evidence accumulation.

### Data Streams
1. Academic (mastery and evidence)
2. Attendance
3. Behavior
4. Health and Wellness
5. Family Engagement and Communication
6. Special Services and Support
7. Prior Achievement and Readiness

---

## Core Student Record

```
Student
├── id (unique identifier)
├── firstName
├── lastName
├── dateOfBirth
├── studentId (school-assigned ID)
├── currentGradeLevel (K-12)
├── enrollmentStatus (active, inactive, transferred)
├── enrollmentDate
├── schoolId (references the school they attend)
├── districtId (references their district)
└── metadata (created date, last updated, data quality flags)
```

---

## Academic Data Stream: Mastery and Evidence

### Standards Framework

All mastery claims tie to nationally recognized standards. The system supports multiple standards simultaneously.

```
Standard
├── id (unique identifier)
├── framework (e.g., "Common Core", "National Science Standards", "National Coalition for Core Arts Standards", "NASPE")
├── subject (Math, ELA, Science, Social Studies, Arts, Physical Education, etc.)
├── gradeLevel (K-12, or "K-2", "3-5", etc. depending on framework)
├── standardCode (e.g., "CCSS.MATH.3.OA.A.1")
├── standardText (full text of the standard)
├── domainOrCluster (organizational grouping within subject)
└── metadata (framework version, adoption year)
```

### Mastery Map (Student + Standard Relationship)

```
MasteryRecord
├── id (unique identifier)
├── studentId (references Student)
├── standardId (references Standard)
├── schoolYear (e.g., 2024-2025)
├── gradeLevel (grade level in which mastery was/is being demonstrated)
├── status (enum: "mastered", "not_mastered", "in_progress")
│   └── Note: Binary approach preferred ("mastered" or "not_mastered"), 
│       but "in_progress" included as optional intermediate state
├── evidenceStrength (enum: "insubstantial", "moderate", "substantial")
│   └── Determined by accumulation of evidence artifacts over time
├── evidenceCount (integer: number of evidence artifacts supporting this mastery)
├── firstEvidenceDate (when first artifact was recorded)
├── mostRecentEvidenceDate (when most recent artifact was recorded)
├── evidence (array of Evidence records - see below)
└── metadata (created date, last updated, data quality flags)
```

**Important Note on Mastery Permanence:** Once a student has demonstrated mastery of a standard, that mastery is considered permanent unless extraordinary circumstances intervene (significant developmental disruption, major trauma, etc.). Evidence does not decay over time. If a student needs to re-demonstrate a standard, that creates a new evidence trail and can potentially show faster or more refined performance than the original learning.

### Evidence Artifacts

Each piece of evidence is a concrete artifact or observable outcome tied to an academic data source. Evidence accumulates to determine mastery strength.

```
Evidence
├── id (unique identifier)
├── masteryRecordId (references the MasteryRecord this supports)
├── dataSourceType (enum: assessment, assignment, observation, studentArtifact, quiz, performanceTask, project, discussion, other)
├── dataSourceId (reference to the original data source system)
├── dataSourceName (e.g., "Google Classroom", "District Assessment Platform", "Teacher Observation Log")
├── title (name or description of the artifact)
├── description (longer context about what the artifact demonstrates)
├── evidenceDate (when the artifact was created/completed)
├── studentArtifactLink (URL or reference to the actual student work)
├── metadata (retrieved date, data quality flags, source authenticity)
└── analysis
    ├── demonstratesStandard (boolean: does this directly show mastery of the standard?)
    ├── contextNotes (teacher or system annotation)
    └── artifact (the actual student work, submission, or observable evidence)
```

**Data Integration via API:** Evidence is pulled automatically from connected platforms (grade books, LMS systems, assessment platforms). The system tracks which evidence came from which data source to maintain transparency and traceability.

---

## Attendance Data Stream

```
AttendanceRecord
├── id (unique identifier)
├── studentId (references Student)
├── schoolYear (e.g., 2024-2025)
├── attendanceEvents (array of daily attendance events)
│   ├── date
│   ├── status (enum: "present", "absent", "excused_absent", "tardy", "excused_tardy", "partial_day")
│   └── notes (reason if available)
├── metrics (aggregated for the period)
│   ├── daysPresent
│   ├── daysAbsent
│   ├── daysExcusedAbsent
│   ├── tardyCount
│   ├── attendanceRate (percentage present)
│   └── chronicAbsenteeismFlag (boolean: is attendance below 90%?)
└── metadata (data source system, last sync date)
```

---

## Behavior Data Stream

```
BehaviorRecord
├── id (unique identifier)
├── studentId (references Student)
├── schoolYear (e.g., 2024-2025)
├── incidents (array of behavior incidents)
│   ├── id
│   ├── date
│   ├── incidentType (enum: discipline_referral, office_visit, detention, suspension, expulsion, positive_recognition, etc.)
│   ├── severity (if applicable: low, medium, high)
│   ├── description
│   ├── staff (staff member who recorded the incident)
│   ├── location (where it occurred)
│   └── outcome (consequence, resolution, follow-up)
├── metrics (aggregated for the period)
│   ├── totalIncidents
│   ├── disciplineReferralCount
│   ├── suspensionCount
│   ├── suspensionDays
│   └── positiveRecognitionCount
└── metadata (data source system, last sync date)
```

---

## Health and Wellness Data Stream

```
HealthRecord
├── id (unique identifier)
├── studentId (references Student)
├── schoolYear (e.g., 2024-2025)
├── healthEvents (array of health-related events or flags)
│   ├── date
│   ├── eventType (enum: nurse_visit, counselor_referral, mental_health_flag, chronic_condition, medication_flag, immunization_status, etc.)
│   ├── description
│   ├── staff (person recording the event)
│   └── outcome (action taken, follow-up needed)
├── flags
│   ├── chronicHealthCondition (boolean)
│   ├── mentalHealthConcern (boolean)
│   ├── foodInsecurityRisk (boolean)
│   ├── housingInstability (boolean)
│   └── otherWellnessFactors (array of notes)
└── metadata (data source system, confidentiality level, last sync date)
```

---

## Family Engagement and Communication Data Stream

```
FamilyEngagementRecord
├── id (unique identifier)
├── studentId (references Student)
├── schoolYear (e.g., 2024-2025)
├── contactEvents (array of family contact/communication)
│   ├── date
│   ├── contactType (enum: parent_conference, phone_call, email, meeting, event_attendance, etc.)
│   ├── initiator (school staff or parent)
│   ├── topic (brief description)
│   ├── notes
│   └── outcome
├── metrics (aggregated for the period)
│   ├── conferenceAttendance (count)
│   ├── outreachAttempts (count)
│   ├── responseRate (percentage of school outreach responded to)
│   └── engagementLevel (enum: highly_engaged, moderately_engaged, minimally_engaged)
└── metadata (data source system, last sync date)
```

---

## Special Services and Support Data Stream

```
SpecialServicesRecord
├── id (unique identifier)
├── studentId (references Student)
├── startDate
├── status (enum: active, inactive, historical)
├── services (array of active/historical services)
│   ├── serviceType (enum: IEP, 504_plan, ELL, gifted_identification, intervention_program, counseling, speech_services, special_education, etc.)
│   ├── startDate
│   ├── endDate (if applicable)
│   ├── description
│   ├── responsibleStaff
│   └── notes
├── iepStatus (if applicable)
│   ├── iepId
│   ├── goals (array of IEP goals)
│   │   ├── goalId
│   │   ├── description
│   │   ├── targetDate
│   │   ├── progressTowardGoal (enum: on_track, needs_support, exceeded)
│   │   └── evidence (mastery evidence supporting IEP goal progress)
│   ├── accommodations (array of accommodations)
│   └── reviewDates
├── eligibilityCategories (array of categories if receiving special education)
└── metadata (data source system, last sync date)
```

---

## Prior Achievement and Readiness Data Stream

```
PriorAchievementRecord
├── id (unique identifier)
├── studentId (references Student)
├── schoolYear (e.g., 2023-2024 for prior year)
├── priorMasteryRecords (array of mastery records from previous years)
│   ├── references to MasteryRecords from previous school years
│   └── allows longitudinal tracking of skill development
├── benchmarkResults (array of benchmark assessments)
│   ├── date
│   ├── assessmentName
│   ├── subject
│   ├── score
│   ├── performanceLevel (enum: below_grade_level, at_grade_level, above_grade_level)
│   └── notes
├── screenerResults (array of readiness or diagnostic screeners)
│   ├── date
│   ├── screenerName
│   ├── score
│   ├── riskLevel (if applicable)
│   └── recommendedIntervention
├── gradeHistory (if available from prior systems)
│   ├── schoolYear
│   ├── subject
│   └── grade
└── metadata (data source system, historical data quality notes)
```

---

## Longitudinal Data Structure

The system supports tracking a student across multiple school years and grade levels. Each student can have multiple years of data.

```
StudentLongitudinalProfile
├── studentId (references Student)
├── schoolYears (array of all years the student has data for)
│   ├── 2020-2021 (Kindergarten)
│   ├── 2021-2022 (1st Grade)
│   ├── 2022-2023 (2nd Grade)
│   └── ... up to current year
├── mastery (array of all MasteryRecords across all years)
├── attendance (array of all AttendanceRecords across all years)
├── behavior (array of all BehaviorRecords across all years)
├── health (array of all HealthRecords across all years)
├── engagement (array of all FamilyEngagementRecords across all years)
├── services (array of all SpecialServicesRecords across all years)
└── priorAchievement (array of all PriorAchievementRecords across all years)
```

This structure allows the system to show:
- How a student's mastery in a subject builds over time
- Attendance and behavior trends across years
- Long-term impact of health or wellness factors
- Growth trajectory and readiness for next-level skills
- Cumulative support needs and interventions

---

## District and School Context

```
School
├── id (unique identifier)
├── name
├── districtId (references District)
├── gradesCovered (array: K, 1, 2, ..., 12)
├── address
├── principalName
├── metadata
└── students (array of Student IDs enrolled)

District
├── id (unique identifier)
├── name (e.g., "Constellation Area School District")
├── state
├── superintendent
├── schools (array of School IDs in the district)
├── metadata
└── configuration
    ├── standardsFrameworksInUse (array of Standard frameworks adopted)
    └── dataSourcesConnected (array of integrated platforms)
```

---

## Key Relationships and Integrity Rules

1. **Every MasteryRecord must reference a valid Student and Standard**
2. **Every Evidence artifact must reference a valid MasteryRecord**
3. **Evidence accumulation automatically determines evidenceStrength**
   - Insubstantial: 1-2 evidence artifacts
   - Moderate: 3-5 evidence artifacts
   - Substantial: 6+ evidence artifacts (or as configured)
4. **Mastery status can shift based on evidence**, but once "mastered" is achieved, it persists
5. **All timestamps should support longitudinal queries** (school year, date ranges)
6. **Special Services records should link to related MasteryRecords** where IEP goals align with standards
7. **Attendance and behavior data should be queryable alongside mastery** to show correlations
8. **Prior achievement data provides baseline context** for interpreting current mastery growth

---

## Data Quality and Metadata

Every record should include:
- **createdDate** (when the record was created)
- **lastUpdatedDate** (when it was last modified)
- **dataSource** (which system or process created/updated it)
- **isApproximate** (boolean: is this data approximate or exact?)
- **qualityFlags** (array of any known data quality issues)
- **confidentialityLevel** (for sensitive data like health or special services)

---

## Notes for Implementation

- This structure is designed to support **automatic data integration via API**. Whenever possible, data flows from source systems without requiring manual teacher entry.
- **Teacher input is minimized** to mastery marking (indicating when evidence has accumulated to "mastered" status) and occasional observation notes tied to evidence.
- The **student-centric approach** allows data to be aggregated and sliced for other views (teacher dashboards, admin reports, school board summaries) while maintaining a single source of truth.
- **Longitudinal support** is built in from the ground up, allowing analysis of growth patterns across K-12 careers.
