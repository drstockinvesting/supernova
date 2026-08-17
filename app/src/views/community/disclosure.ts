/**
 * What a public-facing view is allowed to say.
 *
 * Every other layer of Supernova was built by addition — take the layer below,
 * roll it up, add a comparison. This one is built by subtraction, so the rules
 * live here as pure functions rather than as conditions scattered through JSX.
 * A disclosure rule that cannot be read on its own cannot be reviewed.
 *
 * Two audiences share the route. Stage 6 read the addendum's role table
 * literally —
 *
 *   School board member | The district | Aggregates only -- no school or student identifiers
 *   Community member    | Public       | School-level aggregates only
 *
 * — and built a board view stricter than the public one: the community got three
 * named schools and a grade breakdown, and the elected body governing the
 * district got totals and an explanation of what was missing. Phase 3 resolves
 * that rather than hardening it. The board's row means **aggregates, not
 * individuals**; it was never a rule that a governing body may not know which
 * building is which. An anonymous visitor cannot reasonably be better informed
 * about the district than the people elected to run it.
 *
 * So the floor is shared and the ceiling differs:
 *
 *   - Neither audience may reach a named student, classroom, or building page.
 *     That is not enforced here — it is enforced at the route boundary in
 *     `session/access.ts`, which is where a rule about what may be *opened*
 *     belongs. Neither role holds `view_student_names`.
 *   - Both read school-level aggregates, the grade breakdown, and whatever the
 *     small-cell rule leaves standing.
 *   - The board additionally gets the rules those figures were produced under. A
 *     body governing by these numbers is owed the method, not only the result.
 */

import type { AggregateCell, Aggregates } from '../../types/profile'
import type { Role } from '../../session/roles'

export type Audience = 'board' | 'public'

export interface DisclosureRule {
  audience: Audience
  /** Shown in the header, so the reader knows which rules produced the page. */
  label: string
  /**
   * Whether the page states the disclosure rules it was produced under — the
   * suppression threshold, the complementary rule, and what the grade dimension
   * does and does not reveal. The public page publishes the figures; the board
   * page publishes the figures and the method.
   */
  explainsRules: boolean
}

export const BOARD_RULE: DisclosureRule = {
  audience: 'board',
  label: 'Board view · aggregates, and the rules behind them',
  explainsRules: true,
}

export const PUBLIC_RULE: DisclosureRule = {
  audience: 'public',
  label: 'Public view · school-level aggregates',
  explainsRules: false,
}

export function ruleFor(role: Role): DisclosureRule {
  return role === 'school_board_member' ? BOARD_RULE : PUBLIC_RULE
}

// --- Re-identification through a second dimension ---------------------------

/**
 * Which buildings teach a given grade.
 *
 * The reason this is computed rather than assumed: whether a grade label
 * identifies a building is a property of how the district is organised, not a
 * fact about grades. In a district with two K-5 buildings, "Grade 3" names no
 * one and the breakdown is publishable. In this one it names Nova Elementary.
 */
export function schoolsByGrade(grades: Aggregates['grades']): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  for (const grade of grades) {
    const entry = map.get(grade.gradeLevel) ?? new Set<string>()
    entry.add(grade.schoolId)
    map.set(grade.gradeLevel, entry)
  }
  return map
}

/**
 * Grades taught at exactly one building. Publishing such a grade's figures
 * publishes that building's, whether or not the building is named — so a view
 * forbidden from naming buildings is equally forbidden from breaking out these
 * grades.
 */
export function gradesIdentifyingOneBuilding(grades: Aggregates['grades']): string[] {
  return [...schoolsByGrade(grades).entries()]
    .filter(([, schools]) => schools.size === 1)
    .map(([grade]) => grade)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

/** True when *every* grade in the district sits in a single building. */
export function gradeDimensionNamesBuildings(grades: Aggregates['grades']): boolean {
  const byGrade = schoolsByGrade(grades)
  return byGrade.size > 0 && [...byGrade.values()].every((schools) => schools.size === 1)
}

// --- Small-cell suppression -------------------------------------------------

export type SuppressionReason = 'below_threshold' | 'complementary'

export interface Disclosed<T> {
  cell: T
  /** null when the cell may be published as it stands. */
  suppressed: SuppressionReason | null
}

/**
 * The generator already computes `suppressForPublicDisplay` on every cell, at a
 * threshold of ten students, and every consumer is meant to apply that one rule
 * rather than invent its own. This applies it — and then applies the rule that
 * a single suppression needs.
 *
 * **Suppressing one cell out of a published total does not hide it.** If the
 * district publishes its own figure and thirteen grade figures, and one grade is
 * withheld, that grade is the total minus the twelve that were printed. Hiding a
 * number that a reader can subtract their way back to is not privacy; it is the
 * appearance of it. So when a group has a published total and exactly one
 * primary suppression, the next-smallest cell is suppressed alongside it — the
 * complementary suppression that education reporting has used for decades.
 *
 * On this dataset the rule is a no-op: the smallest published cell holds 59
 * students, nearly six times the threshold. It is here so that the view is
 * correct for a district where it is not, and so the reasoning is on the record
 * rather than rediscovered later.
 */
export function discloseCells<T extends { studentCount: number; suppressForPublicDisplay: boolean }>(
  cells: T[],
  { totalIsPublished }: { totalIsPublished: boolean },
): Disclosed<T>[] {
  const disclosed: Disclosed<T>[] = cells.map((cell) => ({
    cell,
    suppressed: cell.suppressForPublicDisplay ? ('below_threshold' as const) : null,
  }))

  const primary = disclosed.filter((entry) => entry.suppressed !== null)
  if (!totalIsPublished || primary.length !== 1) return disclosed

  const smallestRemaining = disclosed
    .filter((entry) => entry.suppressed === null)
    .sort((a, b) => a.cell.studentCount - b.cell.studentCount)[0]

  if (smallestRemaining) smallestRemaining.suppressed = 'complementary'
  return disclosed
}

// --- Evidence behind the headline rate ---------------------------------------

export interface EvidenceMix {
  strength: string
  count: number
  share: number
}

/**
 * How well-evidenced the mastery rate is.
 *
 * Every aggregate carries `evidenceStrengthCounts` and no view has read it yet.
 * It belongs on a governance page more than anywhere else: a mastery rate is a
 * count of judgements, and this is what those judgements rest on. A board asked
 * to act on 39.4% should be able to see how much of the underlying record is
 * carrying no evidence at all.
 */
const STRENGTH_ORDER = ['substantial', 'moderate', 'insubstantial', 'none']

export function evidenceMix(cell: AggregateCell): EvidenceMix[] {
  const entries = Object.entries(cell.evidenceStrengthCounts) as [string, number][]
  const total = entries.reduce((sum, [, count]) => sum + count, 0)
  if (total === 0) return []

  return entries
    .sort((a, b) => {
      const left = STRENGTH_ORDER.indexOf(a[0])
      const right = STRENGTH_ORDER.indexOf(b[0])
      return (left === -1 ? STRENGTH_ORDER.length : left) - (right === -1 ? STRENGTH_ORDER.length : right)
    })
    .map(([strength, count]) => ({
      strength,
      count,
      share: (100 * count) / total,
    }))
}

export const STRENGTH_LABELS: Record<string, string> = {
  substantial: 'Substantial',
  moderate: 'Moderate',
  insubstantial: 'Insubstantial',
  none: 'No evidence',
}
