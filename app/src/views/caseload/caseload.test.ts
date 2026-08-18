/**
 * What a caseload holds, and — the part that matters — what it does not.
 *
 * A caseload that leaks a stream renders exactly like one that does not. There is
 * no error, no empty panel, no missing column: a nurse's list simply contains a
 * student it should not, carrying a chip about a discipline referral, on a page
 * that looks completely normal. Nobody would notice by looking, and the only way
 * to find it by hand is to know a student's referral count before opening the
 * page. So the leak is asserted directly, from both ends — that the concern is
 * absent, and that the student is absent with it.
 *
 * The fixtures are shaped like the generator's rows rather than minimally, so a
 * field added to `CaseloadRow` shows up here as a type error instead of as an
 * assertion that quietly stopped covering anything.
 *
 * Run with `npm --prefix app test`.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { CaseloadRow } from '../../types/profile.ts'
import type { Permission } from '../../session/roles.ts'
import {
  DEFAULT_FILTER,
  STREAMS,
  buildCaseload,
  concernsOf,
  gradesOf,
  levelCounts,
  streamsFor,
  type StreamKey,
} from './caseload.ts'

// --- Fixtures -----------------------------------------------------------------

const NURSE: Permission[] = [
  'view_individual_students',
  'view_student_names',
  'view_attendance_detail',
  'view_health_detail',
]

const COUNSELOR: Permission[] = [
  'view_aggregate_mastery',
  'view_individual_students',
  'view_student_names',
  'view_attendance_detail',
  'view_behavior_detail',
  'view_health_detail',
  'view_special_services_detail',
  'add_intervention_notes',
]

const SPED: Permission[] = [
  'view_aggregate_mastery',
  'view_individual_students',
  'view_student_names',
  'view_attendance_detail',
  'view_behavior_detail',
  'view_special_services_detail',
  'view_evidence_artifacts',
  'record_mastery',
  'add_intervention_notes',
]

const holder = (permissions: Permission[]) => (permission: Permission) =>
  permissions.includes(permission)

const keysOf = (permissions: Permission[]): StreamKey[] =>
  streamsFor(holder(permissions)).map((stream) => stream.key)

function row(overrides: Partial<CaseloadRow> = {}): CaseloadRow {
  return {
    studentId: 'stu-a',
    firstName: 'Ada',
    lastName: 'Bell',
    gradeLevel: '4',
    sectionCount: 1,
    mastery: {
      masteryRate: 70,
      standardsTaughtToDate: 40,
      standardsMastered: 28,
      standardsWithNoEvidence: 2,
      homeworkCompletionRate: 85,
    },
    attendance: {
      attendanceRate: 98,
      daysAbsent: 2,
      daysEnrolled: 108,
      daysExcusedAbsent: 2,
      tardyCount: 0,
      chronicAbsenteeismFlag: false,
    },
    behavior: {
      disciplineReferralCount: 0,
      suspensionCount: 0,
      suspensionDays: 0,
      totalIncidents: 0,
      positiveRecognitionCount: 0,
      lastIncidentDate: null,
    },
    health: {
      flags: {
        chronicHealthCondition: false,
        foodInsecurityRisk: false,
        housingInstability: false,
        mentalHealthConcern: false,
        otherWellnessFactors: [],
      },
      eventCounts: {},
      totalEvents: 0,
      lastEventDate: null,
    },
    services: null,
    engagement: {
      responseRate: 100,
      outreachAttempts: 2,
      conferenceAttendance: 1,
      engagementLevel: 'highly_engaged',
    },
    ...overrides,
  }
}

// --- A stream is a permission --------------------------------------------------

test('each role gets exactly the streams its permissions cover', () => {
  assert.deepEqual(keysOf(NURSE), ['attendance', 'health'])
  assert.deepEqual(keysOf(COUNSELOR), ['attendance', 'health', 'behavior', 'services'])
  assert.deepEqual(keysOf(SPED), ['attendance', 'behavior', 'services'])
})

test('every stream names a permission the district actually issues', () => {
  // A stream keyed to a misspelling would be silently held by nobody, and the
  // page would render without it forever rather than fail.
  const vocabulary = new Set<string>([
    'view_attendance_detail',
    'view_behavior_detail',
    'view_health_detail',
    'view_special_services_detail',
  ])
  for (const stream of STREAMS) {
    assert.equal(vocabulary.has(stream.permission), true, stream.permission)
  }
})

test('a nurse sees nothing from the behaviour stream, on a student made of it', () => {
  const suspended = row({
    behavior: {
      disciplineReferralCount: 6,
      suspensionCount: 2,
      suspensionDays: 4,
      totalIncidents: 8,
      positiveRecognitionCount: 0,
      lastIncidentDate: '2025-01-20',
    },
  })

  const nurse = concernsOf(suspended, keysOf(NURSE))
  assert.deepEqual(nurse, [], 'a nurse must not be handed a behaviour concern')

  // And the student does not appear at all: not greyed, not counted, absent.
  assert.equal(buildCaseload([suspended], keysOf(NURSE), DEFAULT_FILTER).length, 0)
  assert.equal(buildCaseload([suspended], keysOf(COUNSELOR), DEFAULT_FILTER).length, 1)
})

test('a special education teacher sees nothing from the health stream', () => {
  const unwell = row({
    health: {
      flags: {
        chronicHealthCondition: true,
        foodInsecurityRisk: true,
        housingInstability: false,
        mentalHealthConcern: true,
        otherWellnessFactors: [],
      },
      eventCounts: { nurse_visit: 9, medication_flag: 3, mental_health_flag: 2 },
      totalEvents: 14,
      lastEventDate: '2025-02-03',
    },
  })

  assert.deepEqual(concernsOf(unwell, keysOf(SPED)), [])
  assert.equal(buildCaseload([unwell], keysOf(SPED), DEFAULT_FILTER).length, 0)

  const nurse = concernsOf(unwell, keysOf(NURSE))
  assert.equal(
    nurse.every((concern) => concern.stream === 'health'),
    true,
  )
  assert.equal(nurse.length > 0, true)
})

test('narrowing to a stream the viewer does not hold does not widen the list', () => {
  // The filter comes from a control the viewer clicks, and a control can be
  // driven from a URL or a stale render. Asking for behaviour as a nurse falls
  // back to the streams they hold rather than granting the one they named.
  const suspended = row({
    behavior: {
      disciplineReferralCount: 6,
      suspensionCount: 2,
      suspensionDays: 4,
      totalIncidents: 8,
      positiveRecognitionCount: 0,
      lastIncidentDate: '2025-01-20',
    },
  })

  const forced = buildCaseload([suspended], keysOf(NURSE), {
    level: 'everyone',
    stream: 'behavior',
    grade: null,
  })
  assert.equal(forced.length, 1)
  assert.deepEqual(forced[0].concerns, [])
})

// --- What puts a student on a list ---------------------------------------------

test('chronic absence is priority and a dip below the watch line is not', () => {
  const chronic = concernsOf(
    row({
      attendance: {
        attendanceRate: 84,
        daysAbsent: 17,
        daysEnrolled: 108,
        daysExcusedAbsent: 9,
        tardyCount: 1,
        chronicAbsenteeismFlag: true,
      },
    }),
    ['attendance'],
  )
  assert.equal(chronic.length, 1)
  assert.equal(chronic[0].level, 'priority')

  const dipping = concernsOf(
    row({
      attendance: {
        attendanceRate: 91.4,
        daysAbsent: 9,
        daysEnrolled: 108,
        daysExcusedAbsent: 7,
        tardyCount: 1,
        chronicAbsenteeismFlag: false,
      },
    }),
    ['attendance'],
  )
  assert.equal(dipping.length, 1)
  assert.equal(dipping[0].level, 'watch')
})

test('the chronic flag is used as given rather than re-derived from the rate', () => {
  // The generator computes it against the standard definition of missing a tenth
  // of enrolled days. Recomputing it here from an attendance rate would produce a
  // second, slightly different rule for the same idea, and the two would disagree
  // on exactly the students the rule exists for.
  const flagged = concernsOf(
    row({
      attendance: {
        attendanceRate: 95,
        daysAbsent: 11,
        daysEnrolled: 108,
        daysExcusedAbsent: 0,
        tardyCount: 0,
        chronicAbsenteeismFlag: true,
      },
    }),
    ['attendance'],
  )
  assert.equal(flagged[0].level, 'priority')
  assert.match(flagged[0].label, /Chronic absence/)
})

test('a formal plan is priority and a service without one is not', () => {
  const iep = concernsOf(
    row({
      services: {
        status: 'active',
        startDate: '2024-09-11',
        serviceTypes: ['IEP'],
        eligibilityCategories: ['Autism'],
        serviceCount: 2,
      },
    }),
    ['services'],
  )
  assert.equal(iep[0].level, 'priority')

  const gifted = concernsOf(
    row({
      services: {
        status: 'active',
        startDate: '2024-09-11',
        serviceTypes: ['gifted_identification'],
        eligibilityCategories: [],
        serviceCount: 1,
      },
    }),
    ['services'],
  )
  assert.equal(gifted[0].level, 'watch')
  assert.match(gifted[0].label, /Gifted identification/)
})

test('a student with nothing on record is on no list but the building roll', () => {
  const fine = row()
  const streams = keysOf(COUNSELOR)

  assert.deepEqual(concernsOf(fine, streams), [])
  assert.deepEqual(levelCounts([fine], streams, { stream: null, grade: null }), {
    priority: 0,
    full: 0,
    everyone: 1,
  })
})

// --- Ordering and filtering ----------------------------------------------------

test('priority comes first, then weight of record, then name', () => {
  const quiet = row({ studentId: 'stu-quiet', lastName: 'Abbott', firstName: 'Zoe' })
  const watch = row({
    studentId: 'stu-watch',
    lastName: 'Zeller',
    firstName: 'Ana',
    attendance: {
      attendanceRate: 91,
      daysAbsent: 9,
      daysEnrolled: 108,
      daysExcusedAbsent: 4,
      tardyCount: 9,
      chronicAbsenteeismFlag: false,
    },
  })
  const priority = row({
    studentId: 'stu-priority',
    lastName: 'Mora',
    firstName: 'Kit',
    attendance: {
      attendanceRate: 82,
      daysAbsent: 19,
      daysEnrolled: 108,
      daysExcusedAbsent: 6,
      tardyCount: 0,
      chronicAbsenteeismFlag: true,
    },
  })

  const everyone = buildCaseload([quiet, watch, priority], keysOf(NURSE), {
    level: 'everyone',
    stream: null,
    grade: null,
  })
  assert.deepEqual(
    everyone.map((entry) => entry.row.studentId),
    ['stu-priority', 'stu-watch', 'stu-quiet'],
  )
})

test('the sort is stable across a rebuild of the same rows', () => {
  const rows = [
    row({ studentId: 'a', lastName: 'Ng', firstName: 'Bo' }),
    row({ studentId: 'b', lastName: 'Ng', firstName: 'Al' }),
    row({ studentId: 'c', lastName: 'Ng', firstName: 'Cy' }),
  ]
  const once = buildCaseload(rows, keysOf(NURSE), { level: 'everyone', stream: null, grade: null })
  const twice = buildCaseload([...rows].reverse(), keysOf(NURSE), {
    level: 'everyone',
    stream: null,
    grade: null,
  })
  assert.deepEqual(
    once.map((entry) => entry.row.studentId),
    twice.map((entry) => entry.row.studentId),
  )
})

test('a grade filter narrows every level, including the building roll', () => {
  const rows = [
    row({ studentId: 'k1', gradeLevel: 'K' }),
    row({ studentId: 'g1', gradeLevel: '1' }),
    row({ studentId: 'g2', gradeLevel: '1' }),
  ]
  assert.deepEqual(gradesOf(rows), ['K', '1'])
  assert.equal(
    buildCaseload(rows, keysOf(NURSE), { level: 'everyone', stream: null, grade: '1' }).length,
    2,
  )
})

test('a stream filter narrows within the streams the viewer already holds', () => {
  const both = row({
    attendance: {
      attendanceRate: 82,
      daysAbsent: 19,
      daysEnrolled: 108,
      daysExcusedAbsent: 6,
      tardyCount: 0,
      chronicAbsenteeismFlag: true,
    },
    health: {
      flags: {
        chronicHealthCondition: true,
        foodInsecurityRisk: false,
        housingInstability: false,
        mentalHealthConcern: false,
        otherWellnessFactors: [],
      },
      eventCounts: { nurse_visit: 2 },
      totalEvents: 2,
      lastEventDate: '2025-01-30',
    },
  })

  const all = buildCaseload([both], keysOf(NURSE), DEFAULT_FILTER)
  assert.equal(all[0].concerns.length, 2)

  const health = buildCaseload([both], keysOf(NURSE), {
    level: 'priority',
    stream: 'health',
    grade: null,
  })
  assert.equal(health[0].concerns.length, 1)
  assert.equal(health[0].concerns[0].stream, 'health')
})
