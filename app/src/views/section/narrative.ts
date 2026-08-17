/**
 * The analytics summary, composed from the section's own numbers.
 *
 * The UI/UX document gives this as a worked paragraph — mastery, then pacing,
 * then the absences, incidents, and interruptions that bear on it, then what to
 * do about it. Building it as a pure function keeps that reasoning inspectable
 * rather than buried in JSX, and means it can be read against the data it claims
 * to describe.
 *
 * The rule it follows: never assert a factor that is not there. A class with no
 * interruptions and nobody absent through key instruction gets a shorter
 * paragraph, not a template sentence with zeroes in it. A dashboard that always
 * finds something to blame teaches its reader to stop believing it.
 */

export interface NarrativeInput {
  unitLabel: string
  isSingleUnit: boolean
  masteryRate: number | null
  standardsTaught: number
  standardsMastered: number
  pacing: { percentContentCovered: number; percentTimeElapsed: number; pacingStatus: string } | null
  studentCount: number
  chronicallyAbsent: number
  /** Students who were absent on a day the unit flagged as key instruction. */
  absentOnKeyInstruction: { name: string; dates: string[] }[]
  attributedIncidents: number
  unattributedIncidents: number
  interruptions: { count: number; unplanned: number; minutesLost: number }
  homeworkCompletionRate: number | null
  homeworkTrend: number | null
}

export interface Narrative {
  outcome: string
  factors: string[]
  actions: string[]
}

const list = (items: string[]): string =>
  items.length <= 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`

function hours(minutes: number): string {
  if (minutes < 60) return `about ${minutes} minutes`
  const value = minutes / 60
  return `approximately ${value < 10 ? value.toFixed(1) : Math.round(value)} hours`
}

export function buildNarrative(input: NarrativeInput): Narrative {
  const {
    unitLabel,
    isSingleUnit,
    masteryRate,
    standardsTaught,
    standardsMastered,
    pacing,
    chronicallyAbsent,
    absentOnKeyInstruction,
    attributedIncidents,
    unattributedIncidents,
    interruptions,
    homeworkCompletionRate,
    homeworkTrend,
  } = input

  // --- Outcome -------------------------------------------------------------
  const outcomeParts: string[] = []

  if (standardsTaught === 0) {
    outcomeParts.push(
      `No standard in ${unitLabel} has been taught yet, so there is no mastery to report — this is content the class has not reached, not content it has failed.`,
    )
  } else {
    outcomeParts.push(
      `${unitLabel} is at ${masteryRate?.toFixed(0)}% mastery: ${standardsMastered} of ${standardsTaught} standard demonstrations across the roster have been mastered.`,
    )
  }

  if (pacing && isSingleUnit) {
    const gap = pacing.percentContentCovered - pacing.percentTimeElapsed
    const direction =
      Math.abs(gap) < 5
        ? `Pacing is even — ${pacing.percentContentCovered}% of the content covered with ${pacing.percentTimeElapsed}% of the time used.`
        : gap > 0
          ? `Pacing runs ahead: ${pacing.percentContentCovered}% of the content covered with ${pacing.percentTimeElapsed}% of the time used.`
          : `Pacing runs behind: ${pacing.percentContentCovered}% of the content covered with ${pacing.percentTimeElapsed}% of the time used.`
    outcomeParts.push(direction)
  }

  // --- Factors -------------------------------------------------------------
  const factors: string[] = []

  // Key instruction dates belong to a unit. With the whole year in view there is
  // no window to read an absence against, so the paragraph reports the absence
  // and stops — claiming nobody missed key instruction would be true only
  // because nothing was checked.
  if (absentOnKeyInstruction.length > 0) {
    const named = absentOnKeyInstruction.slice(0, 3).map((entry) => entry.name)
    const extra = absentOnKeyInstruction.length - named.length
    // The overflow joins the list as its final item, so three names plus one
    // more reads "A, B and 1 other" rather than "A, B and C and 1 other".
    const names = extra > 0 ? [...named, `${extra} other${extra === 1 ? '' : 's'}`] : named
    factors.push(
      `${list(names)} ` +
        `${absentOnKeyInstruction.length === 1 ? 'was' : 'were'} absent on a day this unit flagged as key instruction, ` +
        `which is where an absence costs the most.`,
    )
  } else if (chronicallyAbsent > 0) {
    factors.push(
      isSingleUnit
        ? `${chronicallyAbsent} student${chronicallyAbsent === 1 ? ' is' : 's are'} above 10% absence for the year, ` +
            `though none of those absences fell on this unit's key instruction days.`
        : `${chronicallyAbsent} student${chronicallyAbsent === 1 ? ' is' : 's are'} above 10% absence for the year. ` +
            `Open a unit to see whether those absences fell on its key instruction days.`,
    )
  }

  if (attributedIncidents > 0) {
    factors.push(
      `${attributedIncidents} behaviour incident${attributedIncidents === 1 ? '' : 's'} in this class ` +
        `${isSingleUnit ? 'fell inside the unit window' : 'were recorded this year'}, which may have disrupted the flow of instruction.`,
    )
  }

  if (interruptions.count > 0) {
    const unplanned =
      interruptions.unplanned > 0
        ? `${interruptions.unplanned} of them unplanned, `
        : 'all of them planned, '
    factors.push(
      `${interruptions.count} interruption${interruptions.count === 1 ? '' : 's'} were logged ` +
        `${isSingleUnit ? 'during this unit' : 'this year'} — ` +
        `${unplanned}costing ${hours(interruptions.minutesLost)} of instructional time.`,
    )
  }

  if (homeworkTrend !== null && homeworkTrend <= -8) {
    factors.push(
      `Homework completion fell ${Math.abs(homeworkTrend).toFixed(0)} points between the first and most recent marking period.`,
    )
  }

  if (unattributedIncidents > 0 && attributedIncidents === 0) {
    factors.push(
      `${unattributedIncidents} incident${unattributedIncidents === 1 ? '' : 's'} involving students on this roster ` +
        `${isSingleUnit ? 'fell in this window' : 'were recorded this year'} without a subject, ` +
        `so ${unattributedIncidents === 1 ? 'it cannot' : 'they cannot'} be attributed to this class.`,
    )
  }

  // --- Actions -------------------------------------------------------------
  const actions: string[] = []

  if (absentOnKeyInstruction.length > 0) {
    actions.push(
      `Reteach this unit's key content to the ${absentOnKeyInstruction.length} student${absentOnKeyInstruction.length === 1 ? '' : 's'} who missed it.`,
    )
  }
  if (attributedIncidents > 1) {
    actions.push('Review whether the behaviour incidents cluster around particular lessons.')
  }
  if (interruptions.unplanned >= 2) {
    actions.push('Raise the unplanned interruptions with the building schedule in mind.')
  }
  if (homeworkCompletionRate !== null && homeworkCompletionRate < 70) {
    actions.push('Check whether the homework load is landing before adjusting pace.')
  }

  return { outcome: outcomeParts.join(' '), factors, actions }
}
