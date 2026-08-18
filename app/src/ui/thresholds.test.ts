/**
 * What this district's own data does to the trigger thresholds.
 *
 * `research.test.ts` asserts the *contract* between the library and the app: that
 * every claim names a declared metric, that some view supplies it at the scale
 * the claim needs, and that every role is spoken to. All eighteen claims pass
 * that and five of them are still useless on screen, because the contract cannot
 * see the one thing that decides whether a claim is context or wallpaper — the
 * number in `threshold`, measured against the figures it will actually meet.
 *
 * A trigger that fires on every cell in a population is not a trigger. It is a
 * page footer with a footnote, and it reads to a stakeholder exactly like a
 * finding about the page they are on. A trigger that fires on none is the Phase 5
 * failure again in a subtler form: not a metric nobody supplies, but a metric
 * everybody supplies and nobody crosses. Both render identically to a threshold
 * that is doing its job, which is to say the failure is invisible, which is why
 * it is worth a test.
 *
 * ## Why the source review could not have caught this
 *
 * Phase 7 opened all eighteen sources and revised sixteen claims. It could not
 * have touched a single number in here, and not for want of thoroughness: a
 * trigger carries no authority from the source by construction. "Above 25
 * referrals per 100 students" is not a rate the Center on PBIS identifies as
 * high — it is an editorial judgement made in this repository by reading this
 * district's figures and picking something that fired. Signing the claim would
 * not cover it either; `research.ts` says so and there is a test asserting it.
 *
 * So this is the other kind of check, and it is the kind a computer can do: not
 * *is this number right*, which needs somebody with standing, but *does this
 * number distinguish anything at all in the data it is applied to*. A threshold
 * can be defensible and still fail this. A threshold cannot pass this and be
 * doing nothing.
 *
 * ## What it measures over
 *
 * Only the populations the app really builds a `MetricBag` for — 1,102 student
 * profiles, 252 classrooms, 72 teacher rollups, 3 buildings, the district. Grades
 * are not in here: they are broken out in tables on three pages and no view ever
 * hands one to the research layer, so a grade is not a place a claim can fire.
 *
 * Two deliberate departures from what a view would hand over:
 *
 *   - **Bags are built unmasked.** A view nulls out what the account may not see,
 *     so the same student fires four claims for a guardian and six for a teacher.
 *     Masking only ever removes firings, and the question here is whether the
 *     threshold divides the district — not whether a particular reader is
 *     entitled to know that it did.
 *   - **Sections and teachers are measured year-to-date.** `SectionView` rescopes
 *     mastery and homework to the selected unit, so a unit view moves these
 *     numbers around. The year is the shape the page opens on for a
 *     self-contained class and the honest single figure for the rest.
 *
 * The rollups below mirror `TeacherView`, `SchoolView`, `DistrictView` and
 * `StudentView`. That mirroring is this file's real weakness and it is worth
 * naming: a view could change how it rolls a figure up and this test would go on
 * measuring the old shape. It is bounded by what the mirror is for — these are
 * questions about the distribution of the district's figures, not about whether a
 * component reads them correctly, and the contract tests next door already cover
 * the second.
 *
 * Run with `npm --prefix app test`. Reads about 110MB of JSON, which costs a
 * couple of hundred milliseconds and is the reason this is a separate file.
 */

import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import type { CurriculumUnit } from '../types/supernova.ts'
import type {
  Aggregates,
  SectionContext,
  SectionsContext,
  StudentProfile,
} from '../types/profile.ts'
import {
  METRICS,
  groupMetrics,
  matches,
  studentMetrics,
  triggerOf,
  type MetricBag,
  type TriggerCondition,
} from './research.ts'
import type { ResearchCitation } from '../types/supernova.ts'

// --- The shipped dataset ------------------------------------------------------

const DATA = join(import.meta.dirname, '..', '..', '..', 'data')
const read = <T,>(...parts: string[]): T => JSON.parse(readFileSync(join(DATA, ...parts), 'utf8'))

const LIBRARY: ResearchCitation[] = read<{ citations: ResearchCitation[] }>(
  'reference',
  'research-citations.json',
).citations
const AGGREGATES = read<Aggregates>('aggregates', 'current-year.json')
const SECTIONS = read<SectionsContext>('aggregates', 'sections-context.json').sections
const UNITS = read<CurriculumUnit[]>('district', 'curriculum-units.json')
const YEAR = AGGREGATES.schoolYear

function profiles(): StudentProfile[] {
  const root = join(DATA, 'students')
  const out: StudentProfile[] = []
  for (const school of readdirSync(root)) {
    for (const file of readdirSync(join(root, school))) {
      // The companion file holds the artifacts and none of the figures.
      if (file.endsWith('.evidence.json')) continue
      out.push(JSON.parse(readFileSync(join(root, school, file), 'utf8')))
    }
  }
  return out
}

/** `spreadOf(...).range` from `views/admin/compare.ts`, which a `.tsx` chain keeps out of reach here. */
function range(values: number[]): number {
  return values.length > 0 ? Math.max(...values) - Math.min(...values) : 0
}

function weighted(pairs: [number | null, number][]): number | null {
  let total = 0
  let weight = 0
  for (const [value, count] of pairs) {
    if (value === null) continue
    total += value * count
    weight += count
  }
  return weight > 0 ? total / weight : null
}

// --- The populations a claim can fire on --------------------------------------

type PopulationName = 'student' | 'section' | 'teacher' | 'building' | 'district'

/** Key instruction dates by section, so an absence can be read against what was taught. */
const KEY_DATES = new Map<string, Set<string>>()
for (const unit of UNITS) {
  if (unit.schoolYear !== YEAR) continue
  const dates = KEY_DATES.get(unit.sectionId) ?? new Set<string>()
  for (const entry of unit.keyInstructionDates ?? []) dates.add(entry.date)
  KEY_DATES.set(unit.sectionId, dates)
}

/** Mirrors `StudentView`, minus the permission masking. */
function studentPopulation(): MetricBag[] {
  return profiles().flatMap((profile) => {
    const year = profile.years[YEAR]
    if (!year) return []

    // A prior year with no mastery records is a year spent somewhere else, and
    // its summary reads 0.0%. `StudentView` withholds it rather than firing the
    // prerequisite claim on every transfer in the district, so this does too —
    // without it the measurement below would be of the generator, not the rule.
    const previous = profile.schoolYears[profile.schoolYears.indexOf(YEAR) - 1]
    const prior = previous ? profile.years[previous] : undefined
    const priorYearMasteryRate =
      prior && prior.mastery.length > 0 ? prior.summary.masteryRate : null

    const keyDates = new Set<string>()
    for (const id of year.sectionIds) {
      for (const date of KEY_DATES.get(id) ?? []) keyDates.add(date)
    }

    return [
      studentMetrics({
        attendanceRate: year.summary.attendanceRate,
        homeworkCompletionRate: year.summary.homeworkCompletionRate,
        masteryRate: year.mastery.length > 0 ? year.summary.masteryRate : null,
        priorYearMasteryRate,
        disciplineReferralCount: year.summary.disciplineReferralCount,
        suspensionCount: year.behavior.incidents.filter(
          (incident) => incident.incidentType === 'suspension',
        ).length,
        missedKeyInstructionDays: year.attendance.attendanceExceptions.filter(
          (entry) => entry.status.endsWith('absent') && keyDates.has(entry.date),
        ).length,
        responseRate: year.familyEngagement.metrics.responseRate,
        standardsTaughtToDate: year.summary.standardsTaughtToDate,
        standardsWithNoEvidence: year.summary.standardsWithNoEvidence,
        hasActiveIEP: Boolean(year.specialServices?.iepStatus),
        hasIncompletePriorHistory: (profile.student.metadata?.qualityFlags ?? []).includes(
          'transferred_from_outside_district',
        ),
      }),
    ]
  })
}

/** Mirrors `SectionView` at year-to-date scope. */
function sectionPopulation(): MetricBag[] {
  return SECTIONS.map((section) =>
    groupMetrics({
      ...section,
      totalMinutesLost: section.interruptions.totalMinutesLost,
    }),
  )
}

/** Mirrors `TeacherView`: one bag per teacher, over the sections they hold. */
function teacherPopulation(): MetricBag[] {
  const held = new Map<string, SectionContext[]>()
  for (const section of SECTIONS) {
    held.set(section.teacherId, [...(held.get(section.teacherId) ?? []), section])
  }

  return [...held.values()].map((sections) => {
    // Over standards rather than by averaging rates, because a section teaching
    // 90 standards and one teaching 20 should not count equally.
    const taught = sections.reduce((total, s) => total + s.standardsTaughtToDate, 0)
    const mastered = sections.reduce((total, s) => total + s.standardsMastered, 0)
    const evidence = sections.reduce<Record<string, number>>((totals, section) => {
      for (const [strength, count] of Object.entries(section.evidenceStrengthCounts)) {
        totals[strength] = (totals[strength] ?? 0) + (count ?? 0)
      }
      return totals
    }, {})

    return groupMetrics({
      attendanceRate: weighted(sections.map((s) => [s.attendanceRate, s.studentCount])),
      chronicAbsenteeismRate: weighted(
        sections.map((s) => [s.chronicAbsenteeismRate, s.studentCount]),
      ),
      homeworkCompletionRate: weighted(
        sections.map((s) => [s.homeworkCompletionRate, s.studentCount]),
      ),
      masteryRate: taught > 0 ? (100 * mastered) / taught : null,
      standardsTaughtToDate: taught,
      studentCount: sections.reduce((total, s) => total + s.studentCount, 0),
      disciplineReferrals: sections.reduce((total, s) => total + s.disciplineReferrals, 0),
      evidenceStrengthCounts: evidence,
      totalMinutesLost: sections.reduce(
        (total, s) => total + s.interruptions.totalMinutesLost,
        0,
      ),
      masterySpreadPoints: range(sections.map((s) => s.masteryRate)),
    })
  })
}

/** Mirrors `SchoolView`, whose spread is the widest breakdown the page draws. */
function buildingPopulation(): MetricBag[] {
  return AGGREGATES.schools.map((building) =>
    groupMetrics({
      ...building,
      masterySpreadPoints: Math.max(
        range(
          AGGREGATES.grades
            .filter((grade) => grade.schoolId === building.schoolId)
            .map((grade) => grade.masteryRate),
        ),
        range(
          SECTIONS.filter((section) => section.schoolId === building.schoolId).map(
            (section) => section.masteryRate,
          ),
        ),
      ),
    }),
  )
}

/** Mirrors `DistrictView`. `CommunityView` and `ResearchView` build the same cell. */
function districtPopulation(): MetricBag[] {
  return [
    groupMetrics({
      ...AGGREGATES.district,
      masterySpreadPoints: Math.max(
        range(AGGREGATES.schools.map((school) => school.masteryRate)),
        range(AGGREGATES.grades.map((grade) => grade.masteryRate)),
        range(SECTIONS.map((section) => section.masteryRate)),
      ),
    }),
  ]
}

const POPULATIONS: Record<PopulationName, MetricBag[]> = {
  student: studentPopulation(),
  section: sectionPopulation(),
  teacher: teacherPopulation(),
  building: buildingPopulation(),
  district: districtPopulation(),
}

// --- Measuring ----------------------------------------------------------------

interface Rate {
  /** Cells that carry a value for this metric at all. A null is not a non-firing. */
  supplied: number
  fired: number
}

function rateOf(condition: TriggerCondition, bags: MetricBag[]): Rate {
  const spec = METRICS[condition.metric]
  let supplied = 0
  let fired = 0
  for (const bag of bags) {
    if (spec.scale !== 'either' && spec.scale !== bag.scale) continue
    const value = bag.values[condition.metric]
    if (value === null || value === undefined) continue
    supplied += 1
    if (matches(condition, bag)) fired += 1
  }
  return { supplied, fired }
}

/**
 * The smallest population worth drawing a conclusion from.
 *
 * Three buildings and one district are the whole district — "fires on all of
 * them" is a fact about a sample of three, not evidence that a threshold cannot
 * discriminate. So calibration is judged on students, classrooms and teachers,
 * and the two small populations are measured and reported but never asserted on.
 */
const MIN_CELLS = 20

/**
 * The band, and it is a judgement rather than a finding.
 *
 * Below the floor a claim is effectively absent from the product: it is carried,
 * tagged, sourced, checked, and a reader will not meet it. Above the ceiling it
 * is on every page the reader opens and stops being about the page. Neither bound
 * says the number is *wrong* — a threshold at the floor may be picking out
 * exactly the rare thing it should. They say the number has stopped dividing this
 * district into two groups, which is the only job a trigger has.
 */
const FLOOR = 2
const CEILING = 95

interface Measurement {
  key: string
  id: string
  population: PopulationName
  rate: Rate
  percent: number
}

/** Every (claim, population) pair with enough cells to judge. */
function measurements(): Measurement[] {
  const out: Measurement[] = []
  for (const citation of LIBRARY) {
    const condition = triggerOf(citation)
    if (!condition) continue
    for (const [population, bags] of Object.entries(POPULATIONS) as [
      PopulationName,
      MetricBag[],
    ][]) {
      const rate = rateOf(condition, bags)
      if (rate.supplied < MIN_CELLS) continue
      out.push({
        key: `${citation.id}@${population}`,
        id: citation.id,
        population,
        rate,
        percent: (100 * rate.fired) / rate.supplied,
      })
    }
  }
  return out
}

const MEASURED = measurements()

// --- What this district does not exercise -------------------------------------

/**
 * The thresholds this dataset does not divide, with the measurement that says so.
 *
 * This is a to-do list somebody has to look at, not a set of exceptions granted.
 * Every entry is a claim that a reader meets on effectively every page or on
 * effectively none, and each needs the review nobody has done — which is a
 * different review from the one Phase 7 performed, by different people, and no
 * amount of source-reading produces it.
 *
 * The recorded counts are asserted, not decorative. Generation is deterministic,
 * so these numbers move only when the generator changes or somebody edits a
 * threshold — and both are moments when this list should be read again. An entry
 * that has come back inside the band fails as loudly as one that has left it,
 * because a stale exemption is how a fixed problem goes on looking unfixed and an
 * unfixed one goes on looking known.
 */
interface Uncalibrated {
  supplied: number
  fired: number
  why: string
}

const UNCALIBRATED: Record<string, Uncalibrated> = {
  'cite-interruptions-01@section': {
    supplied: 252,
    fired: 252,
    why:
      'Above 120 minutes lost, against a district whose quietest classroom lost 173 and ' +
      'whose median lost 472. The threshold sits below the floor of the distribution, so ' +
      'it cannot be off. A share of instructional time, rather than a raw total over a ' +
      'year, is the quantity that would survive the change of scale — the same fix Phase 5 ' +
      'made to the referral count.',
  },
  'cite-interruptions-01@teacher': {
    supplied: 72,
    fired: 72,
    why: 'The same threshold summed over a teacher’s sections, so further above it again.',
  },
  'cite-evidence-01@teacher': {
    supplied: 72,
    fired: 72,
    why:
      'Above 20% of standards taught carrying no evidence. Every teacher in the district is ' +
      'above it and the median classroom is at 30.6%. It also stands in a pair: ' +
      'cite-mastery-01 is the same metric above 25, so the stricter claim cannot fire ' +
      'without this one, and the panel shows three.',
  },
  'cite-attendance-05@teacher': {
    supplied: 72,
    fired: 71,
    why:
      'Attendance between 90 and 95, against a district where every building, every ' +
      'grade and 71 of 72 teachers sit inside the band. It reads as a finding about a ' +
      'page and is a description of the whole district.',
  },
  'cite-behavior-02@teacher': {
    supplied: 72,
    fired: 71,
    why:
      'Above 25 referrals per 100 students, against a district averaging 50.6 and a ' +
      'classroom median of 45. This is the example /research itself uses to explain that a ' +
      'trigger is an editorial judgement, and it is one that almost never turns off.',
  },
  'cite-evidence-01@section': {
    supplied: 252,
    fired: 245,
    why: 'The same claim one level down, and only seven classrooms in the district fall under it.',
  },
  'cite-attendance-03@teacher': {
    supplied: 72,
    fired: 1,
    why:
      'The far end, and the only claim in the library framed as something going well. ' +
      'Attendance above 95 is reached by one teacher and no building — and its audience is ' +
      'the board and the community, who read district figures and so will never meet it at ' +
      'all. It fires on 29 of 252 classroom pages, which only an administrator opens.',
  },
}

// --- The population itself ----------------------------------------------------

test('the populations are the ones this district actually has', () => {
  // Pinned because every rate below is a fraction of these, and a dataset that
  // quietly changed shape would move every number in this file at once.
  assert.equal(POPULATIONS.student.length, 1102)
  assert.equal(POPULATIONS.section.length, 252)
  assert.equal(POPULATIONS.teacher.length, 72)
  assert.equal(POPULATIONS.building.length, 3)
  assert.equal(POPULATIONS.district.length, 1)
})

test('every trigger is exercised by real figures somewhere', () => {
  // Stronger than the contract next door, which asks whether a builder names the
  // metric. This asks whether any cell in the district carries a value for it —
  // a metric a builder names and every real record leaves null is supplied in
  // name only.
  for (const citation of LIBRARY) {
    const condition = triggerOf(citation)
    assert.ok(condition, `${citation.id} has no trigger`)
    const supplied = Object.values(POPULATIONS).reduce(
      (total, bags) => total + rateOf(condition, bags).supplied,
      0,
    )
    assert.ok(
      supplied > 0,
      `${citation.id} triggers on ${condition.metric}, which no cell in this district carries a value for`,
    )
  }
})

// --- Calibration --------------------------------------------------------------

test('no trigger is dead: every claim fires somewhere in this district', () => {
  // The Phase 5 failure in the form the contract cannot see. Half the library
  // then named metrics nobody supplied; a threshold nobody crosses is the same
  // silence reached by a different route, and renders the same way — as nothing.
  for (const citation of LIBRARY) {
    const condition = triggerOf(citation)!
    const fired = Object.values(POPULATIONS).reduce(
      (total, bags) => total + rateOf(condition, bags).fired,
      0,
    )
    assert.ok(
      fired > 0,
      `${citation.id} fires on no student, classroom, teacher, building or district in the shipped dataset`,
    )
  }
})

test('a trigger divides this district rather than describing it', () => {
  // The assertion this file exists for. Everything outside the band is in
  // UNCALIBRATED with its measurement written down, so this fails for something
  // new rather than for something known — and a claim added tomorrow with a
  // threshold picked the way these were gets caught on the way in.
  const offBand = MEASURED.filter(
    (entry) => entry.percent < FLOOR || entry.percent > CEILING,
  ).filter((entry) => !(entry.key in UNCALIBRATED))

  assert.deepEqual(
    offBand.map((entry) => `${entry.key} ${entry.rate.fired}/${entry.rate.supplied} (${entry.percent.toFixed(1)}%)`),
    [],
    `these thresholds do not divide the population they are read against — fix the threshold, or record it in UNCALIBRATED with the reason`,
  )
})

test('the uncalibrated list is not stale', () => {
  // A list of known problems is only worth keeping if it cannot quietly stop
  // describing the thing it names. Both directions fail: an entry that has come
  // back inside the band, and one whose measurement has moved.
  for (const [key, expected] of Object.entries(UNCALIBRATED)) {
    const entry = MEASURED.find((measurement) => measurement.key === key)
    assert.ok(entry, `UNCALIBRATED names ${key}, which is no longer measured — delete it`)
    assert.deepEqual(
      { supplied: entry.rate.supplied, fired: entry.rate.fired },
      { supplied: expected.supplied, fired: expected.fired },
      `${key}: the measurement has moved. Re-read the entry, then update or delete it`,
    )
    assert.ok(
      entry.percent < FLOOR || entry.percent > CEILING,
      `${key} now fires on ${entry.percent.toFixed(1)}% and is inside the band — delete its UNCALIBRATED entry`,
    )
    assert.ok(expected.why.length > 0, `${key} is recorded without a reason`)
  }
})

test('two claims do not share one trigger', () => {
  // Identical triggers fire as a pair, always, on the same figure — two claims
  // spending two of the three slots the panel has, with no second fact between
  // them. The homework pair below is the one in the shipped library.
  const seen = new Map<string, string[]>()
  for (const citation of LIBRARY) {
    const condition = triggerOf(citation)
    if (!condition) continue
    const shape = JSON.stringify([
      condition.metric,
      condition.comparator,
      condition.threshold,
      condition.upperThreshold ?? null,
    ])
    seen.set(shape, [...(seen.get(shape) ?? []), citation.id])
  }

  const shared = [...seen.values()]
    .filter((ids) => ids.length > 1)
    .map((ids) => ids.join(' + '))
    .sort()

  assert.deepEqual(shared, [
    // Chronic absenteeism above 10, and the roles are nested: every role tagged
    // for the health claim is also tagged for the attendance one, so the health
    // claim has never once appeared on its own. A nurse, whose entire library is
    // these two, meets both or neither.
    'cite-attendance-04 + cite-health-01',
    // Homework completion below 70. One claim is about homework at secondary
    // level, the other about study technique; both are worth saying and neither
    // is a reason to show the other, so they need triggers that can come apart
    // rather than one that guarantees they never do.
    'cite-engagement-02 + cite-engagement-03',
  ])
})

test('one claim does not imply another on the same metric', () => {
  // The softer version of a shared trigger, and the shipped case: evidence-01
  // fires above 20% of standards without evidence and mastery-01 above 25%, so
  // the second is a strict subset of the first and cannot appear alone. Two of
  // the three slots the panel has go to one figure, and which two is decided by
  // the order somebody typed the library in.
  const implied: string[] = []
  for (const outer of LIBRARY) {
    for (const inner of LIBRARY) {
      if (outer.id >= inner.id) continue
      const a = triggerOf(outer)
      const b = triggerOf(inner)
      if (!a || !b || a.metric !== b.metric) continue
      if (JSON.stringify(a) === JSON.stringify(b)) continue

      // Every cell that fires the narrower one fires the wider one too.
      const bags = Object.values(POPULATIONS).flat()
      const firesA = bags.filter((bag) => matches(a, bag))
      const firesB = bags.filter((bag) => matches(b, bag))
      if (firesA.length === 0 || firesB.length === 0) continue
      const narrow = firesA.length <= firesB.length ? firesA : firesB
      const wide = firesA.length <= firesB.length ? firesB : firesA
      if (narrow.every((bag) => wide.includes(bag))) {
        implied.push([outer.id, inner.id].sort().join(' implies '))
      }
    }
  }

  assert.deepEqual(implied.sort(), ['cite-evidence-01 implies cite-mastery-01'])
})
