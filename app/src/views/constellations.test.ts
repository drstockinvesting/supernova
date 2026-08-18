/**
 * The star models, tested for the same reason the disclosure rules and the access
 * rules are: their failures do not look like failures.
 *
 * A sky lit on the wrong scale is still a sky. If the building view mapped 40%
 * mastery to a brighter star than the district view does, both pages would render
 * perfectly and the product's central claim — one visual language, readable at
 * every zoom level — would be quietly false. Nobody would catch that by looking,
 * because nobody sees two levels at once.
 *
 * The other thing worth pinning down is the roster order. The classroom sky is
 * only readable across units because a student holds the same position in every
 * unit's field, and that is a property of one sort call that a later refactor
 * could move inside the loop without changing anything visible on a screenshot.
 *
 * Run with `npm --prefix app test`. No framework — `node --test` and Node's own
 * type stripping.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Aggregates, SectionContext, SectionRosterRow, SectionUnit } from '../types/profile.ts'
import { intensityOfRate } from '../ui/stars.ts'
import { buildingSky, caseloadSky, classroomSky, districtSky, publicSky } from './constellations.ts'
import type { CaseloadEntry } from './caseload/caseload.ts'

// --- Fixtures ----------------------------------------------------------------

function unit(overrides: Partial<SectionUnit> & { unitId: string }): SectionUnit {
  return {
    name: overrides.unitId,
    subject: 'Math',
    sequence: 1,
    startDate: '2024-09-01',
    endDate: '2024-11-01',
    status: 'completed',
    pacing: { percentContentCovered: 100, percentTimeElapsed: 100, pacingStatus: 'on_track' },
    standardsTaughtToDate: 40,
    standardsMastered: 20,
    masteryRate: 50,
    interruptions: { count: 0, unplanned: 0, minutesLost: 0 },
    markingPeriodId: 'mp-1',
    plannedInstructionalDays: 45,
    standardIds: [],
    keyInstructionDates: [],
    ...overrides,
  } as SectionUnit
}

function student(
  studentId: string,
  lastName: string,
  masteryByUnit: Record<string, { taught: number; mastered: number }>,
): SectionRosterRow {
  return {
    studentId,
    firstName: 'A',
    lastName,
    standardsTaughtToDate: 0,
    standardsMastered: 0,
    masteryRate: 0,
    masteryByUnit,
    hasParticipationRecord: true,
    homeworkCompletionRate: null,
    completionRateByMarkingPeriod: [],
    attendanceRate: null,
    daysAbsent: 0,
    chronicAbsenteeismFlag: false,
    attendanceExceptions: [],
    behaviorIncidents: [],
    disciplineReferralCount: 0,
  }
}

function section(overrides: Partial<SectionContext> & { sectionId: string }): SectionContext {
  return {
    sectionName: overrides.sectionId,
    schoolId: 'school-a',
    schoolYear: '2024-2025',
    gradeLevel: '9',
    subject: 'Math',
    instructionalModel: 'departmentalized',
    teacherId: 'staff-1',
    coTeacherIds: [],
    period: '1',
    roomNumber: '100',
    studentCount: 20,
    standardsTaughtToDate: 100,
    standardsMastered: 40,
    masteryRate: 40,
    evidenceStrengthCounts: {},
    masteryBySubject: {},
    attendanceRate: null,
    chronicallyAbsentStudents: 0,
    chronicAbsenteeismRate: 0,
    homeworkCompletionRate: null,
    studentsWithoutParticipationRecord: 0,
    attributedBehaviorIncidents: 0,
    unattributedBehaviorIncidents: 0,
    disciplineReferrals: 0,
    interruptions: {
      totalInterruptions: 0,
      unplannedInterruptions: 0,
      totalMinutesLost: 0,
      averageInterruptionsPerUnit: 0,
    },
    activeUnits: [],
    unitCount: 1,
    suppressForPublicDisplay: false,
    ...overrides,
  } as SectionContext
}

function gradeCell(
  schoolId: string,
  gradeLevel: string,
  masteryBySubject: Record<string, { standardsTaughtToDate: number; standardsMastered: number; masteryRate: number }>,
  studentCount = 60,
) {
  return {
    schoolId,
    gradeLevel,
    label: `Grade ${gradeLevel}`,
    studentCount,
    suppressForPublicDisplay: studentCount < 10,
    masteryBySubject,
    standardsTaughtToDate: 0,
    standardsMastered: 0,
    masteryRate: 0,
    evidenceStrengthCounts: {},
    attendanceRate: null,
    chronicallyAbsentStudents: 0,
    chronicAbsenteeismRate: 0,
    totalBehaviorIncidents: 0,
    disciplineReferrals: 0,
    homeworkCompletionRate: null,
  } as unknown as Aggregates['grades'][number]
}

const SCHOOLS = [{ schoolId: 'school-a', label: 'School A' }]

// --- One scale, every level --------------------------------------------------

test('the same rate is lit identically at every zoom level', () => {
  const rate = 43.7

  const classroom = classroomSky(
    [unit({ unitId: 'u1' })],
    [student('stu-1', 'Alpha', { u1: { taught: 1000, mastered: 437 } })],
    { canOpenStudents: false },
  )
  const building = buildingSky([section({ sectionId: 'sec-1', masteryRate: rate })])
  const district = districtSky([section({ sectionId: 'sec-1', masteryRate: rate })], SCHOOLS)
  const publicView = publicSky(
    [
      gradeCell('school-a', '9', {
        Math: { standardsTaughtToDate: 1000, standardsMastered: 437, masteryRate: rate },
      }),
    ],
    SCHOOLS,
  )

  const intensities = [classroom, building, district, publicView].map(
    (groups) => groups[0].clusters[0].stars[0].intensity,
  )

  assert.deepEqual(intensities, Array(4).fill(intensityOfRate(rate)))
})

test('intensity is the rate itself, clamped, and never relative to its neighbours', () => {
  assert.equal(intensityOfRate(0), 0)
  assert.equal(intensityOfRate(50), 0.5)
  assert.equal(intensityOfRate(100), 1)
  assert.equal(intensityOfRate(140), 1)
  assert.equal(intensityOfRate(-5), 0)
  assert.equal(intensityOfRate(null), 0)

  // The same star, alone and among brighter company, is lit the same. This is the
  // property that keeps the sky from becoming a ranking.
  const alone = buildingSky([section({ sectionId: 'sec-1', masteryRate: 40 })])
  const amongBrighter = buildingSky([
    section({ sectionId: 'sec-1', masteryRate: 40 }),
    section({ sectionId: 'sec-2', masteryRate: 95 }),
  ])
  assert.equal(
    alone[0].clusters[0].stars[0].intensity,
    amongBrighter[0].clusters[0].stars.find((star) => star.id === 'sec-1')?.intensity,
  )
})

// --- Untaught is not unmastered ----------------------------------------------

test('nothing taught yet is dark as "not taught", never as a zero rate', () => {
  const building = buildingSky([
    section({ sectionId: 'sec-1', standardsTaughtToDate: 0, masteryRate: 0 }),
  ])
  const star = building[0].clusters[0].stars[0]
  assert.equal(star.state, 'not_taught')
  assert.equal(star.intensity, undefined)
  assert.match(star.label, /not yet taught/)

  // A genuine zero is a different thing and must still read as lit-at-zero.
  const zero = buildingSky([
    section({ sectionId: 'sec-2', standardsTaughtToDate: 90, masteryRate: 0 }),
  ])
  assert.equal(zero[0].clusters[0].stars[0].state, 'lit')
  assert.equal(zero[0].clusters[0].stars[0].intensity, 0)
})

test('a unit that has not started is dark for every student on the roster', () => {
  const groups = classroomSky(
    [unit({ unitId: 'u1', status: 'not_started', name: 'Unit 4' })],
    [
      student('stu-1', 'Alpha', { u1: { taught: 3, mastered: 3 } }),
      student('stu-2', 'Beta', {}),
    ],
    { canOpenStudents: true },
  )
  const states = groups[0].clusters[0].stars.map((star) => star.state)
  assert.deepEqual(states, ['not_taught', 'not_taught'])
})

// --- The classroom's readable-across property --------------------------------

test('a student holds the same position in every unit of the classroom sky', () => {
  const units = [
    unit({ unitId: 'u1', sequence: 1 }),
    unit({ unitId: 'u2', sequence: 2 }),
    unit({ unitId: 'u3', sequence: 3 }),
  ]
  // Deliberately out of order, and with mastery that would sort differently.
  const roster = [
    student('stu-c', 'Carter', { u1: { taught: 4, mastered: 4 }, u2: { taught: 4, mastered: 0 }, u3: { taught: 4, mastered: 2 } }),
    student('stu-a', 'Abbott', { u1: { taught: 4, mastered: 0 }, u2: { taught: 4, mastered: 4 }, u3: { taught: 4, mastered: 1 } }),
    student('stu-b', 'Bell', { u1: { taught: 4, mastered: 2 }, u2: { taught: 4, mastered: 2 }, u3: { taught: 4, mastered: 4 } }),
  ]

  const clusters = classroomSky(units, roster, { canOpenStudents: true })[0].clusters
  const positions = clusters.map((cluster) => cluster.stars.map((star) => star.id.split('-').pop()))

  assert.deepEqual(positions[0], ['a', 'b', 'c'], 'sorted by surname, not by mastery')
  assert.deepEqual(positions[1], positions[0])
  assert.deepEqual(positions[2], positions[0])
})

test('a classroom star opens the student only when the viewer may see names', () => {
  const units = [unit({ unitId: 'u1' })]
  const roster = [student('stu-1', 'Alpha', { u1: { taught: 4, mastered: 2 } })]

  const allowed = classroomSky(units, roster, { canOpenStudents: true })
  const refused = classroomSky(units, roster, { canOpenStudents: false })

  assert.equal(allowed[0].clusters[0].stars[0].to, '/student/stu-1')
  assert.equal(refused[0].clusters[0].stars[0].to, undefined)
})

// --- Grouping ----------------------------------------------------------------

test('a self-contained class clusters as all subjects rather than under one', () => {
  const groups = buildingSky([
    section({ sectionId: 'sec-1', subject: 'all', gradeLevel: '3', instructionalModel: 'self_contained' }),
  ])
  assert.equal(groups[0].label, 'Grade 3')
  assert.equal(groups[0].clusters[0].label, 'All subjects')
})

test('the district sky groups by building and drops buildings with no classrooms', () => {
  const groups = districtSky(
    [
      section({ sectionId: 'sec-1', schoolId: 'school-a', gradeLevel: '9' }),
      section({ sectionId: 'sec-2', schoolId: 'school-a', gradeLevel: '10' }),
    ],
    [
      { schoolId: 'school-a', label: 'School A' },
      { schoolId: 'school-b', label: 'School B' },
    ],
  )
  assert.deepEqual(groups.map((group) => group.label), ['School A'])
  assert.deepEqual(groups[0].clusters.map((cluster) => cluster.label), ['Grade 9', 'Grade 10'])
})

/**
 * Every sky sorts grades through `byGradeOrder`, and the reason is one building:
 * Nova is K-5, and a numeric string sort ranks 'K' after '5', so the elementary
 * sky read 1, 2, 3, 4, 5, Kindergarten. It is the kind of failure this file
 * exists for — the page renders perfectly and the order is simply wrong.
 */
test('a building sky puts kindergarten first, not after grade 5', () => {
  const groups = buildingSky([
    section({ sectionId: 'sec-1', gradeLevel: '5' }),
    section({ sectionId: 'sec-2', gradeLevel: 'K' }),
    section({ sectionId: 'sec-3', gradeLevel: '1' }),
  ])
  assert.deepEqual(
    groups.map((group) => group.label),
    ['Kindergarten', 'Grade 1', 'Grade 5'],
  )
})

test('a district sky puts kindergarten first within a building', () => {
  const groups = districtSky(
    [
      section({ sectionId: 'sec-1', schoolId: 'school-a', gradeLevel: '5' }),
      section({ sectionId: 'sec-2', schoolId: 'school-a', gradeLevel: 'K' }),
      section({ sectionId: 'sec-3', schoolId: 'school-a', gradeLevel: '1' }),
    ],
    SCHOOLS,
  )
  assert.deepEqual(
    groups[0].clusters.map((cluster) => cluster.label),
    ['Kindergarten', 'Grade 1', 'Grade 5'],
  )
})

test('a public sky puts kindergarten first within a building', () => {
  const subject = { Math: { standardsTaughtToDate: 100, standardsMastered: 40, masteryRate: 40 } }
  const groups = publicSky(
    [
      gradeCell('school-a', '5', subject),
      gradeCell('school-a', 'K', subject),
      gradeCell('school-a', '1', subject),
    ],
    SCHOOLS,
  )
  assert.deepEqual(
    groups[0].clusters[0].stars.map((star) => star.id),
    ['Math-school-a-K', 'Math-school-a-1', 'Math-school-a-5'],
  )
})

// --- Public suppression ------------------------------------------------------

test('a suppressed grade is drawn as withheld rather than removed from the row', () => {
  const subject = { Math: { standardsTaughtToDate: 100, standardsMastered: 40, masteryRate: 40 } }
  const groups = publicSky(
    [
      gradeCell('school-a', '9', subject, 60),
      gradeCell('school-a', '10', subject, 4), // below the threshold of ten
      gradeCell('school-a', '11', subject, 61),
    ],
    SCHOOLS,
  )

  const stars = groups[0].clusters[0].stars
  assert.equal(stars.length, 3, 'the withheld grade still occupies its place in the row')

  const withheld = stars.filter((star) => star.state === 'withheld')
  // Two: the grade below the threshold, and the complementary suppression that
  // stops the first from being recovered by subtraction.
  assert.equal(withheld.length, 2)
  for (const star of withheld) assert.match(star.label, /withheld/)
})

test('nothing on the public sky is clickable', () => {
  const groups = publicSky(
    [
      gradeCell('school-a', '9', {
        Math: { standardsTaughtToDate: 100, standardsMastered: 40, masteryRate: 40 },
      }),
    ],
    SCHOOLS,
  )
  for (const group of groups) {
    for (const cluster of group.clusters) {
      for (const star of cluster.stars) {
        assert.equal(star.to, undefined)
        assert.equal(star.onSelect, undefined)
      }
    }
  }
})

// --- The caseload sky ---------------------------------------------------------

function entry(
  studentId: string,
  gradeLevel: string,
  masteryRate: number,
  { priority = false, concerns = 0 } = {},
): CaseloadEntry {
  return {
    priority,
    concerns: Array.from({ length: concerns }, () => ({
      stream: 'attendance' as const,
      level: priority ? ('priority' as const) : ('watch' as const),
      tone: 'concern' as const,
      label: 'concern',
    })),
    row: {
      studentId,
      firstName: studentId,
      lastName: studentId,
      gradeLevel,
      sectionCount: 1,
      mastery: {
        masteryRate,
        standardsTaughtToDate: 40,
        standardsMastered: Math.round((masteryRate / 100) * 40),
        standardsWithNoEvidence: 0,
        homeworkCompletionRate: 80,
      },
      attendance: {
        attendanceRate: 96,
        daysAbsent: 4,
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
        outreachAttempts: 1,
        conferenceAttendance: 1,
        engagementLevel: 'highly_engaged',
      },
    },
  }
}

test('a caseload star is lit on the same scale as every aggregate above it', () => {
  // The one that would be easy to get wrong and impossible to see: this is the
  // only sky whose stars come from individual students rather than from a
  // rollup, so it is the likeliest place for a second brightness scale to appear.
  const [group] = caseloadSky([entry('a', '3', 40)], { canOpenStudents: true })
  const star = group.clusters[0].stars[0]
  assert.equal(star.intensity, intensityOfRate(40))
})

test('a caseload groups by grade with kindergarten first, not after grade 5', () => {
  const groups = caseloadSky(
    [entry('a', '5', 50), entry('b', 'K', 50), entry('c', '1', 50)],
    { canOpenStudents: true },
  )
  assert.deepEqual(
    groups.map((group) => group.label),
    ['Kindergarten', 'Grade 1', 'Grade 5'],
  )
})

test('a caseload clusters by what is on record, and drops empty clusters', () => {
  const groups = caseloadSky(
    [
      entry('a', '3', 50, { priority: true, concerns: 2 }),
      entry('b', '3', 50, { concerns: 1 }),
    ],
    { canOpenStudents: true },
  )
  assert.deepEqual(
    groups[0].clusters.map((cluster) => cluster.label),
    ['Priority', 'Watch'],
  )
})

test('a student with nothing taught is dark rather than a zero rate', () => {
  const blank = entry('a', '3', 0)
  blank.row.mastery.standardsTaughtToDate = 0
  const [group] = caseloadSky([blank], { canOpenStudents: true })
  const star = group.clusters[0].stars[0]
  assert.equal(star.state, 'not_taught')
  assert.equal(star.intensity, undefined)
})

test('a caseload star opens the student only when the viewer may see names', () => {
  const open = caseloadSky([entry('a', '3', 50)], { canOpenStudents: true })
  assert.equal(open[0].clusters[0].stars[0].to, '/student/a')

  const closed = caseloadSky([entry('a', '3', 50)], { canOpenStudents: false })
  assert.equal(closed[0].clusters[0].stars[0].to, undefined)
})
