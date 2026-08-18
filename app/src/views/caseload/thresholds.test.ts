/**
 * What this district's own students do to the caseload thresholds.
 *
 * `caseload.test.ts` next door asserts the stream boundary and the sort against
 * fixtures, which is the right shape for those: a leak is a claim about the code,
 * and a fixture built to leak proves the code does not. This file asks the other
 * question, which no fixture can answer — whether the seven numbers in
 * `THRESHOLDS` divide 1,102 real students into a caseload somebody could work.
 *
 * The page prints those numbers, so the rule can be argued with. That is not the
 * same as the numbers being right, and `caseload.ts` says so in as many words.
 * Six of the seven were chosen in one session by reading this district's figures
 * and picking something that produced a list of plausible size; the seventh,
 * chronic absence, arrives already computed against the federal definition and is
 * the only line here anybody qualified chose. This is the companion to
 * `ui/thresholds.test.ts`, which does the same job for the research triggers, and
 * it exists for the same reason: a threshold that has stopped dividing anything
 * renders exactly like one that is working.
 *
 * ## The failures it is looking for
 *
 * **Dead.** A rule nobody meets is a line in the printed rule list and nothing
 * else.
 *
 * **Pinned to the ceiling.** A rule that catches only students sitting exactly on
 * its own value has no headroom: nothing in the district is above it, so raising
 * it by one makes it dead, and the students it names are not a group that
 * exceeded a line — they are the top of the range with a line drawn under them.
 * This is the one the shipped district fails.
 *
 * **A directory rather than a caseload.** The priority filter defaults on because
 * a counselor's full list is most of a building. If priority ever grows to the
 * same thing, the page has quietly stopped triaging.
 *
 * Unlike the research file, nothing here is mirrored: `concernsOf`, `streamsFor`
 * and `buildCaseload` are plain TypeScript and are called directly, so what is
 * measured is what a page renders. The permission sets are read from the accounts
 * the district actually issues rather than written down here, for the same
 * reason.
 *
 * Run with `npm --prefix app test`.
 */

import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import type { CaseloadIndex, CaseloadRow } from '../../types/profile.ts'
import type { Permission, Role } from '../../session/roles.ts'
import {
  STREAMS,
  THRESHOLDS,
  buildCaseload,
  concernsOf,
  streamsFor,
  type StreamKey,
} from './caseload.ts'

// --- The shipped dataset ------------------------------------------------------

const DATA = join(import.meta.dirname, '..', '..', '..', '..', 'data')

const BUILDINGS: CaseloadIndex[] = readdirSync(join(DATA, 'aggregates', 'caseload'))
  .sort()
  .map((file) => JSON.parse(readFileSync(join(DATA, 'aggregates', 'caseload', file), 'utf8')))

const EVERY_STUDENT: CaseloadRow[] = BUILDINGS.flatMap((building) => building.students)

interface Account {
  roleAssignments: { role: Role; permissions: Permission[] }[]
}

const USERS: Account[] = JSON.parse(readFileSync(join(DATA, 'district', 'users.json'), 'utf8'))

/** The roles that land on a caseload, and the administrators who may open one. */
const CASELOAD_ROLES: Role[] = [
  'nurse',
  'special_education_teacher',
  'counselor',
  'building_administrator',
]

/**
 * The streams a role really holds, read off the accounts rather than written here.
 *
 * A permission list written into a test is a second opinion about what the
 * district issues, and the whole point of this page is that the streams come from
 * the account. `permissionSetsFor` returns every distinct set so the test below
 * can assert there is exactly one — without that, "the nurse's caseload" would
 * be a phrase with no referent.
 */
function permissionSetsFor(role: Role): Permission[][] {
  const seen = new Map<string, Permission[]>()
  for (const user of USERS) {
    for (const assignment of user.roleAssignments ?? []) {
      if (assignment.role !== role) continue
      const permissions = [...assignment.permissions].sort()
      seen.set(permissions.join(','), permissions)
    }
  }
  return [...seen.values()]
}

function streamsHeldBy(role: Role): StreamKey[] {
  const permissions = permissionSetsFor(role)[0] ?? []
  return streamsFor((permission) => permissions.includes(permission)).map((stream) => stream.key)
}

const ALL_STREAMS = STREAMS.map((stream) => stream.key)

// --- Measuring the thresholds -------------------------------------------------

/**
 * One row of the rule the page prints, as a predicate over a student.
 *
 * `catches` is the rule as written. `exceeds` is the same rule one step stricter,
 * which is how headroom is measured: if every student the rule catches sits
 * exactly on its value, `exceeds` is empty and the threshold is at the ceiling of
 * what this district can express.
 *
 * These duplicate the conditions inside `concernsOf`, which is a real cost — so
 * the first test below asserts each one selects exactly the students `concernsOf`
 * raises that concern for, against every student in the district. A drift makes
 * that fail rather than quietly measuring the wrong thing.
 */
interface Rule {
  threshold: number
  /** The chip `concernsOf` produces for a student this rule catches. */
  chip: (row: CaseloadRow) => boolean
  catches: (row: CaseloadRow) => boolean
  exceeds: (row: CaseloadRow) => boolean
  stream: StreamKey
}

const nurseVisits = (row: CaseloadRow) => row.health.eventCounts.nurse_visit ?? 0

const RULES: Record<string, Rule> = {
  attendanceWatch: {
    threshold: THRESHOLDS.attendanceWatch,
    stream: 'attendance',
    chip: (row) => /^Attendance /.test(concernLabel(row, 'attendance') ?? ''),
    catches: (row) =>
      !row.attendance.chronicAbsenteeismFlag &&
      row.attendance.attendanceRate !== null &&
      row.attendance.attendanceRate < THRESHOLDS.attendanceWatch,
    exceeds: (row) =>
      !row.attendance.chronicAbsenteeismFlag &&
      row.attendance.attendanceRate !== null &&
      row.attendance.attendanceRate < THRESHOLDS.attendanceWatch - 1,
  },
  tardyWatch: {
    threshold: THRESHOLDS.tardyWatch,
    stream: 'attendance',
    chip: (row) => hasChip(row, 'attendance', / late arrivals$/),
    catches: (row) => row.attendance.tardyCount >= THRESHOLDS.tardyWatch,
    exceeds: (row) => row.attendance.tardyCount > THRESHOLDS.tardyWatch,
  },
  nurseVisitWatch: {
    threshold: THRESHOLDS.nurseVisitWatch,
    stream: 'health',
    chip: (row) => hasChip(row, 'health', / health office visits$/),
    catches: (row) => nurseVisits(row) >= THRESHOLDS.nurseVisitWatch,
    exceeds: (row) => nurseVisits(row) > THRESHOLDS.nurseVisitWatch,
  },
  referralPriority: {
    threshold: THRESHOLDS.referralPriority,
    stream: 'behavior',
    chip: (row) => hasChip(row, 'behavior', / discipline referrals$/),
    catches: (row) => row.behavior.disciplineReferralCount >= THRESHOLDS.referralPriority,
    exceeds: (row) => row.behavior.disciplineReferralCount > THRESHOLDS.referralPriority,
  },
  referralWatch: {
    threshold: THRESHOLDS.referralWatch,
    stream: 'behavior',
    chip: (row) => hasChip(row, 'behavior', / discipline referrals$/),
    catches: (row) => row.behavior.disciplineReferralCount >= THRESHOLDS.referralWatch,
    exceeds: (row) => row.behavior.disciplineReferralCount > THRESHOLDS.referralWatch,
  },
}

function hasChip(row: CaseloadRow, stream: StreamKey, pattern: RegExp): boolean {
  return concernsOf(row, ALL_STREAMS).some(
    (concern) => concern.stream === stream && pattern.test(concern.label),
  )
}

function concernLabel(row: CaseloadRow, stream: StreamKey): string | undefined {
  return concernsOf(row, ALL_STREAMS).find((concern) => concern.stream === stream)?.label
}

const count = (predicate: (row: CaseloadRow) => boolean) => EVERY_STUDENT.filter(predicate).length

// --- What this district does not exercise -------------------------------------

/**
 * Thresholds this district's students do not stand above, with the count saying so.
 *
 * The same registry as `ui/thresholds.test.ts` and for the same reason: a to-do
 * list somebody has to look at, not an exception granted. The counts are asserted
 * rather than decorative, so an entry that has been fixed and left here fails as
 * loudly as one that has quietly got worse.
 */
const NO_HEADROOM: Record<string, { catches: number; exceeds: number; why: string }> = {
  tardyWatch: {
    catches: 58,
    exceeds: 0,
    why:
      'Eight late arrivals, against a district whose median student has three and whose ' +
      'most-late student has exactly eight. Every one of the 58 students this catches sits ' +
      'on the line; not one is above it. A threshold of nine would name nobody, which means ' +
      'this rule is reading the top of the generator’s range rather than a lateness pattern ' +
      'somebody recognised — and a real district, where a student can be late thirty times, ' +
      'would not behave anything like this.',
  },
}

// --- The population -----------------------------------------------------------

test('the caseload population is the one this district actually has', () => {
  // Pinned because every count below is a fraction of these.
  assert.equal(BUILDINGS.length, 3)
  assert.equal(EVERY_STUDENT.length, 1102)
  assert.deepEqual(
    BUILDINGS.map((building) => building.students.length),
    [434, 302, 366],
  )
})

test('each caseload role issues exactly one permission set', () => {
  // Otherwise "the nurse's caseload" names more than one page and every count in
  // this file is a measurement of whichever account happened to sort first.
  for (const role of CASELOAD_ROLES) {
    assert.equal(
      permissionSetsFor(role).length,
      1,
      `${role} accounts do not all hold the same permissions`,
    )
  }
})

test('the streams each role holds are the ones the caseload was built for', () => {
  // The Phase 6 claim, measured against the accounts rather than asserted: a
  // stream is a permission, and these three roles are three different pages.
  assert.deepEqual(streamsHeldBy('nurse'), ['attendance', 'health'])
  assert.deepEqual(streamsHeldBy('special_education_teacher'), [
    'attendance',
    'behavior',
    'services',
  ])
  assert.deepEqual(streamsHeldBy('counselor'), ['attendance', 'health', 'behavior', 'services'])
  assert.deepEqual(streamsHeldBy('building_administrator'), [
    'attendance',
    'health',
    'behavior',
    'services',
  ])
})

// --- The thresholds -----------------------------------------------------------

test('each rule selects exactly the students its chip appears on', () => {
  // The cost of writing these predicates twice, paid here. If `concernsOf` and
  // the rule table below ever disagree about who a threshold catches, everything
  // measured in this file is measuring the copy.
  for (const [name, rule] of Object.entries(RULES)) {
    // The two referral rules share one chip — the priority band is a subset of
    // the watch band — so a chip implies the watch rule, not each rule.
    if (name === 'referralPriority') continue
    for (const row of EVERY_STUDENT) {
      assert.equal(
        rule.catches(row),
        rule.chip(row),
        `${name}: the rule and the chip disagree about ${row.studentId}`,
      )
    }
  }
})

test('every threshold catches somebody in this district', () => {
  // A rule nobody meets is a line in the printed rule list and nothing else.
  for (const [name, rule] of Object.entries(RULES)) {
    assert.ok(
      count(rule.catches) > 0,
      `${name} (${rule.threshold}) puts no student in this district on a list`,
    )
  }
  assert.ok(
    count((row) => row.attendance.chronicAbsenteeismFlag) > 0,
    'the chronic absence flag is never set in this district',
  )
  assert.ok(
    count(
      (row) =>
        row.services !== null &&
        row.services.serviceTypes.some((type) =>
          (THRESHOLDS.formalPlanServices as readonly string[]).includes(type),
        ),
    ) > 0,
    'no student in this district holds a formal plan',
  )
})

test('a threshold names a group that stands above it, not one sitting on it', () => {
  // The pathology this file was written for. A rule whose whole catch sits
  // exactly on its own value has no headroom: raise it by one and it is dead,
  // and the students it names are the top of the range rather than a group that
  // crossed a line.
  const pinned = Object.entries(RULES)
    .filter(([, rule]) => count(rule.catches) > 0 && count(rule.exceeds) === 0)
    .map(([name]) => name)
    .filter((name) => !(name in NO_HEADROOM))
    .sort()

  assert.deepEqual(
    pinned,
    [],
    'these thresholds catch only the students sitting on them — move the threshold, or record it in NO_HEADROOM with the reason',
  )
})

test('the no-headroom list is not stale', () => {
  for (const [name, expected] of Object.entries(NO_HEADROOM)) {
    const rule = RULES[name]
    assert.ok(rule, `NO_HEADROOM names ${name}, which is not a rule — delete it`)
    assert.deepEqual(
      { catches: count(rule.catches), exceeds: count(rule.exceeds) },
      { catches: expected.catches, exceeds: expected.exceeds },
      `${name}: the measurement has moved. Re-read the entry, then update or delete it`,
    )
    assert.ok(expected.why.length > 0, `${name} is recorded without a reason`)
  }
})

test('what each threshold does to this district, recorded', () => {
  // Generation is deterministic, so these move only when the generator changes
  // or somebody edits a threshold — both moments when the rule should be read
  // again. The `full` figures are the reason `priority` defaults on: a counselor
  // asked to work 269 students has been handed a directory.
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(RULES).map(([name, rule]) => [name, count(rule.catches)]),
    ),
    {
      attendanceWatch: 115,
      tardyWatch: 58,
      nurseVisitWatch: 13,
      referralPriority: 51,
      referralWatch: 115,
    },
  )

  const sizes = BUILDINGS.flatMap((building) =>
    CASELOAD_ROLES.map((role) => {
      const allowed = streamsHeldBy(role)
      const level = (name: 'priority' | 'full') =>
        buildCaseload(building.students, allowed, { level: name, stream: null, grade: null })
          .length
      return `${building.schoolId} ${role} ${level('priority')}/${level('full')}/${building.students.length}`
    }),
  )

  assert.deepEqual(sizes, [
    'constellation-high nurse 86/228/434',
    'constellation-high special_education_teacher 142/202/434',
    'constellation-high counselor 158/269/434',
    'constellation-high building_administrator 158/269/434',
    'meridian-middle nurse 54/143/302',
    'meridian-middle special_education_teacher 87/131/302',
    'meridian-middle counselor 99/184/302',
    'meridian-middle building_administrator 99/184/302',
    'nova-elementary nurse 82/190/366',
    'nova-elementary special_education_teacher 115/169/366',
    'nova-elementary counselor 135/230/366',
    'nova-elementary building_administrator 135/230/366',
  ])
})

// --- The list the thresholds add up to ----------------------------------------

test('the priority list stays a list rather than becoming the building', () => {
  // The filter that defaults on is the only thing between this page and the
  // directory underneath it. If priority ever grows to the size of `full`, the
  // page has stopped triaging and nothing on screen would say so.
  for (const building of BUILDINGS) {
    for (const role of CASELOAD_ROLES) {
      const priority = buildCaseload(building.students, streamsHeldBy(role), {
        level: 'priority',
        stream: null,
        grade: null,
      }).length
      const share = (100 * priority) / building.students.length
      assert.ok(
        share < 50,
        `${role} at ${building.schoolId} carries ${share.toFixed(1)}% of the building as priority`,
      )
    }
  }
})

test('every stream a role holds can put a student on its priority list', () => {
  // A stream that never raises a priority concern is a column of decoration: the
  // viewer holds the permission, the page draws the heading, and the filter that
  // matters never sees it.
  for (const role of CASELOAD_ROLES) {
    for (const stream of streamsHeldBy(role)) {
      const raised = EVERY_STUDENT.filter((row) =>
        concernsOf(row, [stream]).some((concern) => concern.level === 'priority'),
      ).length
      assert.ok(
        raised > 0,
        `${role} holds ${stream} and no student in this district is priority through it`,
      )
    }
  }
})

test('holding more streams never takes a student off your priority list', () => {
  // Monotonic by construction — concerns are appended per stream — and worth
  // pinning against the real building, because the day it stops being true a
  // counselor stops seeing a child the nurse can see, and both pages look right.
  for (const building of BUILDINGS) {
    const nurse = new Set(
      buildCaseload(building.students, streamsHeldBy('nurse'), {
        level: 'priority',
        stream: null,
        grade: null,
      }).map((entry) => entry.row.studentId),
    )
    const counselor = new Set(
      buildCaseload(building.students, streamsHeldBy('counselor'), {
        level: 'priority',
        stream: null,
        grade: null,
      }).map((entry) => entry.row.studentId),
    )
    for (const studentId of nurse) {
      assert.ok(
        counselor.has(studentId),
        `${studentId} is priority for a nurse at ${building.schoolId} and not for a counselor`,
      )
    }
  }
})
