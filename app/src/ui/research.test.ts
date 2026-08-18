/**
 * The research layer is the part of Supernova whose failures are completely
 * invisible. A citation that never fires renders exactly like one that fires
 * correctly — as nothing at all — and that is not a hypothetical: half the
 * shipped library was inert for four phases, a school board member's single
 * claim was firing off an individual's threshold applied to 558 district
 * referrals, and four of the ten roles had no research context of any kind.
 * Every one of those was legible in the data and none of them was legible on a
 * screen.
 *
 * So these tests do two jobs. The first half exercises the selector against
 * fixtures. The second half reads the *shipped dataset* and asserts the contract
 * between the library and the app: that every claim names a metric the app
 * declares, that some view supplies it at the scale the claim needs, and that
 * every role is spoken to. Those are the assertions that would have caught the
 * Phase 5 findings in Phase 1.
 *
 * Run with `npm --prefix app test`. No test framework — `node --test` and Node's
 * own type stripping, so this adds no dependency to a project that has none.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import type { ResearchCitation } from '../types/supernova.ts'
import { ROLE_ORDER, type Role } from '../session/roles.ts'
import {
  METRICS,
  REVIEW_LABELS,
  coverageOf,
  deriveReviewStatus,
  describeTrigger,
  exercisableAt,
  groupMetrics,
  isUnverified,
  matches,
  referralsPer100,
  selectCitations,
  studentMetrics,
  triggerOf,
  withoutEvidenceShare,
  type MetricBag,
  type MetricName,
} from './research.ts'

// --- Fixtures ----------------------------------------------------------------

function citation(
  id: string,
  trigger: Record<string, unknown> | undefined,
  roles: string[] = ['teacher'],
): ResearchCitation {
  return {
    id,
    claim: 'A claim.',
    topic: 'attendance',
    source: {
      authorOrOrganization: 'Nobody',
      title: 'Nothing',
      publicationYear: 2000,
      url: 'https://example.invalid/',
      sourceType: 'other',
    },
    applicableRoles: roles,
    triggerConditions: trigger,
    confidenceNote: 'A caveat.',
    metadata: {},
    // A fixture claim nobody has checked, which is what an unreviewed record is.
    review: { status: 'unreviewed', sourceCheck: null, signOff: null },
  }
}

const groupBag = (values: Partial<Record<MetricName, number | boolean | null>>): MetricBag => ({
  scale: 'group',
  values,
})
const studentBag = (values: Partial<Record<MetricName, number | boolean | null>>): MetricBag => ({
  scale: 'student',
  values,
})

// --- Comparators -------------------------------------------------------------

test('above and below are strict', () => {
  const above = { metric: 'chronicAbsenteeismRate' as const, comparator: 'above' as const, threshold: 10 }
  assert.equal(matches(above, groupBag({ chronicAbsenteeismRate: 10.1 })), true)
  assert.equal(matches(above, groupBag({ chronicAbsenteeismRate: 10 })), false)

  const below = { metric: 'attendanceRate' as const, comparator: 'below' as const, threshold: 90 }
  assert.equal(matches(below, studentBag({ attendanceRate: 89.9 })), true)
  assert.equal(matches(below, studentBag({ attendanceRate: 90 })), false)
})

test('between is half-open, so a boundary value belongs to one band', () => {
  const band = {
    metric: 'schoolAttendanceRate' as const,
    comparator: 'between' as const,
    threshold: 90,
    upperThreshold: 95,
  }
  assert.equal(matches(band, groupBag({ schoolAttendanceRate: 93.4 })), true, 'this district')
  assert.equal(matches(band, groupBag({ schoolAttendanceRate: 90 })), true, 'lower bound is in')
  assert.equal(matches(band, groupBag({ schoolAttendanceRate: 95 })), false, 'upper bound is out')
  assert.equal(matches(band, groupBag({ schoolAttendanceRate: 89.9 })), false)

  // The pairing that motivated half-open bounds: a band and an `above` claim on
  // the same metric must not both own 95.
  const above = { metric: 'schoolAttendanceRate' as const, comparator: 'above' as const, threshold: 95 }
  const at95 = groupBag({ schoolAttendanceRate: 95 })
  assert.equal(matches(band, at95) && matches(above, at95), false)
})

test('a between trigger with no upper bound is not a trigger', () => {
  const half = citation('cite-half', {
    metric: 'schoolAttendanceRate',
    comparator: 'between',
    threshold: 90,
  })
  assert.equal(triggerOf(half), null)
})

test('flags are written as equals 1 and read from booleans', () => {
  const flag = { metric: 'hasActiveIEP' as const, comparator: 'equals' as const, threshold: 1 }
  assert.equal(matches(flag, studentBag({ hasActiveIEP: true })), true)
  assert.equal(matches(flag, studentBag({ hasActiveIEP: false })), false)
})

test('an absent metric triggers nothing', () => {
  const condition = { metric: 'attendanceRate' as const, comparator: 'below' as const, threshold: 90 }
  assert.equal(matches(condition, studentBag({})), false)
  assert.equal(matches(condition, studentBag({ attendanceRate: null })), false)
})

test('an unknown metric name makes a citation inert rather than throwing', () => {
  const unknown = citation('cite-unknown', {
    metric: 'notAMetricWeDeclare',
    comparator: 'below',
    threshold: 50,
  })
  assert.equal(triggerOf(unknown), null)
  assert.deepEqual(selectCitations([unknown], studentBag({}), 'teacher'), [])
})

// --- Scale -------------------------------------------------------------------

test('a claim about one student does not fire on a group, or the reverse', () => {
  // The Phase 5 defect, as an assertion. A district's 93.4% average attendance
  // is not "a student who attends 93.4% of the time", and a claim about missing
  // a tenth of the year must not read it as one.
  const individual = citation('cite-individual', {
    metric: 'attendanceRate',
    comparator: 'below',
    threshold: 90,
  })
  assert.deepEqual(
    selectCitations([individual], groupBag({ attendanceRate: 80 }), 'teacher'),
    [],
    'a group bag cannot satisfy an individual-scale metric even when the number is there',
  )

  const collective = citation('cite-collective', {
    metric: 'chronicAbsenteeismRate',
    comparator: 'above',
    threshold: 10,
  })
  assert.deepEqual(
    selectCitations([collective], studentBag({ chronicAbsenteeismRate: 40 }), 'teacher'),
    [],
  )
})

test('either-scale metrics fire at both scales', () => {
  const both = citation('cite-both', {
    metric: 'standardsWithoutEvidenceShare',
    comparator: 'above',
    threshold: 20,
  })
  assert.equal(selectCitations([both], groupBag({ standardsWithoutEvidenceShare: 30 }), 'teacher').length, 1)
  assert.equal(selectCitations([both], studentBag({ standardsWithoutEvidenceShare: 30 }), 'teacher').length, 1)
})

// --- Derived metrics ---------------------------------------------------------

test('referrals per 100 students is null rather than zero when the group size is unknown', () => {
  assert.equal(referralsPer100({ disciplineReferrals: 558, studentCount: 1102 })?.toFixed(1), '50.6')
  assert.equal(referralsPer100({ disciplineReferrals: 558 }), null)
  assert.equal(referralsPer100({ disciplineReferrals: 558, studentCount: 0 }), null)
  assert.equal(referralsPer100({ studentCount: 1102 }), null)
})

test('the evidence share reads either shape of the same fact', () => {
  const fromCounts = withoutEvidenceShare({
    evidenceStrengthCounts: { none: 12116, insubstantial: 11116, moderate: 12900, substantial: 4199 },
  })
  assert.equal(fromCounts?.toFixed(1), '30.0')

  const fromSummary = withoutEvidenceShare({ standardsTaughtToDate: 40, standardsWithNoEvidence: 10 })
  assert.equal(fromSummary, 25)

  assert.equal(withoutEvidenceShare({ standardsTaughtToDate: 0, standardsWithNoEvidence: 0 }), null)
  assert.equal(withoutEvidenceShare({}), null)
})

// --- Coverage states ---------------------------------------------------------

test('the three empty states are distinguishable', () => {
  const tagged = citation('cite-tagged', {
    metric: 'chronicAbsenteeismRate',
    comparator: 'above',
    threshold: 10,
  }, ['teacher'])

  assert.equal(coverageOf([tagged], groupBag({ chronicAbsenteeismRate: 14.9 }), 'teacher').state, 'shown')
  assert.equal(coverageOf([tagged], groupBag({ chronicAbsenteeismRate: 4 }), 'teacher').state, 'quiet')
  assert.equal(coverageOf([tagged], groupBag({ chronicAbsenteeismRate: 14.9 }), 'nurse').state, 'untagged')
})

test('coverage counts what was considered, not only what fired', () => {
  const one = citation('cite-a', { metric: 'chronicAbsenteeismRate', comparator: 'above', threshold: 10 })
  const two = citation('cite-b', { metric: 'schoolAttendanceRate', comparator: 'above', threshold: 95 })
  const coverage = coverageOf([one, two], groupBag({ chronicAbsenteeismRate: 14.9, schoolAttendanceRate: 93.4 }), 'teacher')
  assert.equal(coverage.tagged, 2)
  assert.equal(coverage.firing.length, 1)
})

// --- The shipped library -----------------------------------------------------

const LIBRARY: ResearchCitation[] = JSON.parse(
  readFileSync(
    join(import.meta.dirname, '..', '..', '..', 'data', 'reference', 'research-citations.json'),
    'utf8',
  ),
).citations

/** Every metric name a view can actually hand over, and at which scale. */
const SUPPLIED = {
  group: new Set(Object.keys(groupMetrics({}).values)),
  student: new Set(Object.keys(studentMetrics({}).values)),
}

test('every shipped claim names a metric the app declares', () => {
  for (const entry of LIBRARY) {
    const condition = triggerOf(entry)
    assert.ok(
      condition,
      `${entry.id} has no trigger this build can act on — it would never appear anywhere`,
    )
  }
})

test('every shipped claim triggers on a metric some view supplies', () => {
  // The contract that was missing. Six of twelve citations named a metric no
  // view ever handed over; they were spelled correctly, meant something real,
  // and were dead. A string lookup cannot tell a typo from an unimplemented
  // metric, so this does it instead.
  for (const entry of LIBRARY) {
    const condition = triggerOf(entry)!
    const scale = METRICS[condition.metric].scale
    const scales: ('group' | 'student')[] = scale === 'either' ? ['group', 'student'] : [scale]
    for (const each of scales) {
      assert.ok(
        SUPPLIED[each].has(condition.metric),
        `${entry.id} triggers on ${condition.metric}, which no ${each}-scale view supplies`,
      )
    }
  }
})

test('counts do not travel: a count threshold is only ever about one student', () => {
  // `disciplineReferralCount > 3` was written about a child and fired on 558
  // district referrals, which is how a school board came to have exactly one
  // piece of research context. A threshold over a count is a threshold over the
  // size of the thing counted.
  for (const [name, spec] of Object.entries(METRICS)) {
    if (spec.unit === 'count') {
      assert.equal(spec.scale, 'student', `${name} is a count and must not be a group metric`)
    }
  }
})

test('the library speaks to every role', () => {
  const untagged = ROLE_ORDER.filter(
    (role: Role) => !LIBRARY.some((entry) => entry.applicableRoles?.includes(role)),
  )
  assert.deepEqual(
    untagged,
    [],
    'a role with no claim tagged for it gets no research context on any page, ever',
  )
})

test('every claim reaches at least one role', () => {
  for (const entry of LIBRARY) {
    assert.ok(
      (entry.applicableRoles?.length ?? 0) > 0,
      `${entry.id} is tagged for nobody and cannot be shown`,
    )
  }
})

test('every claim carries a confidence note and a review record', () => {
  for (const entry of LIBRARY) {
    assert.ok(entry.confidenceNote.length > 0, `${entry.id} has no confidence note`)
    assert.ok(
      Object.keys(REVIEW_LABELS).includes(entry.review.status),
      `${entry.id} has an unrecognised review status`,
    )
  }
})

test('the stored review status agrees with the two records it is derived from', () => {
  // The generator writes `status` next to `sourceCheck` and `signOff` so the
  // dataset can be read without running code, which makes it a third field that
  // can drift. This is the same contract as the metric vocabulary and it exists
  // for the same reason: the Python that writes it and the TypeScript that reads
  // it are edited at different times by different people.
  for (const entry of LIBRARY) {
    assert.equal(
      entry.review.status,
      deriveReviewStatus(entry.review),
      `${entry.id}: stored status disagrees with its sourceCheck and signOff`,
    )
  }
})

test('a source check cannot verify a claim, however thorough', () => {
  // The load-bearing rule of the review layer. `verified` is reachable only
  // through a named person's sign-off, so a claim whose source checks out
  // perfectly is still unverified and still renders with its marker. If this
  // ever fails, the marker has stopped meaning anything and the product is
  // asserting educational research on the strength of somebody reading a URL.
  const clean: ResearchCitation['review'] = {
    status: 'source_checked',
    sourceCheck: {
      checkedOn: '2026-08-18',
      checkedBy: 'a careful reader',
      sourceReachable: true,
      recordAccurate: true,
      support: 'supported',
      finding: 'The source says exactly this.',
      defects: [],
    },
    signOff: null,
  }

  assert.equal(deriveReviewStatus(clean), 'source_checked')
  assert.ok(isUnverified({ ...citation('cite-x', undefined), review: clean }))
})

test('nothing in the shipped library is signed off', () => {
  // Not a style assertion. Every claim in this library is shown to stakeholders
  // today, and the flag is the only thing standing between a synthetic prototype
  // and a product asserting educational research to a school board. The day a
  // real reviewer signs something, this test is the one that has to be
  // deliberately changed, by somebody who has read why it is here.
  for (const entry of LIBRARY) {
    assert.equal(entry.review.signOff, null, `${entry.id} carries a sign-off`)
    assert.ok(isUnverified(entry), `${entry.id} renders without its unverified marker`)
  }
})

test('a claim added without a review record reports as unreviewed, not as clean', () => {
  // The failure this replaces: eighteen identical `needs_human_review` flags
  // written by hand, indistinguishable from a review that had happened and found
  // nothing wrong. Absence of a check is now its own state.
  assert.equal(
    deriveReviewStatus({ status: 'unreviewed', sourceCheck: null, signOff: null }),
    'unreviewed',
  )
})

test('a source check that found something wrong reports revision required', () => {
  const base: NonNullable<ResearchCitation['review']['sourceCheck']> = {
    checkedOn: '2026-08-18',
    checkedBy: 'a careful reader',
    sourceReachable: true,
    recordAccurate: true,
    support: 'supported',
    finding: 'Fine.',
    defects: [],
  }
  const cases: NonNullable<ResearchCitation['review']['sourceCheck']>[] = [
    { ...base, sourceReachable: false },
    { ...base, recordAccurate: false },
    { ...base, support: 'partial' },
    { ...base, support: 'unsupported' },
  ]
  for (const sourceCheck of cases) {
    assert.equal(
      deriveReviewStatus({ status: 'revision_required', sourceCheck, signOff: null }),
      'revision_required',
    )
  }
})

test('the shipped library records what the first source check found', () => {
  // Phase 7's result, pinned. Sixteen claims need rewriting and two are checked
  // clean; if a later edit changes those counts, it should be because somebody
  // fixed a claim, and this line is where they say so.
  const needing = LIBRARY.filter((entry) => entry.review.status === 'revision_required')
  const checked = LIBRARY.filter((entry) => entry.review.status === 'source_checked')
  assert.equal(needing.length + checked.length, LIBRARY.length)
  assert.ok(
    checked.length > 0,
    'no claim survived the source check; the library would have nothing to sign',
  )

  for (const entry of LIBRARY) {
    const check = entry.review.sourceCheck
    assert.ok(check, `${entry.id} has no source check`)
    assert.ok(check.finding.length > 0, `${entry.id} records a verdict with no finding`)
    assert.ok(check.checkedBy.length > 0, `${entry.id} was checked by nobody`)
    if (entry.review.status === 'revision_required') {
      assert.ok(
        check.defects.length > 0,
        `${entry.id} needs revision and does not say what is wrong with it`,
      )
    }
  }
})

test('every shipped trigger renders as a sentence', () => {
  // `/research` prints these, and a trigger the describer cannot phrase is one a
  // reader cannot audit.
  for (const entry of LIBRARY) {
    const sentence = describeTrigger(triggerOf(entry)!)
    assert.match(sentence, /^Shown when .+\.$/, `${entry.id}: ${sentence}`)
  }
})

test('the public and the board are no longer silent on this district', () => {
  // The Phase 5 brief, as an assertion. Both roles read the same district
  // figures; before this phase one got nothing and the other got one claim off a
  // broken threshold.
  const district = groupMetrics({
    attendanceRate: 93.4,
    chronicAbsenteeismRate: 14.9,
    homeworkCompletionRate: 72.2,
    masteryRate: 39.4,
    disciplineReferrals: 558,
    studentCount: 1102,
    evidenceStrengthCounts: { none: 12116, insubstantial: 11116, moderate: 12900, substantial: 4199 },
    masterySpreadPoints: 10.3,
  })

  for (const role of ['community_member', 'school_board_member'] as Role[]) {
    const coverage = coverageOf(LIBRARY, district, role)
    assert.equal(coverage.state, 'shown', `${role} sees no research context on the district page`)
    assert.ok(coverage.firing.length >= 2, `${role} sees only ${coverage.firing.length} claim`)
  }
})

test('a claim keyed to one student is reported as unexercised, not as failing', () => {
  const individual = LIBRARY.find((entry) => triggerOf(entry)?.metric === 'attendanceRate')
  assert.ok(individual, 'expected at least one individual-scale attendance claim')
  assert.equal(exercisableAt(individual, 'group'), false)
  assert.equal(exercisableAt(individual, 'student'), true)
})
