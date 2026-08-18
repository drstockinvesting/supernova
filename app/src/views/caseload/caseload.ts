/**
 * What a caseload is, as a pure decision.
 *
 * Phase 3 named the gap and phases 4 and 5 only made it more visible: a nurse, a
 * counselor, and a special education teacher hold permissions describing a job
 * the app had no view for. The sentence the gap was recorded in is the whole
 * specification — *the students at my building, filtered to the stream I am
 * responsible for* — and this module is the second half of it. `access.ts`
 * decides whether the building is theirs; this decides what "the stream I am
 * responsible for" means once they are in.
 *
 * ## A stream is a permission
 *
 * Not a role. There is no role check in this file for the same reason there is
 * none in `access.ts`: the district issues four different accounts over these
 * four streams and no two of them are the same set.
 *
 *   nurse                       attendance, health
 *   counselor                   attendance, behaviour, health, special services
 *   special education teacher   attendance, behaviour, special services
 *   building administrator      all four
 *
 * A nurse holds no `view_behavior_detail`, so a student with three referrals and
 * nothing else is not on their caseload — not shown greyed, not shown as a
 * withheld count, absent. This is the one property worth testing hardest, and
 * `caseload.test.ts` does, because its failure is invisible: a caseload that
 * leaks a stream renders exactly like one that does not.
 *
 * Family engagement is deliberately not a stream. It is real data on the row and
 * every one of these accounts can read it on a profile, but the district issues
 * no permission that gates it, and a stream that is not a permission would break
 * the rule the other four follow. It shows on a student's card as context and
 * never puts them on a list.
 *
 * ## The thresholds are editorial judgements
 *
 * Every number in `THRESHOLDS` was chosen by reading this district's own figures
 * and picking one that produced a caseload of plausible size. That is the same
 * admission `/research` makes about its trigger thresholds and it is worth making
 * in the same words: chronic absenteeism is a federal definition and arrives on
 * the row already computed, and the other six are not. They are named here, in
 * one place, and the view prints them — a caseload assembled by a rule nobody can
 * read is a caseload nobody can argue with.
 *
 * ## Priority is a claim about attention, not about children
 *
 * A concern carries a level, and the page opens on the priority list because a
 * counselor with 230 students on a full caseload has been handed a directory
 * rather than a caseload. The levels rank *what is on record*, so a student is
 * priority for having an open IEP or a suspension, and the full list is one click
 * away and says how many it holds. Nothing here scores a child, and nothing is
 * ordered by mastery.
 */

import type { CaseloadRow } from '../../types/profile'
import type { Permission } from '../../session/roles'
// Explicit extension: this module is imported by a test, and `node --test`
// resolves ESM specifiers literally rather than the way a bundler does.
import { byGradeOrder } from '../../lib/dataset.ts'

export type StreamKey = 'attendance' | 'behavior' | 'health' | 'services'

/** A subset of the app's `Tone`, so a chip can be handed one directly. */
export type ConcernTone = 'critical' | 'concern' | 'caution'

export type ConcernLevel = 'priority' | 'watch'

export interface Stream {
  key: StreamKey
  label: string
  permission: Permission
  /** What holding this stream means, for the page to print. */
  meaning: string
  /**
   * What puts a student on the *priority* list through this stream.
   *
   * Here rather than in the view's prose because the sentence naming the
   * priority rule has to be assembled from the streams the viewer actually
   * holds. Written as one fixed sentence it told a special education teacher
   * that a wellness condition would raise a student's priority, which is a
   * stream that account cannot read and a rule that never fires for them.
   */
  priorityMeaning: string
}

/**
 * Ordered as a school day is read rather than alphabetically: whether a child is
 * here, then how they are, then what is in place for them.
 */
export const STREAMS: Stream[] = [
  {
    key: 'attendance',
    label: 'Attendance',
    permission: 'view_attendance_detail',
    meaning: 'days missed, days excused, and lateness',
    priorityMeaning: 'a chronic-absence flag',
  },
  {
    key: 'health',
    label: 'Health',
    permission: 'view_health_detail',
    meaning: 'wellness flags, medication, and health-office contact',
    priorityMeaning: 'a wellness condition on file',
  },
  {
    key: 'behavior',
    label: 'Behaviour',
    permission: 'view_behavior_detail',
    meaning: 'referrals, suspensions, and recognition',
    priorityMeaning: 'a suspension or repeated referrals',
  },
  {
    key: 'services',
    label: 'Special services',
    permission: 'view_special_services_detail',
    meaning: 'IEPs, 504 plans, and the services on them',
    priorityMeaning: 'a formal plan',
  },
]

/**
 * The streams an account may read, in `STREAMS` order.
 *
 * Takes the permission predicate rather than the session so the decision can be
 * tested against a permission set directly, without a user record around it.
 */
export function streamsFor(can: (permission: Permission) => boolean): Stream[] {
  return STREAMS.filter((stream) => can(stream.permission))
}

/**
 * Every threshold, in one place, so the page can print the rule it applied.
 *
 * `chronicAbsence` is absent from this table on purpose: that flag is computed in
 * the generator against the standard definition of missing a tenth of enrolled
 * days, and re-deriving it here from an attendance rate would produce a second,
 * slightly different rule for the same idea.
 */
export const THRESHOLDS = {
  /** Below this, and not already flagged chronic. */
  attendanceWatch: 93,
  tardyWatch: 8,
  referralPriority: 3,
  referralWatch: 2,
  nurseVisitWatch: 5,
  /** Service types that put a student on the priority list rather than the full one. */
  formalPlanServices: ['IEP', '504_plan'],
} as const

export interface Concern {
  stream: StreamKey
  level: ConcernLevel
  tone: ConcernTone
  /** The chip's text. Always names the figure, never only the category. */
  label: string
}

/**
 * What is on record for this student, in the streams this viewer holds.
 *
 * The `allowed` filter is applied per stream at the top of each block rather than
 * to the assembled list, so a stream the viewer lacks is never computed and
 * cannot be leaked by a later change to the sort, the count, or the summary. The
 * row still carries every stream — the file is one file for every reader — and
 * this function is the boundary that decides which of them exist for this one.
 */
export function concernsOf(row: CaseloadRow, allowed: readonly StreamKey[]): Concern[] {
  const holds = (stream: StreamKey) => allowed.includes(stream)
  const concerns: Concern[] = []

  if (holds('attendance')) {
    const { attendance } = row
    if (attendance.chronicAbsenteeismFlag) {
      concerns.push({
        stream: 'attendance',
        level: 'priority',
        tone: 'critical',
        label: `Chronic absence — ${attendance.daysAbsent} of ${attendance.daysEnrolled} days missed`,
      })
    } else if (
      attendance.attendanceRate !== null &&
      attendance.attendanceRate < THRESHOLDS.attendanceWatch
    ) {
      concerns.push({
        stream: 'attendance',
        level: 'watch',
        tone: 'concern',
        label: `Attendance ${attendance.attendanceRate.toFixed(1)}% — ${attendance.daysAbsent} days missed`,
      })
    }
    if (attendance.tardyCount >= THRESHOLDS.tardyWatch) {
      concerns.push({
        stream: 'attendance',
        level: 'watch',
        tone: 'caution',
        label: `${attendance.tardyCount} late arrivals`,
      })
    }
  }

  if (holds('health')) {
    const { flags, eventCounts } = row.health
    // A flag and an event are different kinds of record and both are shown. A
    // flag is a standing condition somebody entered; an event is a thing that
    // happened. Collapsing them would lose which one the school actually knows.
    if (flags.chronicHealthCondition) {
      concerns.push({
        stream: 'health',
        level: 'priority',
        tone: 'critical',
        label: 'Chronic health condition on file',
      })
    }
    if (flags.mentalHealthConcern) {
      concerns.push({
        stream: 'health',
        level: 'priority',
        tone: 'critical',
        label: 'Mental health concern on file',
      })
    }
    if (flags.housingInstability) {
      concerns.push({
        stream: 'health',
        level: 'priority',
        tone: 'critical',
        label: 'Housing instability on file',
      })
    }
    if (flags.foodInsecurityRisk) {
      concerns.push({
        stream: 'health',
        level: 'watch',
        tone: 'concern',
        label: 'Food insecurity risk on file',
      })
    }
    for (const factor of flags.otherWellnessFactors) {
      concerns.push({ stream: 'health', level: 'watch', tone: 'concern', label: factor })
    }

    const mentalHealthEvents = eventCounts.mental_health_flag ?? 0
    if (mentalHealthEvents > 0) {
      concerns.push({
        stream: 'health',
        level: 'priority',
        tone: 'critical',
        label: `${mentalHealthEvents} mental health referral${mentalHealthEvents === 1 ? '' : 's'}`,
      })
    }
    const medication = eventCounts.medication_flag ?? 0
    if (medication > 0) {
      concerns.push({
        stream: 'health',
        level: 'watch',
        tone: 'caution',
        label: 'Medication administered at school',
      })
    }
    const chronicEvents = eventCounts.chronic_condition ?? 0
    if (chronicEvents > 0 && !flags.chronicHealthCondition) {
      concerns.push({
        stream: 'health',
        level: 'watch',
        tone: 'caution',
        label: 'Care plan on file',
      })
    }
    const visits = eventCounts.nurse_visit ?? 0
    if (visits >= THRESHOLDS.nurseVisitWatch) {
      concerns.push({
        stream: 'health',
        level: 'watch',
        tone: 'caution',
        label: `${visits} health office visits`,
      })
    }
  }

  if (holds('behavior')) {
    const { behavior } = row
    if (behavior.suspensionCount > 0) {
      concerns.push({
        stream: 'behavior',
        level: 'priority',
        tone: 'critical',
        label: `${behavior.suspensionCount} suspension${behavior.suspensionCount === 1 ? '' : 's'} — ${behavior.suspensionDays} days`,
      })
    }
    if (behavior.disciplineReferralCount >= THRESHOLDS.referralPriority) {
      concerns.push({
        stream: 'behavior',
        level: 'priority',
        tone: 'critical',
        label: `${behavior.disciplineReferralCount} discipline referrals`,
      })
    } else if (behavior.disciplineReferralCount >= THRESHOLDS.referralWatch) {
      concerns.push({
        stream: 'behavior',
        level: 'watch',
        tone: 'concern',
        label: `${behavior.disciplineReferralCount} discipline referrals`,
      })
    }
  }

  if (holds('services') && row.services) {
    const { serviceTypes, serviceCount } = row.services
    const formal = serviceTypes.filter((type) =>
      (THRESHOLDS.formalPlanServices as readonly string[]).includes(type),
    )
    concerns.push({
      stream: 'services',
      level: formal.length > 0 ? 'priority' : 'watch',
      tone: formal.length > 0 ? 'critical' : 'caution',
      label:
        formal.length > 0
          ? `${formal.map(serviceLabel).join(' and ')} — ${serviceCount} service${serviceCount === 1 ? '' : 's'}`
          : `${serviceTypes.map(serviceLabel).join(', ')}`,
    })
  }

  return concerns
}

/** `504_plan` and `gifted_identification` are stored as enum values, not prose. */
export function serviceLabel(serviceType: string): string {
  switch (serviceType) {
    case 'IEP':
      return 'IEP'
    case '504_plan':
      return '504 plan'
    case 'ELL':
      return 'English language services'
    case 'gifted_identification':
      return 'Gifted identification'
    case 'intervention_program':
      return 'Intervention program'
    case 'speech_services':
      return 'Speech services'
    case 'counseling':
      return 'Counselling'
    default:
      return serviceType.replace(/_/g, ' ')
  }
}

export interface CaseloadEntry {
  row: CaseloadRow
  concerns: Concern[]
  priority: boolean
}

export type CaseloadLevel = 'priority' | 'full' | 'everyone'

export interface CaseloadFilter {
  level: CaseloadLevel
  /** Narrow to a single stream. Must be one the viewer holds; ignored if not. */
  stream: StreamKey | null
  grade: string | null
}

export const DEFAULT_FILTER: CaseloadFilter = { level: 'priority', stream: null, grade: null }

/**
 * The list, ordered.
 *
 * `everyone` is a real option and not a wider caseload: these accounts are
 * entitled to every named student in their building, and a nurse asked to find
 * one child by name should not have to get them onto a concern list first. It
 * carries whatever concerns the viewer's streams produce, which for most students
 * is none.
 *
 * The sort puts priority first and then orders by how much is on record, which is
 * a claim about where attention is owed and not about the students. Ties break on
 * name, so the list is stable and a second render never reshuffles it.
 */
export function buildCaseload(
  rows: readonly CaseloadRow[],
  allowed: readonly StreamKey[],
  filter: CaseloadFilter = DEFAULT_FILTER,
): CaseloadEntry[] {
  const streams =
    filter.stream !== null && allowed.includes(filter.stream) ? [filter.stream] : allowed

  const entries: CaseloadEntry[] = []
  for (const row of rows) {
    if (filter.grade !== null && row.gradeLevel !== filter.grade) continue

    const concerns = concernsOf(row, streams)
    const priority = concerns.some((concern) => concern.level === 'priority')

    if (filter.level === 'priority' && !priority) continue
    if (filter.level === 'full' && concerns.length === 0) continue

    entries.push({ row, concerns, priority })
  }

  return entries.sort(
    (a, b) =>
      Number(b.priority) - Number(a.priority) ||
      b.concerns.length - a.concerns.length ||
      a.row.lastName.localeCompare(b.row.lastName) ||
      a.row.firstName.localeCompare(b.row.firstName),
  )
}

/** How many students each level would hold, so the controls can say so. */
export function levelCounts(
  rows: readonly CaseloadRow[],
  allowed: readonly StreamKey[],
  filter: Pick<CaseloadFilter, 'stream' | 'grade'>,
): Record<CaseloadLevel, number> {
  return {
    priority: buildCaseload(rows, allowed, { ...filter, level: 'priority' }).length,
    full: buildCaseload(rows, allowed, { ...filter, level: 'full' }).length,
    everyone: buildCaseload(rows, allowed, { ...filter, level: 'everyone' }).length,
  }
}

/** Grades present in the building, in school order — kindergarten first. */
export function gradesOf(rows: readonly CaseloadRow[]): string[] {
  return [...new Set(rows.map((row) => row.gradeLevel))].sort(byGradeOrder)
}
