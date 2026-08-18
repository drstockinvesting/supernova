/**
 * The mastery map at the innermost zoom level: one star per standard, grouped by
 * subject and then by the unit it was taught in.
 *
 * Four states, and the distinction between the last two is the whole point:
 *
 *   mastered      — lit, brightness carrying how much evidence stands behind it
 *   in progress   — lit but ringed; evidence is accumulating, mastery not yet claimed
 *   no evidence   — taught, and nothing came back. Genuinely dark.
 *   not yet taught— outlined only. Dark because the class has not reached it,
 *                   which is not the same as a student failing to demonstrate it.
 *
 * Collapsing those last two would make every student look worse in February than
 * they are; `standardsNotYetTaught` is reported separately by the generator
 * precisely so the map can tell them apart.
 *
 * Since Phase 4 the picture itself lives in `ui/Constellation` and is shared with
 * the classroom, building, and district views. What stays here is the only part
 * that is actually about a student: which record becomes which star.
 */

import { useMemo } from 'react'
import type { CurriculumUnit, Standard } from '../../types/supernova'
import type { MasteryRecord } from '../../types/supernova'
import { bySubjectOrder } from '../../lib/dataset'
import { Constellation } from '../../ui/Constellation'
import {
  EVIDENCE_LEGEND,
  type StarBrightness,
  type StarGroup,
  type StarState,
} from '../../ui/stars'

export type { StarState } from '../../ui/stars'

export function starStateOf(record: MasteryRecord): StarState {
  const flags = record.metadata?.qualityFlags ?? []
  if (flags.includes('unit_not_yet_taught')) return 'not_taught'
  if (record.status === 'mastered') return 'mastered'
  if (record.status === 'in_progress') return 'in_progress'
  // Not mastered. Whether evidence exists but fell short, or none was recorded at
  // all, is carried by `evidenceStrength` on the star and spelled out in the label.
  return 'no_evidence'
}

/** Records with evidence that fell short read differently from records with none. */
export function starLabel(record: MasteryRecord): string {
  switch (starStateOf(record)) {
    case 'mastered':
      return 'Mastery demonstrated'
    case 'in_progress':
      return 'Evidence accumulating'
    case 'not_taught':
      return 'Not yet taught'
    default:
      return record.evidenceCount > 0 ? 'Evidence so far falls short' : 'No evidence recorded'
  }
}

interface UnitGroup {
  unitId: string
  unitName: string
  sequence: number
  records: MasteryRecord[]
}

interface SubjectGroup {
  subject: string
  units: UnitGroup[]
  mastered: number
  taught: number
}

function groupRecords(
  records: MasteryRecord[],
  units: Map<string, CurriculumUnit>,
): SubjectGroup[] {
  const bySubject = new Map<string, Map<string, UnitGroup>>()

  for (const record of records) {
    const subject = record.subject
    const unitId = record.curriculumUnitId ?? 'unassigned'
    const unit = units.get(unitId)

    let subjectMap = bySubject.get(subject)
    if (!subjectMap) {
      subjectMap = new Map()
      bySubject.set(subject, subjectMap)
    }

    let group = subjectMap.get(unitId)
    if (!group) {
      group = {
        unitId,
        unitName: unit?.name ?? 'Standards outside a unit',
        sequence: unit?.sequence ?? 99,
        records: [],
      }
      subjectMap.set(unitId, group)
    }
    group.records.push(record)
  }

  return [...bySubject.entries()]
    .map(([subject, unitMap]) => {
      const unitGroups = [...unitMap.values()].sort((a, b) => a.sequence - b.sequence)
      let mastered = 0
      let taught = 0
      for (const group of unitGroups) {
        group.records.sort((a, b) => a.standardId.localeCompare(b.standardId))
        for (const record of group.records) {
          if (starStateOf(record) === 'not_taught') continue
          taught += 1
          if (record.status === 'mastered') mastered += 1
        }
      }
      return { subject, units: unitGroups, mastered, taught }
    })
    .sort((a, b) => bySubjectOrder(a.subject, b.subject))
}

export function MasteryConstellation({
  records,
  units,
  standards,
  selectedId,
  onSelect,
}: {
  records: MasteryRecord[]
  units: Map<string, CurriculumUnit>
  standards: Map<string, Standard>
  selectedId: string | null
  onSelect: (record: MasteryRecord) => void
}) {
  const groups: StarGroup[] = useMemo(
    () =>
      groupRecords(records, units).map((group) => ({
        id: group.subject,
        label: group.subject,
        meta: `${group.mastered} of ${group.taught} taught so far`,
        clusters: group.units.map((unit) => ({
          id: unit.unitId,
          label: unit.unitName,
          stars: unit.records.map((record) => {
            const code = standards.get(record.standardId)?.standardCode ?? record.standardId
            return {
              id: record.id,
              state: starStateOf(record),
              brightness: record.evidenceStrength as StarBrightness,
              label: `${code}: ${starLabel(record)}`,
              selected: record.id === selectedId,
              onSelect: () => onSelect(record),
            }
          }),
        })),
      })),
    [records, units, standards, selectedId, onSelect],
  )

  return (
    <Constellation
      groups={groups}
      legend={EVIDENCE_LEGEND}
      legendNote="One star is one standard. Brightness is how much evidence stands behind the judgement, not how well it was done."
    />
  )
}
