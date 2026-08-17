/**
 * The comparisons an administrator view makes, as pure functions.
 *
 * Kept out of the components because these are the analytic claims the views
 * assert — "grades vary five times as much as buildings do" is an argument, not
 * a layout, and it should be readable on its own.
 */

import type { ComparisonRow } from '../../ui/ComparisonTable'
import { bySubjectOrder } from '../../lib/dataset'

export interface Spread {
  range: number
  sd: number
  count: number
  min: number
  max: number
}

/**
 * How far apart a set of like things sits. Population standard deviation rather
 * than sample: these are every building, every grade, every section, not a draw
 * from a larger population.
 */
export function spreadOf(values: number[]): Spread {
  if (values.length === 0) return { range: 0, sd: 0, count: 0, min: 0, max: 0 }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const mean = values.reduce((total, value) => total + value, 0) / values.length
  const variance =
    values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length
  return {
    range: max - min,
    sd: Math.sqrt(variance),
    count: values.length,
    min,
    max,
  }
}

type SubjectCell = {
  standardsTaughtToDate: number
  standardsMastered: number
  masteryRate: number
}

/** Subject rollups in curriculum order, not alphabetical or by rank. */
export function subjectRows(bySubject: Record<string, SubjectCell>): ComparisonRow[] {
  return Object.entries(bySubject)
    .sort((a, b) => bySubjectOrder(a[0], b[0]))
    .map(([subject, cell]) => ({
      key: subject,
      label: subject,
      mastered: cell.standardsMastered,
      taught: cell.standardsTaughtToDate,
      rate: cell.masteryRate,
    }))
}
