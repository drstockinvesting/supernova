/**
 * The research context layer: which claims bear on the figures on screen.
 *
 * A citation carries a machine-readable trigger — `{metric, comparator,
 * threshold}` — and a view hands over its metrics. Nothing is shown "because the
 * topic is attendance"; it is shown because this student's attendance is below
 * the threshold this citation is about.
 *
 * Plain TypeScript, not a component, for two reasons. Node's test runner strips
 * types but does not transform JSX, so anything a test touches cannot live in a
 * `.tsx`. And the selector is the part whose failure is invisible: a citation
 * that never fires renders exactly like a citation that fires correctly, which
 * is to say as nothing at all.
 *
 * ## The vocabulary is the contract
 *
 * Phase 5 opened by measuring the library against the app and finding half of it
 * dead. Six of twelve citations named a metric no view ever supplied —
 * `totalMinutesLost`, `hasActiveIEP`, `priorYearMasteryRate` and three more were
 * spelled correctly, meant something real, and could not fire, because the
 * matching was a string lookup against a bag assembled by hand at six call
 * sites. A typo and an unimplemented metric were the same event, and neither one
 * showed up on screen or in a build.
 *
 * So `METRICS` below is the declared vocabulary. A citation may only trigger on
 * a name in it, a view may only supply names in it, and `metricContract` in the
 * tests asserts both directions — including that every declared name is actually
 * produced by one of the builders here, so a metric cannot be defined, cited,
 * and never handed over.
 *
 * ## Scale is part of a metric's meaning
 *
 * The second finding was subtler and is the reason `MetricBag` carries a scale.
 * `disciplineReferralCount > 3` reads as a sentence about a child, and it was
 * the only claim a school board member ever saw — because the district has 558
 * referrals and 558 is greater than 3. A count threshold means nothing once the
 * thing counted changes size.
 *
 * Rates are not automatically safe either. "Students who miss 10 percent or more
 * of the school year..." is a claim about individuals, and a district averaging
 * 93.4% attendance contains no information about how many students that is. A
 * district's average attendance is almost never below 90, so a claim keyed to it
 * is dead on every aggregate view by construction. The aggregate that carries
 * the same fact honestly is chronic absenteeism — 14.9% of these students miss
 * more than a tenth of days — which the community page had on screen all along
 * and never handed to the library.
 *
 * A metric therefore declares the scale it is meaningful at, a bag declares the
 * scale it was built at, and the selector refuses to match across the two.
 */

import type { ResearchCitation } from '../types/supernova'
import type { Role } from '../session/roles'

// --- The declared vocabulary --------------------------------------------------

export type Comparator = 'above' | 'below' | 'equals' | 'between'

/**
 * `student` is one learner's own figure. `group` is a figure over many —
 * a section, a building, a grade, the district. `either` is for quantities that
 * mean the same thing at both, which is a smaller set than it looks: a share of
 * standards mastered is genuinely the same ratio computed over one student or
 * over a district, while an attendance rate is not.
 */
export type MetricScale = 'student' | 'group' | 'either'

export interface MetricSpec {
  /** How the metric reads inside a sentence, lowercase and without its subject. */
  label: string
  unit: 'percent' | 'points' | 'count' | 'per100' | 'days' | 'minutes' | 'flag'
  scale: MetricScale
}

export const METRICS = {
  attendanceRate: {
    label: "this student's attendance",
    unit: 'percent',
    scale: 'student',
  },
  schoolAttendanceRate: {
    label: 'attendance across this group',
    unit: 'percent',
    scale: 'group',
  },
  chronicAbsenteeismRate: {
    label: 'the share of students missing more than a tenth of days',
    unit: 'percent',
    scale: 'group',
  },
  missedKeyInstructionDays: {
    label: 'days missed when a standard was first taught',
    unit: 'days',
    scale: 'student',
  },
  disciplineReferralCount: {
    label: "this student's discipline referrals",
    unit: 'count',
    scale: 'student',
  },
  suspensionCount: {
    label: "this student's suspensions",
    unit: 'count',
    scale: 'student',
  },
  disciplineReferralsPer100Students: {
    label: 'discipline referrals per 100 students',
    unit: 'per100',
    scale: 'group',
  },
  masteryRate: {
    label: 'the share of standards taught that have been mastered',
    unit: 'percent',
    scale: 'either',
  },
  masterySpreadPoints: {
    label: 'the gap between the highest and lowest group shown here',
    unit: 'points',
    scale: 'group',
  },
  priorYearMasteryRate: {
    label: "last year's mastery of standards taught",
    unit: 'percent',
    scale: 'student',
  },
  standardsWithoutEvidenceShare: {
    label: 'the share of standards taught carrying no recorded evidence',
    unit: 'percent',
    scale: 'either',
  },
  completionRate: {
    label: 'homework completion',
    unit: 'percent',
    scale: 'either',
  },
  responseRate: {
    label: 'family response to school contact',
    unit: 'percent',
    scale: 'student',
  },
  totalMinutesLost: {
    label: 'instructional minutes lost to interruptions',
    unit: 'minutes',
    scale: 'group',
  },
  hasActiveIEP: {
    label: 'this student has an active IEP',
    unit: 'flag',
    scale: 'student',
  },
  hasIncompletePriorHistory: {
    label: 'this student arrived without a full prior record',
    unit: 'flag',
    scale: 'student',
  },
} as const satisfies Record<string, MetricSpec>

export type MetricName = keyof typeof METRICS

export function isMetricName(name: string): name is MetricName {
  return Object.prototype.hasOwnProperty.call(METRICS, name)
}

// --- Bags ---------------------------------------------------------------------

export type MetricValue = number | boolean | null | undefined

/**
 * What a view knows, and the scale it knows it at. Built by the functions below
 * rather than assembled at the call site, so every metric name in the app comes
 * from one file and a renamed metric is a type error rather than a silence.
 */
export interface MetricBag {
  scale: 'student' | 'group'
  values: Partial<Record<MetricName, MetricValue>>
}

/** The fields of an aggregate cell this layer reads. Any level: section to district. */
export interface GroupFigures {
  attendanceRate?: number | null
  chronicAbsenteeismRate?: number | null
  homeworkCompletionRate?: number | null
  masteryRate?: number | null
  disciplineReferrals?: number | null
  studentCount?: number | null
  evidenceStrengthCounts?: Record<string, number> | null
  standardsTaughtToDate?: number | null
  standardsWithNoEvidence?: number | null
  totalMinutesLost?: number | null
  /** Range between the highest and lowest sub-group this page breaks down into. */
  masterySpreadPoints?: number | null
}

/**
 * A rate per 100 students rather than a count, because the count is the thing
 * that broke. Returns null rather than 0 when the denominator is missing, so a
 * group of unknown size triggers nothing instead of triggering everything.
 */
export function referralsPer100(figures: GroupFigures): number | null {
  const { disciplineReferrals, studentCount } = figures
  if (
    disciplineReferrals === null ||
    disciplineReferrals === undefined ||
    !studentCount ||
    studentCount <= 0
  ) {
    return null
  }
  return (100 * disciplineReferrals) / studentCount
}

/**
 * The share of standards taught that carry no recorded artifact.
 *
 * This replaces the library's `evidenceCount < 3`, which was written per standard
 * and was handed a per-year total of 200 on the one page that supplied it. A
 * share is the version of that quantity which survives a change of scale, and
 * both the aggregates and a student's summary already carry what it needs.
 */
export function withoutEvidenceShare(figures: GroupFigures): number | null {
  const counts = figures.evidenceStrengthCounts
  if (counts) {
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
    if (total > 0) return (100 * (counts.none ?? 0)) / total
  }
  const taught = figures.standardsTaughtToDate
  const none = figures.standardsWithNoEvidence
  if (taught && taught > 0 && none !== null && none !== undefined) {
    return (100 * none) / taught
  }
  return null
}

export function groupMetrics(figures: GroupFigures): MetricBag {
  return {
    scale: 'group',
    values: {
      schoolAttendanceRate: figures.attendanceRate,
      chronicAbsenteeismRate: figures.chronicAbsenteeismRate,
      completionRate: figures.homeworkCompletionRate,
      masteryRate: figures.masteryRate,
      disciplineReferralsPer100Students: referralsPer100(figures),
      standardsWithoutEvidenceShare: withoutEvidenceShare(figures),
      totalMinutesLost: figures.totalMinutesLost,
      masterySpreadPoints: figures.masterySpreadPoints,
    },
  }
}

export interface StudentFigures {
  attendanceRate?: number | null
  homeworkCompletionRate?: number | null
  masteryRate?: number | null
  priorYearMasteryRate?: number | null
  disciplineReferralCount?: number | null
  suspensionCount?: number | null
  missedKeyInstructionDays?: number | null
  responseRate?: number | null
  standardsTaughtToDate?: number | null
  standardsWithNoEvidence?: number | null
  hasActiveIEP?: boolean
  hasIncompletePriorHistory?: boolean
}

export function studentMetrics(figures: StudentFigures): MetricBag {
  return {
    scale: 'student',
    values: {
      attendanceRate: figures.attendanceRate,
      completionRate: figures.homeworkCompletionRate,
      masteryRate: figures.masteryRate,
      priorYearMasteryRate: figures.priorYearMasteryRate,
      disciplineReferralCount: figures.disciplineReferralCount,
      suspensionCount: figures.suspensionCount,
      missedKeyInstructionDays: figures.missedKeyInstructionDays,
      responseRate: figures.responseRate,
      standardsWithoutEvidenceShare: withoutEvidenceShare(figures),
      hasActiveIEP: figures.hasActiveIEP,
      hasIncompletePriorHistory: figures.hasIncompletePriorHistory,
    },
  }
}

// --- Triggers -----------------------------------------------------------------

export interface TriggerCondition {
  metric: MetricName
  comparator: Comparator
  threshold: number
  /** Upper bound, `between` only. The band is half-open: threshold ≤ v < upper. */
  upperThreshold?: number
}

/**
 * Reads a citation's trigger, or null if it has none the app can act on.
 *
 * An unknown metric name resolves to null rather than throwing. A citation added
 * to the library with a metric this build does not know is inert, which is the
 * safe failure — and the test suite is what makes it a loud one.
 */
export function triggerOf(citation: ResearchCitation): TriggerCondition | null {
  const raw = citation.triggerConditions as Partial<TriggerCondition> | undefined
  if (!raw?.metric || !raw.comparator || raw.threshold === undefined) return null
  if (!isMetricName(raw.metric)) return null
  if (raw.comparator === 'between' && raw.upperThreshold === undefined) return null
  return raw as TriggerCondition
}

/**
 * `between` is half-open — `threshold ≤ value < upperThreshold` — so a value
 * sitting exactly on a boundary belongs to one band and not to both. `above` and
 * `below` stay strict, which they have always been.
 */
export function matches(condition: TriggerCondition, bag: MetricBag): boolean {
  const spec = METRICS[condition.metric]
  if (spec.scale !== 'either' && spec.scale !== bag.scale) return false

  const raw = bag.values[condition.metric]
  if (raw === null || raw === undefined) return false

  // Flag conditions are written as `equals 1` in the data.
  const value = typeof raw === 'boolean' ? (raw ? 1 : 0) : raw

  switch (condition.comparator) {
    case 'above':
      return value > condition.threshold
    case 'below':
      return value < condition.threshold
    case 'equals':
      return value === condition.threshold
    case 'between':
      return value >= condition.threshold && value < (condition.upperThreshold as number)
    default:
      return false
  }
}

/** Plain language for a trigger, so `/research` can show when a claim appears. */
export function describeTrigger(condition: TriggerCondition): string {
  const spec = METRICS[condition.metric]

  if (spec.unit === 'flag') {
    return condition.threshold === 1 ? `Shown when ${spec.label}.` : `Shown when ${spec.label} is not the case.`
  }

  const format = (value: number) => {
    switch (spec.unit) {
      case 'percent':
        return `${value}%`
      case 'points':
        return `${value} points`
      case 'per100':
        return `${value} per 100`
      case 'days':
        return `${value} day${value === 1 ? '' : 's'}`
      case 'minutes':
        return `${value} minutes`
      default:
        return `${value}`
    }
  }

  switch (condition.comparator) {
    case 'above':
      return `Shown when ${spec.label} is above ${format(condition.threshold)}.`
    case 'below':
      return `Shown when ${spec.label} is below ${format(condition.threshold)}.`
    case 'equals':
      return `Shown when ${spec.label} is ${format(condition.threshold)}.`
    case 'between':
      return `Shown when ${spec.label} is between ${format(condition.threshold)} and ${format(
        condition.upperThreshold as number,
      )}.`
    default:
      return 'Never shown.'
  }
}

// --- Selection ----------------------------------------------------------------

export function taggedFor(citations: ResearchCitation[], role: Role): ResearchCitation[] {
  return citations.filter((citation) => citation.applicableRoles?.includes(role) ?? false)
}

export function selectCitations(
  citations: ResearchCitation[],
  bag: MetricBag,
  role: Role,
): ResearchCitation[] {
  return taggedFor(citations, role).filter((citation) => {
    const condition = triggerOf(citation)
    return condition ? matches(condition, bag) : false
  })
}

/**
 * Why a view is showing no research context.
 *
 * Three states, because they are three different facts about the product and the
 * component used to render all of them as nothing. `untagged` is the library
 * having nothing to say to this role at all — the state four of the ten roles
 * were in before this phase. `quiet` is the library having claims for the role
 * and none of them bearing on these figures, which is the honest and expected
 * case. `shown` is context.
 */
export type CoverageState = 'shown' | 'quiet' | 'untagged'

export interface Coverage {
  state: CoverageState
  /** Claims the library tags for this role, whatever the figures. */
  tagged: number
  /** Of those, the ones this bag triggers. */
  firing: ResearchCitation[]
}

export function coverageOf(
  citations: ResearchCitation[],
  bag: MetricBag,
  role: Role,
): Coverage {
  const tagged = taggedFor(citations, role)
  const firing = selectCitations(citations, bag, role)
  return {
    state: firing.length > 0 ? 'shown' : tagged.length === 0 ? 'untagged' : 'quiet',
    tagged: tagged.length,
    firing,
  }
}

/**
 * Whether a claim can be exercised by a bag of this scale at all.
 *
 * `/research` reports coverage against the district's own figures, which are
 * group-scale. A claim about one child is not failing to fire there; it is not
 * being asked. Saying so is the difference between a coverage report and a
 * misleading one.
 */
export function exercisableAt(citation: ResearchCitation, scale: 'student' | 'group'): boolean {
  const condition = triggerOf(citation)
  if (!condition) return false
  const spec = METRICS[condition.metric]
  return spec.scale === 'either' || spec.scale === scale
}

/**
 * The review vocabulary, and the one rule underneath it.
 *
 * A **source check** asks whether the cited document exists and says what the
 * claim says. A **sign-off** asks whether the claim is fit to put in front of a
 * stakeholder, and is a judgement a named person makes and is accountable for.
 * Only the second licenses dropping the marker, and no amount of the first adds
 * up to it. `generator/review.py` argues this at length; what matters here is
 * that `isUnverified` is written against the sign-off and never against the
 * source check, so a thorough check cannot quietly promote a claim.
 *
 * A check is also a check of a *sentence*. `claimChecked` records the wording the
 * verdict was reached against, so editing a claim retires its verdict rather than
 * carrying it across the edit — `stale`, not `source_checked`, and not `verified`
 * either. That is the one way a sign-off can be revoked without anybody revoking
 * it, and it should be: a signature is on a sentence.
 *
 * The library today: eighteen claims checked against their sources and revised to
 * match them, and no sign-offs at all.
 */
export type ReviewStatus = ResearchCitation['review']['status']

export const REVIEW_LABELS: Record<ReviewStatus, string> = {
  unreviewed: 'unreviewed',
  stale: 'checked, then edited',
  source_checked: 'source checked',
  revision_required: 'revision required',
  verified: 'verified',
  withdrawn: 'withdrawn',
}

/**
 * Unverified means unsigned, and that is the whole definition.
 *
 * Deliberately not `status !== 'source_checked' && status !== 'verified'`. A
 * source check is evidence for a reviewer, not a substitute for one, and the
 * moment this function starts accepting one the marker stops meaning anything.
 */
export function isUnverified(citation: ResearchCitation): boolean {
  return citation.review.status !== 'verified'
}

/**
 * How a source is dated, which is not always by year.
 *
 * Three of these sources are continuously revised webpages carrying no
 * publication year at all. Until Phase 7 the records supplied one anyway, which
 * presented a living page as a snapshot somebody could go and check. They now
 * carry an access date instead, and both places that print a citation read it
 * through here rather than reaching for `publicationYear` and rendering
 * `undefined` on the three that lack it.
 */
export function sourceDate(source: ResearchCitation['source']): string {
  if (source.publicationYear !== undefined) return String(source.publicationYear)
  return source.accessedDate ? `accessed ${source.accessedDate}` : 'undated'
}

/** A claim a source check found something wrong with. */
export function needsRevision(citation: ResearchCitation): boolean {
  return citation.review.status === 'revision_required'
}

/** A claim nobody has checked at all — not the same as one checked and found fine. */
export function isUnchecked(citation: ResearchCitation): boolean {
  return citation.review.sourceCheck === null
}

/**
 * Recompute the stored status from the two records it is derived from.
 *
 * The generator writes `status` alongside `sourceCheck` and `signOff` so the
 * dataset is readable without running any code. That makes it a third field that
 * can drift, so the app recomputes it and the test suite asserts the two agree —
 * the same shape as the metric vocabulary contract, and for the same reason: the
 * two sides are edited by different people at different times.
 */
export function deriveReviewStatus(citation: ResearchCitation): ReviewStatus {
  const { review, claim } = citation
  const check = review.sourceCheck
  const stale = check !== null && check.claimChecked !== claim

  if (review.signOff && !stale) {
    return review.signOff.outcome === 'withdrawn' ? 'withdrawn' : 'verified'
  }
  if (!check) return 'unreviewed'
  if (stale) return 'stale'
  if (!check.sourceReachable || !check.recordAccurate || check.support !== 'supported') {
    return 'revision_required'
  }
  return 'source_checked'
}
