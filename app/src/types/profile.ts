/**
 * The shapes the generator's *file layout* produces, as opposed to the record
 * types in `supernova.ts`.
 *
 * `schema/supernova.schema.json` defines individual records — a MasteryRecord, an
 * AttendanceRecord. It does not describe the envelope `generator/emit.py` wraps
 * them in: one file per student, keyed by school year, with evidence split into a
 * companion file. These types describe that envelope.
 *
 * Optionality here is deliberate and mirrors the generator: records omit fields at
 * their default rather than writing nulls, so a missing `metadata` means "no
 * quality flags", not "unknown".
 */

import type {
  AttendanceRecord,
  BehaviorRecord,
  Evidence,
  HealthRecord,
  MasteryRecord,
  Metadata,
  ParticipationRecord,
  Student,
  Subject,
} from './supernova'

export interface SubjectMastery {
  mastered: number
  total: number
  masteryRate: number
}

/**
 * Note `standardsTaughtToDate` versus `standardsTrackedFullYear`. Mastery rate is
 * computed over what has actually been taught by the as-of date; counting untaught
 * fourth-quarter content against a student makes every mid-year rate meaninglessly
 * low. `standardsNotYetTaught` is reported separately so the mastery map can render
 * untaught content as genuinely dark rather than as failure.
 */
export interface YearSummary {
  masteryRate: number
  standardsMastered: number
  standardsTaughtToDate: number
  standardsTrackedFullYear: number
  standardsNotYetTaught: number
  standardsInProgress: number
  standardsWithNoEvidence: number
  masteryBySubject: Record<string, SubjectMastery>
  evidenceStrengthCounts: Partial<Record<EvidenceStrength, number>>
  attendanceRate: number | null
  chronicAbsenteeismFlag: boolean
  totalBehaviorIncidents: number
  disciplineReferralCount: number
  homeworkCompletionRate: number | null
}

export type EvidenceStrength = 'none' | 'insubstantial' | 'moderate' | 'substantial'

export interface BenchmarkResult {
  date: string
  assessmentName: string
  subject: string
  score: number
  performanceLevel: 'above_grade_level' | 'at_grade_level' | 'below_grade_level'
  notes: string | null
}

export interface ScreenerResult {
  date: string
  screenerName: string
  score: number
  riskLevel: 'low' | 'moderate' | 'high'
  recommendedIntervention: string | null
}

export interface PriorAchievement {
  id: string
  studentId: string
  schoolYear: string
  priorMasteryRecordIds: string[]
  benchmarkResults: BenchmarkResult[]
  screenerResults: ScreenerResult[]
  gradeHistory: unknown[]
  metadata?: Metadata & { historicalDataQualityNotes?: string[] }
}

export interface FamilyContactEvent {
  date: string
  contactType: string
  initiator: string
  topic: string
  outcome: string
  notes: string
}

export interface FamilyEngagementRecord {
  id: string
  studentId: string
  schoolYear: string
  contactEvents: FamilyContactEvent[]
  metrics: {
    conferenceAttendance: number
    outreachAttempts: number
    responseRate: number
    engagementLevel: string
  }
  metadata?: Metadata
}

export interface ProfileYear {
  schoolYear: string
  gradeLevel: string
  sectionIds: string[]
  summary: YearSummary
  mastery: MasteryRecord[]
  /** Always empty in the profile file; the artifacts live in the evidence companion. */
  evidence: Evidence[]
  evidenceCount: number
  attendance: AttendanceRecord
  behavior: BehaviorRecord
  health: HealthRecord
  participation: ParticipationRecord[]
  familyEngagement: FamilyEngagementRecord
  priorAchievement: PriorAchievement
  specialServices: SpecialServicesRecord | null
}

export interface SpecialServicesRecord {
  id?: string
  studentId?: string
  schoolYear?: string
  iepStatus?: Record<string, unknown>
  services?: unknown[]
  metadata?: Metadata
  [key: string]: unknown
}

/**
 * Present in the generated data and useful for building against, but it is the
 * *generator's* seed — the three axes a student was drawn from. Nothing a real
 * system would know, so no stakeholder view should ever surface it.
 */
export interface GeneratorArchetype {
  tier: string
  tierLabel: string
  trajectory: string
  trajectoryLabel: string
  situation: string
  situationLabel: string
  description: string
  focusSubject: string | null
  targetMasteryRate: number
  targetAttendanceRate: number
  targetHomeworkCompletion: number
  targetEngagement: number
}

export interface StudentProfile {
  studentId: string
  student: Student
  schoolYears: string[]
  years: Record<string, ProfileYear>
  evidenceFile: string
  generatorArchetype: GeneratorArchetype
}

export interface EvidenceFile {
  studentId: string
  evidenceByYear: Record<string, Evidence[]>
}

// --- Aggregates -------------------------------------------------------------

export interface AggregateCell {
  label: string
  studentCount: number
  standardsTaughtToDate: number
  standardsMastered: number
  masteryRate: number
  evidenceStrengthCounts: Partial<Record<EvidenceStrength, number>>
  attendanceRate: number | null
  chronicallyAbsentStudents: number
  chronicAbsenteeismRate: number
  totalBehaviorIncidents: number
  disciplineReferrals: number
  homeworkCompletionRate: number | null
  masteryBySubject: Record<string, { standardsTaughtToDate: number; standardsMastered: number; masteryRate: number }>
  suppressForPublicDisplay: boolean
}

export interface SectionAggregate {
  sectionId: string
  sectionName: string
  schoolId: string
  gradeLevel: string
  subject: Subject
  teacherId: string
  studentCount: number
  standardsTaughtToDate: number
  standardsMastered: number
  masteryRate: number
  suppressForPublicDisplay: boolean
}

export interface Aggregates {
  schoolYear: string
  district: AggregateCell & { districtId: string }
  schools: (AggregateCell & { schoolId: string; gradesCovered: string[] })[]
  grades: (AggregateCell & { schoolId: string; gradeLevel: string })[]
  sections: SectionAggregate[]
  publicSuppressionThreshold: number
}

// --- Section context --------------------------------------------------------
//
// `Aggregates.sections` gives a section its mastery rate, which is all the
// district rollup needs. These are the layers that explain it, and they split
// the way profiles do: an index every classroom-grid view loads eagerly, and
// one roster file per section fetched when that classroom is opened.

export interface UnitPacing {
  percentContentCovered: number
  percentTimeElapsed: number
  pacingStatus: 'ahead' | 'on_track' | 'slightly_behind' | 'behind'
}

export interface UnitInterruptions {
  count: number
  unplanned: number
  minutesLost: number
}

/** The shape carried in the index: what a classroom card needs, and no more. */
export interface SectionUnitSummary {
  unitId: string
  name: string
  subject: Subject
  sequence: number
  startDate: string
  endDate: string
  status: 'not_started' | 'in_progress' | 'completed'
  pacing: UnitPacing
  standardsTaughtToDate: number
  standardsMastered: number
  masteryRate: number
  interruptions: UnitInterruptions
}

export interface KeyInstructionDate {
  date: string
  description: string
  standardIds: string[]
}

/** The full unit, carried in the roster file the drill-down loads. */
export interface SectionUnit extends SectionUnitSummary {
  markingPeriodId: string
  plannedInstructionalDays: number
  standardIds: string[]
  keyInstructionDates: KeyInstructionDate[]
}

export interface RosterIncident {
  date: string
  incidentType: string
  severity: string | null
  subject: string | null
  description: string
  /**
   * Behaviour is recorded per student per year, not per period. A self-contained
   * section is the student's whole day so every incident belongs to it; a
   * departmentalized section can only claim incidents naming its own subject.
   */
  attributedToSection: boolean
}

export interface SectionRosterRow {
  studentId: string
  firstName: string
  lastName: string
  standardsTaughtToDate: number
  standardsMastered: number
  masteryRate: number
  masteryByUnit: Record<string, { taught: number; mastered: number }>
  /** A roster place with no participation record is absent, not zero. */
  hasParticipationRecord: boolean
  homeworkCompletionRate: number | null
  completionRateByMarkingPeriod: { markingPeriod: number; completionRate: number }[]
  attendanceRate: number | null
  daysAbsent: number
  chronicAbsenteeismFlag: boolean
  /** Exceptions only; present days are recovered from the school calendar. */
  attendanceExceptions: { date: string; status: string }[]
  behaviorIncidents: RosterIncident[]
  disciplineReferralCount: number
}

export interface SectionContext {
  sectionId: string
  sectionName: string
  schoolId: string
  schoolYear: string
  gradeLevel: string
  subject: Subject | 'all'
  instructionalModel: 'self_contained' | 'departmentalized'
  teacherId: string
  coTeacherIds: string[]
  period: string | null
  roomNumber: string
  studentCount: number
  standardsTaughtToDate: number
  standardsMastered: number
  masteryRate: number
  evidenceStrengthCounts: Partial<Record<EvidenceStrength, number>>
  masteryBySubject: Record<
    string,
    { standardsTaughtToDate: number; standardsMastered: number; masteryRate: number }
  >
  /** Whole-day attendance for the roster — the SIS holds no period-level record. */
  attendanceRate: number | null
  chronicallyAbsentStudents: number
  chronicAbsenteeismRate: number
  homeworkCompletionRate: number | null
  studentsWithoutParticipationRecord: number
  attributedBehaviorIncidents: number
  unattributedBehaviorIncidents: number
  disciplineReferrals: number
  interruptions: {
    totalInterruptions: number
    unplannedInterruptions: number
    totalMinutesLost: number
    averageInterruptionsPerUnit: number
  }
  /** One unit for a departmentalized section; six for self-contained elementary. */
  activeUnits: SectionUnitSummary[]
  unitCount: number
  suppressForPublicDisplay: boolean
}

export interface SectionsContext {
  schoolYear: string
  sections: SectionContext[]
  rosterFilePattern: string
}

export interface SectionDetail {
  sectionId: string
  schoolYear: string
  units: SectionUnit[]
  roster: SectionRosterRow[]
}

// --- Caseload ---------------------------------------------------------------

/**
 * One student on a building's caseload index.
 *
 * The index exists because the accounts that read it — a nurse, a counselor, a
 * special education teacher — are scoped to a building and hold named students,
 * and no other file answers "the students here, with the stream I am responsible
 * for on them". `sections-context` is indexed by section, so a secondary student
 * appears in six rosters; health and special services are not in a roster at all.
 *
 * Every stream is present on every row. Which of them a viewer may read is
 * decided in `views/caseload/caseload.ts` against their permissions, not here.
 */
export interface CaseloadRow {
  studentId: string
  firstName: string
  lastName: string
  gradeLevel: string
  sectionCount: number
  mastery: {
    masteryRate: number
    standardsTaughtToDate: number
    standardsMastered: number
    standardsWithNoEvidence: number
    homeworkCompletionRate: number | null
  }
  attendance: {
    attendanceRate: number | null
    daysAbsent: number
    daysEnrolled: number
    daysExcusedAbsent: number
    tardyCount: number
    chronicAbsenteeismFlag: boolean
  }
  behavior: {
    disciplineReferralCount: number
    suspensionCount: number
    suspensionDays: number
    totalIncidents: number
    positiveRecognitionCount: number
    lastIncidentDate: string | null
  }
  /**
   * Counts and flags, never the events. The events are the confidential part and
   * are also the bulk of the record; they stay in the profile, one click away,
   * where the permission is checked again.
   */
  health: {
    flags: {
      chronicHealthCondition: boolean
      foodInsecurityRisk: boolean
      housingInstability: boolean
      mentalHealthConcern: boolean
      otherWellnessFactors: string[]
    }
    eventCounts: Partial<Record<HealthEventType, number>>
    totalEvents: number
    lastEventDate: string | null
  }
  services: {
    status: string | null
    startDate: string | null
    serviceTypes: string[]
    eligibilityCategories: string[]
    serviceCount: number
  } | null
  engagement: {
    responseRate: number | null
    outreachAttempts: number
    conferenceAttendance: number
    engagementLevel: string
  }
}

export type HealthEventType =
  | 'nurse_visit'
  | 'counselor_referral'
  | 'mental_health_flag'
  | 'chronic_condition'
  | 'medication_flag'
  | 'immunization_status'

export interface CaseloadIndex {
  schoolId: string
  schoolYear: string
  label: string
  /** Already sorted by name in the generator, so the default list needs no sort. */
  students: CaseloadRow[]
}

export interface Manifest {
  datasetVersion: string
  generator: string
  masterSeed: string
  deterministic: boolean
  schoolYears: string[]
  currentSchoolYear: string
  fullEvidenceYears: string[]
  counts: Record<string, number>
  syntheticDataNotice: string
}

export interface School {
  id: string
  name: string
  districtId: string
  gradesCovered: string[]
  instructionalModel: 'self_contained' | 'departmentalized'
  principalName: string
  address: string
  students: string[]
  metadata?: Metadata
}

export interface MarkingPeriod {
  id: string
  name: string
  sequence: number
  startDate: string
  endDate: string
  instructionalDayCount: number
  schoolCalendarId: string
  schoolYear: string
}

export interface SchoolCalendar {
  id: string
  schoolId: string
  schoolYear: string
  firstInstructionalDay: string
  lastInstructionalDay: string
  totalInstructionalDays: number
  instructionalDays: string[]
  nonInstructionalDays: { date: string; description: string; reason: string }[]
  markingPeriods: MarkingPeriod[]
  metadata?: Metadata
}
