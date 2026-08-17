/**
 * The mastery map: one star per standard, grouped by subject and then by the unit
 * it was taught in.
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
 */

import { useMemo } from 'react'
import type { CurriculumUnit, Standard } from '../../types/supernova'
import type { MasteryRecord } from '../../types/supernova'
import { bySubjectOrder } from '../../lib/dataset'

export type StarState = 'mastered' | 'in_progress' | 'no_evidence' | 'not_taught'

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
  const groups = useMemo(() => groupRecords(records, units), [records, units])

  return (
    <div className="constellation card-deep">
      <div className="constellation-legend">
        {(
          [
            ['mastered', 'Mastered'],
            ['in_progress', 'In progress'],
            ['no_evidence', 'No evidence'],
            ['not_taught', 'Not yet taught'],
          ] as [StarState, string][]
        ).map(([state, label]) => (
          <span key={state} className="legend-item">
            <span className="star" data-state={state} data-strength="moderate" aria-hidden />
            {label}
          </span>
        ))}
      </div>

      {groups.map((group) => (
        <section key={group.subject} className="constellation-subject">
          <header>
            <h3>{group.subject}</h3>
            <span className="constellation-count">
              {group.mastered} of {group.taught} taught so far
            </span>
          </header>

          <div className="constellation-units">
            {group.units.map((unit) => (
              <div key={unit.unitId} className="constellation-unit">
                <div className="constellation-unit-name" title={unit.unitName}>
                  {unit.unitName}
                </div>
                <div className="star-field">
                  {unit.records.map((record) => {
                    const standard = standards.get(record.standardId)
                    const state = starStateOf(record)
                    return (
                      <button
                        key={record.id}
                        type="button"
                        className="star"
                        data-state={state}
                        data-strength={record.evidenceStrength}
                        data-selected={record.id === selectedId}
                        onClick={() => onSelect(record)}
                        title={`${standard?.standardCode ?? record.standardId} — ${starLabel(record)}`}
                        aria-label={`${standard?.standardCode ?? record.standardId}: ${starLabel(record)}`}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
