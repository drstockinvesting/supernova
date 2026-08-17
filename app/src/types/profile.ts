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
