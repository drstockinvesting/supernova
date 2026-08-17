/**
 * Facts about the dataset that the UI has to state out loud.
 */

/**
 * The dataset is generated as if viewed partway through the current year — see
 * `AS_OF_DATE` in `generator/pipeline.py`. Nothing is dated later. Every view says
 * so, because a 39% district mastery rate read as an end-of-year result would be
 * alarming, and read as a mid-February result is simply a year in progress.
 */
export const AS_OF_DATE = '2025-02-10'
export const AS_OF_LABEL = '10 February 2025'

export const CURRENT_SCHOOL_YEAR = '2024-2025'

export const SUBJECT_ORDER = [
  'Math',
  'ELA',
  'Science',
  'Social Studies',
  'Arts',
  'Physical Education',
] as const

export function formatSchoolYear(year: string): string {
  return year.replace('-', '–')
}

export function gradeLabel(grade: string): string {
  return grade === 'K' ? 'Kindergarten' : `Grade ${grade}`
}

/** Sorts subjects into a stable, curriculum-shaped order rather than alphabetical. */
export function bySubjectOrder(a: string, b: string): number {
  const order = SUBJECT_ORDER as readonly string[]
  const left = order.indexOf(a)
  const right = order.indexOf(b)
  return (left === -1 ? order.length : left) - (right === -1 ? order.length : right)
}
