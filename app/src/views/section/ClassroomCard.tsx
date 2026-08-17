/**
 * One classroom, at a glance.
 *
 * The UI/UX document specifies this card's contents exactly — pacing, current
 * unit mastery, class attendance, interruptions this unit, and warning rows for
 * absence and behaviour concerns. It takes a `SectionContext` and nothing about
 * who is looking at it, so the teacher's own index and the building
 * administrator's grid render the identical component over the identical data.
 *
 * Tone comes from the shared thresholds in `ui/primitives`. A rate that reads as
 * concerning here has to read as concerning on the district view too, or the
 * colour language stops carrying meaning across zoom levels.
 */

import { Link } from 'react-router-dom'
import type { SectionContext, SectionUnitSummary } from '../../types/profile'
import {
  StatusChip,
  attendanceTone,
  masteryTone,
  percent,
  type Tone,
} from '../../ui/primitives'
import { bySubjectOrder, gradeLabel } from '../../lib/dataset'

const PACING_TONE: Record<SectionUnitSummary['pacing']['pacingStatus'], Tone> = {
  ahead: 'strong',
  on_track: 'strong',
  slightly_behind: 'caution',
  behind: 'concern',
}

export function pacingLabel(status: SectionUnitSummary['pacing']['pacingStatus']): string {
  return status.replace(/_/g, ' ')
}

/** Units in progress, in curriculum order — six of them for self-contained elementary. */
export function orderedActiveUnits(section: SectionContext): SectionUnitSummary[] {
  return [...section.activeUnits].sort(
    (a, b) => bySubjectOrder(a.subject, b.subject) || a.sequence - b.sequence,
  )
}

export function ClassroomCard({
  section,
  teacherName,
}: {
  section: SectionContext
  teacherName?: string
}) {
  const units = orderedActiveUnits(section)

  // A departmentalized section teaches one unit at a time, so its card can name
  // "the current unit". A self-contained elementary section teaches six at once,
  // and picking one of them would be arbitrary — it reports across them instead.
  const single = units.length === 1 ? units[0] : null
  const unitTaught = units.reduce((total, unit) => total + unit.standardsTaughtToDate, 0)
  const unitMastered = units.reduce((total, unit) => total + unit.standardsMastered, 0)
  const unitRate = unitTaught > 0 ? (100 * unitMastered) / unitTaught : null
  const unitInterruptions = units.reduce((total, unit) => total + unit.interruptions.count, 0)

  const behaviorConcerns = section.attributedBehaviorIncidents

  return (
    <Link className="card classroom-card" to={`/section/${section.sectionId}`}>
      <div className="stack-tight">
        <div className="eyebrow">
          {teacherName ? `${teacherName} · ` : ''}
          {gradeLabel(section.gradeLevel)}
          {section.subject === 'all' ? ' · all subjects' : ` · ${section.subject}`}
        </div>
        <h3 className="classroom-name">{section.sectionName}</h3>
        <div className="subtle">
          {section.studentCount} students
          {section.period ? ` · period ${section.period}` : ''}
          {section.roomNumber ? ` · room ${section.roomNumber}` : ''}
        </div>
      </div>

      <dl className="classroom-facts">
        <Fact
          label="Pacing"
          value={
            single
              ? `${single.pacing.percentContentCovered}%`
              : units.length > 0
                ? `${Math.round(
                    units.reduce(
                      (total, unit) => total + unit.pacing.percentContentCovered,
                      0,
                    ) / units.length,
                  )}%`
                : '—'
          }
          note={
            single ? (
              <StatusChip tone={PACING_TONE[single.pacing.pacingStatus]}>
                {pacingLabel(single.pacing.pacingStatus)}
              </StatusChip>
            ) : units.length > 0 ? (
              <span className="subtle">across {units.length} units</span>
            ) : null
          }
        />
        <Fact
          label={single ? 'Current unit mastery' : 'Current units mastery'}
          value={percent(unitRate, 0)}
          tone={masteryTone(unitRate)}
          note={<span className="subtle">{unitMastered} of {unitTaught} taught</span>}
        />
        <Fact
          label="Class attendance"
          value={percent(section.attendanceRate, 0)}
          tone={attendanceTone(section.attendanceRate)}
        />
        <Fact
          label={units.length === 1 ? 'Interruptions this unit' : 'Interruptions, current units'}
          value={unitInterruptions}
          note={
            <span className="subtle">
              {section.interruptions.totalInterruptions} this year
            </span>
          }
        />
      </dl>

      <div className="classroom-flags">
        {section.chronicallyAbsentStudents > 0 ? (
          <StatusChip tone="concern">
            {section.chronicallyAbsentStudents} student
            {section.chronicallyAbsentStudents === 1 ? '' : 's'} above 10% absence
          </StatusChip>
        ) : null}
        {behaviorConcerns > 0 ? (
          <StatusChip tone="caution">
            {behaviorConcerns} behaviour incident{behaviorConcerns === 1 ? '' : 's'} in this class
          </StatusChip>
        ) : null}
        {section.studentsWithoutParticipationRecord > 0 ? (
          <StatusChip tone="neutral">
            {section.studentsWithoutParticipationRecord} without a homework record
          </StatusChip>
        ) : null}
      </div>
    </Link>
  )
}

function Fact({
  label,
  value,
  note,
  tone = 'neutral',
}: {
  label: string
  value: React.ReactNode
  note?: React.ReactNode
  tone?: Tone
}) {
  return (
    <div className="classroom-fact" data-tone={tone}>
      <dt>{label}</dt>
      <dd>
        <span className="classroom-fact-value numeric">{value}</span>
        {note ? <span className="classroom-fact-note">{note}</span> : null}
      </dd>
    </div>
  )
}
