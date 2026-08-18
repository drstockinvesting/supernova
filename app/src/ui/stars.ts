/**
 * What a star is, and how bright.
 *
 * Separated from `Constellation.tsx` because none of this is JSX: it is the
 * vocabulary the picture is drawn from, and the one function that decides how a
 * mastery rate becomes brightness. Keeping it in a plain module also keeps it
 * testable — `node --test` strips types but does not transform JSX, so anything
 * imported by a test has to live outside a `.tsx` file.
 */

export type StarState =
  | 'mastered'
  | 'in_progress'
  | 'no_evidence'
  | 'not_taught'
  /**
   * `withheld` is the only state that exists for the reader rather than the
   * student. It marks a cell the small-cell rule suppressed — too few students to
   * publish without identifying them. Dropping such a cell would be worse than
   * drawing it: a gap in a row of six grades is itself a disclosure, and a reader
   * who can count is owed the acknowledgement that something is being kept from
   * them rather than the impression that nothing was there.
   */
  | 'withheld'
  /** An aggregate star, lit continuously by `intensity` rather than by band. */
  | 'lit'

/**
 * Brightness, on a student: evidence strength — how much stands behind a single
 * yes-or-no judgement. Four named steps, because the underlying quantity has four
 * values and the distinctions between them are categorical.
 */
export type StarBrightness = 'substantial' | 'moderate' | 'insubstantial' | 'none'

export interface Star {
  id: string
  state: StarState
  brightness: StarBrightness
  /**
   * Aggregate stars only: how lit, from 0 to 1, mapped straight from a mastery
   * rate. Present when `state` is `lit`.
   *
   * This exists because the four named steps could not carry an aggregate. Every
   * grade-by-subject cell in this district falls between 30.3% and 49.6% — the
   * whole matrix inside one band — so a banded encoding drew 78 identical stars
   * and answered "which grades are strong in which subjects" with a flat field
   * regardless of what the data said. A share is a continuous quantity and gets a
   * continuous ramp.
   *
   * Still absolute. 40% is the same brightness in every sky in the app, never
   * shaded against the other stars beside it: relative shading would turn a
   * district that is genuinely uniform into a league table, which is the exact
   * reading the district view spends a paragraph arguing against.
   */
  intensity?: number
  /** Read aloud and shown on hover. Always says the state in words — never colour alone. */
  label: string
  selected?: boolean
  /** A star that drills down. Mutually exclusive with `onSelect`. */
  to?: string
  onSelect?: () => void
}

export interface StarCluster {
  id: string
  label: string
  stars: Star[]
}

export interface StarGroup {
  id: string
  label: string
  /** The count that belongs to this group — "17 of 35 taught so far". */
  meta?: string
  clusters: StarCluster[]
}

export interface LegendEntry {
  state: StarState
  brightness: StarBrightness
  intensity?: number
  label: string
}

/** The student legend: four states, and the two dark ones mean different things. */
export const EVIDENCE_LEGEND: LegendEntry[] = [
  { state: 'mastered', brightness: 'substantial', label: 'Mastered' },
  { state: 'in_progress', brightness: 'moderate', label: 'In progress' },
  { state: 'no_evidence', brightness: 'none', label: 'No evidence' },
  { state: 'not_taught', brightness: 'none', label: 'Not yet taught' },
]

/**
 * The aggregate legend: anchors along a continuous ramp, not a set of bins. The
 * stars between these values are lit between them.
 */
export const SHARE_LEGEND: LegendEntry[] = [
  { state: 'lit', brightness: 'none', intensity: 0, label: '0%' },
  { state: 'lit', brightness: 'none', intensity: 0.25, label: '25%' },
  { state: 'lit', brightness: 'none', intensity: 0.5, label: '50%' },
  { state: 'lit', brightness: 'none', intensity: 0.75, label: '75%' },
  { state: 'lit', brightness: 'none', intensity: 1, label: '100%' },
  { state: 'not_taught', brightness: 'none', label: 'Not yet taught' },
]

/**
 * Rate to intensity, in one place. Every aggregate constellation calls this, which
 * is what stops a building's sky and a district's sky from being lit on different
 * scales — the failure mode where two pages of the same product disagree about
 * what bright means, and one nobody would notice by looking.
 */
export function intensityOfRate(rate: number | null | undefined): number {
  if (rate === null || rate === undefined) return 0
  return Math.min(1, Math.max(0, rate / 100))
}
