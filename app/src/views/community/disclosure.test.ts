/**
 * The disclosure rules are the one part of Supernova whose correctness cannot be
 * checked by looking at the page, because on this dataset the interesting branch
 * never fires: the smallest published cell holds 59 students against a threshold
 * of ten, so nothing is suppressed and the screen looks identical whether the
 * rule works or not. That is exactly the condition under which a rule quietly
 * rots. These exercise it against districts the generator does not produce.
 *
 * Run with `npm --prefix app test`. No test framework — `node --test` and Node's
 * own type stripping, so this adds no dependency to a project that has none.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Aggregates } from '../../types/profile.ts'
import {
  discloseCells,
  gradeDimensionNamesBuildings,
  gradesIdentifyingOneBuilding,
  ruleFor,
} from './disclosure.ts'

/** Only the fields the rules read; the rest of an AggregateCell is irrelevant here. */
function cell(studentCount: number, threshold = 10) {
  return { studentCount, suppressForPublicDisplay: studentCount < threshold }
}

function grade(schoolId: string, gradeLevel: string, studentCount = 60) {
  return { ...cell(studentCount), schoolId, gradeLevel } as unknown as Aggregates['grades'][number]
}

// --- Small-cell suppression --------------------------------------------------

test('publishes every cell when none is below the threshold', () => {
  const disclosed = discloseCells([cell(59), cell(108), cell(60)], { totalIsPublished: true })
  assert.deepEqual(
    disclosed.map((entry) => entry.suppressed),
    [null, null, null],
  )
})

test('suppresses a cell below the threshold', () => {
  const disclosed = discloseCells([cell(4), cell(108), cell(60)], { totalIsPublished: false })
  assert.equal(disclosed[0].suppressed, 'below_threshold')
})

test('a lone suppression against a published total takes the smallest cell with it', () => {
  // Without this, a reader recovers the withheld cell by subtracting the two
  // published ones from the district total. Hiding a subtractable number is not
  // privacy.
  const disclosed = discloseCells([cell(4), cell(108), cell(60)], { totalIsPublished: true })
  assert.deepEqual(
    disclosed.map((entry) => entry.suppressed),
    ['below_threshold', null, 'complementary'],
    'the 60-student cell is the smallest remaining and is withheld alongside the 4',
  )
})

test('two suppressions need no complement — neither is recoverable', () => {
  const disclosed = discloseCells([cell(4), cell(7), cell(108), cell(60)], {
    totalIsPublished: true,
  })
  assert.deepEqual(
    disclosed.map((entry) => entry.suppressed),
    ['below_threshold', 'below_threshold', null, null],
  )
})

test('an unpublished total needs no complement — there is nothing to subtract from', () => {
  const disclosed = discloseCells([cell(4), cell(108), cell(60)], { totalIsPublished: false })
  assert.deepEqual(
    disclosed.map((entry) => entry.suppressed),
    ['below_threshold', null, null],
  )
})

test('a single cell below the threshold is suppressed without a complement to find', () => {
  const disclosed = discloseCells([cell(4)], { totalIsPublished: true })
  assert.deepEqual(
    disclosed.map((entry) => entry.suppressed),
    ['below_threshold'],
  )
})

// --- Re-identification through the grade dimension ---------------------------

test('this district: every grade sits in exactly one building', () => {
  const grades = [
    ...['K', '1', '2', '3', '4', '5'].map((level) => grade('nova-elementary', level)),
    ...['6', '7', '8'].map((level) => grade('meridian-middle', level)),
    ...['9', '10', '11', '12'].map((level) => grade('constellation-high', level)),
  ]
  assert.equal(gradeDimensionNamesBuildings(grades), true)
  assert.equal(gradesIdentifyingOneBuilding(grades).length, 13)
})

test('two buildings sharing a grade range: that grade names neither', () => {
  const grades = [
    grade('nova-elementary', '3'),
    grade('orion-elementary', '3'),
    grade('meridian-middle', '7'),
  ]
  assert.equal(gradeDimensionNamesBuildings(grades), false)
  assert.deepEqual(gradesIdentifyingOneBuilding(grades), ['7'])
})

test('grades sort naturally rather than as strings', () => {
  const grades = ['2', '10', '1'].map((level) => grade('nova-elementary', level))
  assert.deepEqual(gradesIdentifyingOneBuilding(grades), ['1', '2', '10'])
})

// --- Audience ----------------------------------------------------------------

test('a board member may not name a building; a community member may', () => {
  assert.equal(ruleFor('school_board_member').namesBuildings, false)
  assert.equal(ruleFor('community_member').namesBuildings, true)
})
