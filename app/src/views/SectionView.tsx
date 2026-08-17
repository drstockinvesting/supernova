/**
 * One classroom, in full — the first view that summarises the student profile
 * rather than showing it.
 *
 * The UI/UX document is explicit that the context layers sit on the same screen
 * as the outcome rather than behind tabs, because the point is the correlation:
 * a 68% unit mastery next to three students who missed the day the unit opened
 * is an explanation, and the same 68% on its own is just a number.
 *
 * The view is scoped to a unit. `keyInstructionDates` are per-unit, so the
 * absence-to-mastery correlation this dataset was built to demonstrate only
 * resolves inside a unit window. A self-contained elementary section teaches six
 * units at once, one per subject, so it opens on the whole year instead — its
 * "current unit" is six different things and choosing one would be arbitrary.
 */

import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { SectionContext, SectionRosterRow, SectionUnit } from '../types/profile'
import {
  loadCalendar,
  loadSchoolIndex,
  loadSectionContextIndex,
  loadSectionDetail,
  loadStaffIndex,
} from '../data/client'
import { useAsync } from '../data/useAsync'
import { useSession } from '../session/session'
import { AS_OF_LABEL, bySubjectOrder, formatSchoolYear, gradeLabel } from '../lib/dataset'
import type { Session } from '../session/roles'
import {
  Breadcrumb,
  type Crumb,
  ErrorState,
  Loading,
  MetricCard,
  NarrativeBlock,
  Notice,
  StatusChip,
  attendanceTone,
  completionTone,
  formatDate,
  masteryTone,
  percent,
  type Tone,
} from '../ui/primitives'
import { ResearchContext } from '../ui/ResearchContext'
import { buildNarrative } from './section/narrative'
import { pacingLabel } from './section/ClassroomCard'

const PACING_TONE: Record<string, Tone> = {
  ahead: 'strong',
  on_track: 'strong',
  slightly_behind: 'caution',
  behind: 'concern',
}

/** The whole year, as an option alongside the individual units. */
const YEAR_TO_DATE = '__year__'

export function SectionView() {
  const { sectionId = '' } = useParams()
  const { session } = useSession()
  const [scope, setScope] = useState<string | null>(null)

  const indexState = useAsync(loadSectionContextIndex, [])
  const detailState = useAsync(() => loadSectionDetail(sectionId), [sectionId])
  const staffState = useAsync(loadStaffIndex, [])
  const schoolsState = useAsync(loadSchoolIndex, [])

  const section = indexState.value?.get(sectionId)
  const detail = detailState.value

  const calendarState = useAsync(
    () =>
      section
        ? loadCalendar(section.schoolId, section.schoolYear)
        : Promise.resolve(undefined),
    [section?.schoolId ?? '', section?.schoolYear ?? ''],
  )

  const units = useMemo(
    () =>
      [...(detail?.units ?? [])].sort(
        (a, b) => bySubjectOrder(a.subject, b.subject) || a.sequence - b.sequence,
      ),
    [detail?.units],
  )

  if (detailState.status === 'error') {
    return (
      <div className="page">
        <ErrorState error={detailState.error} />
      </div>
    )
  }
  if (!session || !section || !detail) {
    return (
      <div className="page">
        <Loading what="classroom" />
      </div>
    )
  }

  const selfContained = section.instructionalModel === 'self_contained'
  // A departmentalized section opens on the unit it is teaching. A self-contained
  // section is teaching six, so it opens on the year and lets the teacher pick.
  const defaultScope = !selfContained && section.activeUnits[0]
    ? section.activeUnits[0].unitId
    : YEAR_TO_DATE
  const activeScope = scope ?? defaultScope
  const unit = units.find((entry) => entry.unitId === activeScope) ?? null

  const teacher = staffState.value?.get(section.teacherId)
  const school = schoolsState.value?.get(section.schoolId)
  const calendar = calendarState.value

  const window = unit ? { start: unit.startDate, end: unit.endDate } : null
  const roster = detail.roster

  // --- Scoped totals --------------------------------------------------------
  const taught = unit
    ? unit.standardsTaughtToDate
    : section.standardsTaughtToDate
  const mastered = unit ? unit.standardsMastered : section.standardsMastered
  const masteryRate = taught > 0 ? (100 * mastered) / taught : null

  const keyDates = buildKeyDates(unit)
  const absences = rosterAbsences(roster, window)
  const missedKeyInstruction = rosterMissedKeyInstruction(roster, keyDates)
  const incidents = rosterIncidents(roster, window)
  const attributed = incidents.filter((entry) => entry.attributedToSection)
  const homework = scopedHomework(roster)

  const interruptions = unit
    ? unit.interruptions
    : {
        count: section.interruptions.totalInterruptions,
        unplanned: section.interruptions.unplannedInterruptions,
        minutesLost: section.interruptions.totalMinutesLost,
      }

  const unitLabel = unit ? unit.name : `${formatSchoolYear(section.schoolYear)} to date`

  const narrative = buildNarrative({
    unitLabel,
    isSingleUnit: Boolean(unit),
    masteryRate,
    standardsTaught: taught,
    standardsMastered: mastered,
    pacing: unit?.pacing ?? null,
    studentCount: section.studentCount,
    chronicallyAbsent: section.chronicallyAbsentStudents,
    absentOnKeyInstruction: missedKeyInstruction.map((entry) => ({
      name: `${entry.row.firstName} ${entry.row.lastName}`,
      dates: entry.dates,
    })),
    attributedIncidents: attributed.length,
    unattributedIncidents: incidents.length - attributed.length,
    interruptions,
    homeworkCompletionRate: homework.rate,
    homeworkTrend: homework.trend,
  })

  return (
    <div className="page stack">
      {/* A classroom is reached from three directions. The trail has to lead back
          where the viewer actually came from — a teacher owns this class, an
          administrator is looking down into it from a building or the district. */}
      <Breadcrumb items={[...trailAbove(session, section, school?.name), { label: section.sectionName }]} />

      <header className="student-head">
        <div className="stack-tight">
          <div className="eyebrow">
            {school?.name ?? section.schoolId} · {gradeLabel(section.gradeLevel)}
            {section.subject === 'all' ? ' · all subjects' : ` · ${section.subject}`}
          </div>
          <h1>{section.sectionName}</h1>
          <div className="row subtle">
            {teacher ? (
              <span>
                {teacher.firstName} {teacher.lastName}
              </span>
            ) : null}
            <span>·</span>
            <span>{section.studentCount} students</span>
            {section.period ? (
              <>
                <span>·</span>
                <span>period {section.period}</span>
              </>
            ) : null}
            {section.roomNumber ? (
              <>
                <span>·</span>
                <span>room {section.roomNumber}</span>
              </>
            ) : null}
            <span>·</span>
            <span>as of {AS_OF_LABEL}</span>
          </div>
        </div>
      </header>

      <UnitSwitch
        units={units}
        active={activeScope}
        selfContained={selfContained}
        onSelect={setScope}
      />

      {unit ? (
        <div className="row subtle unit-window">
          <StatusChip tone={unit.status === 'in_progress' ? 'strong' : 'neutral'}>
            {unit.status.replace(/_/g, ' ')}
          </StatusChip>
          <span>
            {formatDate(unit.startDate)} – {formatDate(unit.endDate)}
          </span>
          <span>·</span>
          <span>{unit.standardIds.length} standards</span>
          <span>·</span>
          <span>{unit.plannedInstructionalDays} planned instructional days</span>
        </div>
      ) : null}

      {unit && unit.status === 'not_started' ? (
        <Notice>
          <strong>This unit has not started.</strong> Its standards are tracked but untaught,
          which is why they show no mastery. Untaught is not the same as unmastered.
        </Notice>
      ) : null}

      <section className="grid">
        <MetricCard
          label={unit ? 'Mastery of this unit' : 'Mastery of standards taught so far'}
          value={percent(masteryRate)}
          // Counted per student, not per standard: a unit of 3 standards across
          // 19 students is 57 demonstrations, and saying "19 of 57 taught" next
          // to a "3 standards" header reads as a contradiction.
          note={`${mastered} of ${taught} demonstrations across ${section.studentCount} students`}
          tone={masteryTone(masteryRate)}
        />
        {unit ? (
          <MetricCard
            label="Pacing"
            value={`${unit.pacing.percentContentCovered}%`}
            note={`content covered · ${unit.pacing.percentTimeElapsed}% of time used · ${pacingLabel(unit.pacing.pacingStatus)}`}
            tone={PACING_TONE[unit.pacing.pacingStatus] ?? 'neutral'}
          />
        ) : (
          <MetricCard
            label="Units"
            value={`${units.filter((entry) => entry.status === 'completed').length}/${units.length}`}
            note={`completed · ${units.filter((entry) => entry.status === 'in_progress').length} in progress`}
          />
        )}
        <MetricCard
          label="Class attendance"
          value={percent(section.attendanceRate)}
          note={
            section.chronicallyAbsentStudents > 0
              ? `${section.chronicallyAbsentStudents} above 10% absence`
              : 'no student above 10% absence'
          }
          tone={attendanceTone(section.attendanceRate)}
        />
        <MetricCard
          label="Homework completion"
          value={percent(homework.rate)}
          note={
            section.studentsWithoutParticipationRecord > 0
              ? `${section.studentsWithoutParticipationRecord} without a record`
              : 'across the roster'
          }
          tone={completionTone(homework.rate)}
        />
      </section>

      <NarrativeBlock title="What explains this">
        <p>{narrative.outcome}</p>
        {narrative.factors.length > 0 ? (
          <ul className="note-list">
            {narrative.factors.map((factor) => (
              <li key={factor}>{factor}</li>
            ))}
          </ul>
        ) : (
          <p className="subtle">
            No absence on a key instruction day, no behaviour incident in this class, and no
            interruption logged in this window. Nothing in the context layers is pulling this
            result down.
          </p>
        )}
        {narrative.actions.length > 0 ? (
          <p>
            <strong>Worth doing:</strong> {narrative.actions.join(' ')}
          </p>
        ) : null}
      </NarrativeBlock>

      {selfContained ? <SubjectBreakdown section={section} /> : null}

      <AttendanceLayer
        roster={roster}
        absences={absences}
        missed={missedKeyInstruction}
        keyDates={keyDates}
        instructionalDays={calendar?.instructionalDays ?? []}
        window={window}
        unitId={unit?.unitId ?? null}
        departmentalized={!selfContained}
      />

      <HomeworkLayer roster={roster} section={section} />

      <BehaviorLayer
        incidents={incidents}
        subject={section.subject}
        selfContained={selfContained}
      />

      <InterruptionsLayer unit={unit} section={section} />

      <RosterGrid roster={roster} unitId={unit?.unitId ?? null} />

      <ResearchContext
        role={session.role}
        metrics={{
          attendanceRate: section.attendanceRate,
          completionRate: homework.rate,
          disciplineReferralCount: section.disciplineReferrals,
        }}
      />
    </div>
  )
}

// --- Unit selector ----------------------------------------------------------

function UnitSwitch({
  units,
  active,
  selfContained,
  onSelect,
}: {
  units: SectionUnit[]
  active: string
  selfContained: boolean
  onSelect: (scope: string) => void
}) {
  const groups = useMemo(() => {
    const map = new Map<string, SectionUnit[]>()
    for (const unit of units) {
      const bucket = map.get(unit.subject)
      if (bucket) bucket.push(unit)
      else map.set(unit.subject, [unit])
    }
    return [...map.entries()]
  }, [units])

  return (
    <div className="unit-switch stack-tight">
      <div className="row">
        <button
          type="button"
          className="button"
          data-active={active === YEAR_TO_DATE}
          onClick={() => onSelect(YEAR_TO_DATE)}
        >
          Year to date
        </button>
        {!selfContained
          ? groups[0]?.[1].map((unit) => (
              <UnitButton key={unit.unitId} unit={unit} active={active} onSelect={onSelect} />
            ))
          : null}
      </div>

      {selfContained
        ? groups.map(([subject, subjectUnits]) => (
            <div key={subject} className="row unit-subject-row">
              <span className="unit-subject subtle">{subject}</span>
              {subjectUnits.map((unit) => (
                <UnitButton key={unit.unitId} unit={unit} active={active} onSelect={onSelect} />
              ))}
            </div>
          ))
        : null}
    </div>
  )
}

function UnitButton({
  unit,
  active,
  onSelect,
}: {
  unit: SectionUnit
  active: string
  onSelect: (scope: string) => void
}) {
  // A not-started unit is shown rather than hidden, so the year's shape stays
  // visible, but it is not selectable — there is nothing yet to look at.
  const disabled = unit.status === 'not_started'
  return (
    <button
      type="button"
      className="button"
      data-active={unit.unitId === active}
      data-status={unit.status}
      disabled={disabled}
      title={disabled ? 'Not started — no evidence of mastery yet' : unit.name}
      onClick={() => onSelect(unit.unitId)}
    >
      Unit {unit.sequence}
      {unit.status === 'in_progress' ? <span className="unit-dot" aria-label="in progress" /> : null}
    </button>
  )
}

// --- Context layers ---------------------------------------------------------

function SubjectBreakdown({ section }: { section: SectionContext }) {
  const rows = Object.entries(section.masteryBySubject).sort((a, b) =>
    bySubjectOrder(a[0], b[0]),
  )
  if (rows.length === 0) return null

  return (
    <section className="card stack-tight">
      <div className="section-heading">
        <h2>By subject</h2>
        {/* Always the whole year. It sits beside unit-scoped figures, so it has
            to say which it is rather than let the reader assume. */}
        <span className="subtle">all six subjects, year to date</span>
      </div>
      <p className="subtle">
        A self-contained section is one teacher across the whole curriculum, so its headline
        rate spans six subjects at once. The breakdown is where it becomes readable.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Subject</th>
              <th className="numeric">Mastered</th>
              <th className="numeric">Taught</th>
              <th className="numeric">Rate</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map(([subject, entry]) => (
              <tr key={subject}>
                <td>{subject}</td>
                <td className="numeric">{entry.standardsMastered}</td>
                <td className="numeric">{entry.standardsTaughtToDate}</td>
                <td className="numeric">{percent(entry.masteryRate, 0)}</td>
                <td className="rate-cell">
                  <div className="rate-track">
                    <div
                      className="rate-fill"
                      data-tone={masteryTone(entry.masteryRate)}
                      style={{ width: `${entry.masteryRate}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function AttendanceLayer({
  roster,
  absences,
  missed,
  keyDates,
  instructionalDays,
  window,
  unitId,
  departmentalized,
}: {
  roster: SectionRosterRow[]
  absences: Map<string, number>
  missed: { row: SectionRosterRow; dates: string[] }[]
  keyDates: Map<string, string>
  instructionalDays: string[]
  window: { start: string; end: string } | null
  unitId: string | null
  departmentalized: boolean
}) {
  const days = window
    ? instructionalDays.filter((day) => day >= window.start && day <= window.end)
    : instructionalDays.filter((day) => day <= LAST_DAY)

  return (
    <section className="card stack-tight">
      <div className="section-heading">
        <h2>Attendance</h2>
        <span className="subtle">
          {[...absences.values()].reduce((total, count) => total + count, 0)} absences across{' '}
          {roster.length} students
        </span>
      </div>

      <div className="timeline" role="img" aria-label="Roster absences across the unit">
        {days.map((day) => {
          const count = absences.get(day) ?? 0
          const key = keyDates.get(day)
          return (
            <span
              key={day}
              className="timeline-day"
              data-status={count === 0 ? 'present' : count > 2 ? 'absent' : 'excused_absent'}
              data-key-instruction={key ? 'true' : 'false'}
              title={
                `${formatDate(day)} — ${count} absent` + (key ? `\nKey instruction: ${key}` : '')
              }
            />
          )
        })}
      </div>

      <p className="subtle">
        Each mark is an instructional day, shaded by how many of the roster were out.
        {window
          ? ' Bars beneath a day mark key instruction for this unit — where an absence costs the most.'
          : ''}
      </p>

      {/* Key instruction dates belong to a unit. Across the whole year there is
          nothing to read an absence against, so the view says that rather than
          reporting an all-clear it has not actually checked. */}
      {!window ? (
        <p className="subtle">
          Open a unit above to see which absences fell on its key instruction days.
        </p>
      ) : missed.length > 0 ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Absent through key instruction</th>
                <th>Dates missed</th>
                <th className="numeric">Mastery in this unit</th>
              </tr>
            </thead>
            <tbody>
              {missed.map(({ row, dates }) => {
                // Scoped to the unit whose instruction they missed. The section
                // rate would dilute the very thing this table is showing.
                const scoped = unitId ? row.masteryByUnit[unitId] : null
                const rate =
                  scoped && scoped.taught > 0
                    ? (100 * scoped.mastered) / scoped.taught
                    : null
                return (
                  <tr key={row.studentId}>
                    <td>
                      <Link to={`/student/${row.studentId}`}>
                        {row.firstName} {row.lastName}
                      </Link>
                    </td>
                    <td className="muted">
                      {dates.map((date) => formatDate(date)).join(', ')}
                      <span className="subtle"> — {keyDates.get(dates[0]) ?? ''}</span>
                    </td>
                    <td className="numeric">
                      {rate === null ? 'not yet taught' : percent(rate, 0)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="subtle">Nobody on this roster was absent on a key instruction day.</p>
      )}

      {departmentalized ? (
        <Notice>
          <strong>This is whole-day attendance.</strong> The district records whether a student
          was in school, not whether they were in this period, so a student marked present may
          still have missed this class.
        </Notice>
      ) : null}
    </section>
  )
}

function HomeworkLayer({
  roster,
  section,
}: {
  roster: SectionRosterRow[]
  section: SectionContext
}) {
  const byPeriod = new Map<number, number[]>()
  for (const row of roster) {
    for (const entry of row.completionRateByMarkingPeriod) {
      const bucket = byPeriod.get(entry.markingPeriod)
      if (bucket) bucket.push(entry.completionRate)
      else byPeriod.set(entry.markingPeriod, [entry.completionRate])
    }
  }

  const periods = [...byPeriod.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([period, rates]) => ({
      period,
      rate: rates.reduce((total, rate) => total + rate, 0) / rates.length,
    }))

  if (periods.length === 0) return null

  const first = periods[0].rate
  const last = periods[periods.length - 1].rate
  const delta = last - first

  return (
    <section className="card stack-tight">
      <div className="section-heading">
        <h2>Homework completion</h2>
        <span className="subtle">by marking period, across the roster</span>
      </div>

      <div className="bars">
        {periods.map((entry) => (
          <div key={entry.period} className="bar">
            <div className="bar-track">
              <div className="bar-fill" style={{ height: `${Math.max(2, entry.rate)}%` }} />
            </div>
            <span className="bar-value numeric">{entry.rate.toFixed(0)}%</span>
            <span className="subtle">Q{entry.period}</span>
          </div>
        ))}
      </div>

      {Math.abs(delta) >= 5 ? (
        <p className="subtle">
          Completion {delta < 0 ? 'fell' : 'rose'} {Math.abs(delta).toFixed(0)} points between
          the first and most recent marking period.
        </p>
      ) : null}

      {section.studentsWithoutParticipationRecord > 0 ? (
        <p className="subtle">
          {section.studentsWithoutParticipationRecord} student on this roster has no homework
          record for this section. That is a gap in the record, not a completion rate of zero.
        </p>
      ) : null}
    </section>
  )
}

function BehaviorLayer({
  incidents,
  subject,
  selfContained,
}: {
  incidents: ScopedIncident[]
  subject: string
  selfContained: boolean
}) {
  const attributed = incidents.filter((entry) => entry.attributedToSection)
  const other = incidents.length - attributed.length

  return (
    <section className="card stack-tight">
      <div className="section-heading">
        <h2>Behaviour</h2>
        <span className="subtle">
          {attributed.length} in this class
          {other > 0 ? ` · ${other} elsewhere` : ''}
        </span>
      </div>

      {attributed.length === 0 ? (
        <p className="subtle">No incident in this class fell inside this window.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Student</th>
                <th>Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {attributed.map((entry) => (
                <tr key={`${entry.studentId}-${entry.date}-${entry.description}`}>
                  <td>{formatDate(entry.date)}</td>
                  <td>
                    <Link to={`/student/${entry.studentId}`}>{entry.studentName}</Link>
                  </td>
                  <td>
                    <StatusChip
                      tone={
                        entry.incidentType === 'positive_recognition'
                          ? 'strong'
                          : entry.severity === 'high'
                            ? 'critical'
                            : 'caution'
                      }
                    >
                      {entry.incidentType.replace(/_/g, ' ')}
                    </StatusChip>
                  </td>
                  <td>{entry.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!selfContained && other > 0 ? (
        <Notice>
          <strong>{other} further incident{other === 1 ? '' : 's'}</strong> involving students on
          this roster fell in this window but carry no subject or a different one, so they
          cannot be attributed to {subject}. Behaviour is recorded per student per day, not per
          period — assigning them to this class would be guesswork.
        </Notice>
      ) : null}
    </section>
  )
}

function InterruptionsLayer({
  unit,
  section,
}: {
  unit: SectionUnit | null
  section: SectionContext
}) {
  const metrics = section.interruptions
  const scoped = unit ? unit.interruptions : null

  return (
    <section className="card stack-tight">
      <div className="section-heading">
        <h2>Interruptions</h2>
        <span className="subtle">teacher-logged</span>
      </div>

      <dl className="detail-facts">
        <dt>{unit ? 'This unit' : 'This year'}</dt>
        <dd>
          {scoped ? scoped.count : metrics.totalInterruptions} interruptions
          {scoped
            ? scoped.unplanned > 0
              ? `, ${scoped.unplanned} unplanned`
              : ', all planned'
            : `, ${metrics.unplannedInterruptions} unplanned`}
        </dd>
        <dt>Instructional time lost</dt>
        <dd>
          {formatMinutes(scoped ? scoped.minutesLost : metrics.totalMinutesLost)}
        </dd>
        <dt>Average per unit</dt>
        <dd>{metrics.averageInterruptionsPerUnit.toFixed(2)}</dd>
      </dl>

      {(scoped ? scoped.count : metrics.totalInterruptions) === 0 ? (
        <p className="subtle">No interruption was logged in this window.</p>
      ) : null}
    </section>
  )
}

function RosterGrid({
  roster,
  unitId,
}: {
  roster: SectionRosterRow[]
  unitId: string | null
}) {
  const rows = useMemo(
    () =>
      [...roster].sort((a, b) =>
        a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName),
      ),
    [roster],
  )

  return (
    <section className="card stack-tight">
      <div className="section-heading">
        <h2>Students</h2>
        <span className="subtle">
          {rows.length} on this roster{unitId ? ' · mastery within this unit' : ''}
        </span>
      </div>

      <div className="roster-grid">
        {rows.map((row) => {
          const scoped = unitId ? row.masteryByUnit[unitId] : null
          const taught = unitId ? (scoped?.taught ?? 0) : row.standardsTaughtToDate
          const mastered = unitId ? (scoped?.mastered ?? 0) : row.standardsMastered
          const rate = taught > 0 ? (100 * mastered) / taught : null

          return (
            <Link
              key={row.studentId}
              className="roster-card"
              to={`/student/${row.studentId}`}
              data-tone={masteryTone(rate)}
            >
              <span className="roster-name">
                {row.firstName} {row.lastName}
              </span>
              <span className="roster-mastery numeric">
                {rate === null ? 'not yet taught' : percent(rate, 0)}
              </span>
              <span className="subtle">
                {taught === 0 ? 'no standards taught here' : `${mastered} of ${taught} standards`}
              </span>
              <span className="roster-flags">
                {/* Both counts are for the year, unlike the unit-scoped figures
                    above them, so each says so rather than being read as this
                    unit's. */}
                {row.chronicAbsenteeismFlag ? (
                  <StatusChip tone="concern" dot={false}>
                    {row.daysAbsent} absences this year
                  </StatusChip>
                ) : null}
                {row.disciplineReferralCount > 0 ? (
                  <StatusChip tone="caution" dot={false}>
                    {row.disciplineReferralCount} referral
                    {row.disciplineReferralCount === 1 ? '' : 's'} this year
                  </StatusChip>
                ) : null}
                {!row.hasParticipationRecord ? (
                  <StatusChip tone="neutral" dot={false}>
                    no homework record
                  </StatusChip>
                ) : null}
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

// --- Derivations ------------------------------------------------------------

/** The crumbs above a classroom, which depend on who is looking at it. */
function trailAbove(
  session: Session,
  section: SectionContext,
  schoolName: string | undefined,
): Crumb[] {
  const building = { label: schoolName ?? section.schoolId, to: `/school/${section.schoolId}` }
  switch (session.assignment.scopeType) {
    case 'district':
      return [{ label: 'District', to: '/district' }, building]
    case 'school':
      return [building]
    case 'section':
      return [{ label: 'Your classrooms', to: '/teacher' }]
    default:
      return []
  }
}

const LAST_DAY = '2025-02-10'

interface ScopedIncident {
  studentId: string
  studentName: string
  date: string
  incidentType: string
  severity: string | null
  description: string
  attributedToSection: boolean
}

/** Date -> what the unit says happened that day, for the timeline and the table. */
function buildKeyDates(unit: SectionUnit | null): Map<string, string> {
  const map = new Map<string, string>()
  for (const entry of unit?.keyInstructionDates ?? []) {
    map.set(entry.date, entry.description)
  }
  return map
}

/** How many of the roster were out on each day in the window. */
function rosterAbsences(
  roster: SectionRosterRow[],
  window: { start: string; end: string } | null,
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const row of roster) {
    for (const entry of row.attendanceExceptions) {
      if (entry.status === 'tardy' || entry.status === 'excused_tardy') continue
      if (window && (entry.date < window.start || entry.date > window.end)) continue
      counts.set(entry.date, (counts.get(entry.date) ?? 0) + 1)
    }
  }
  return counts
}

/**
 * Who was out on a day the unit flagged as key instruction. This is the
 * correlation the dataset was generated to make visible, so it names students
 * rather than reporting a count.
 */
function rosterMissedKeyInstruction(
  roster: SectionRosterRow[],
  keyDates: Map<string, string>,
): { row: SectionRosterRow; dates: string[] }[] {
  if (keyDates.size === 0) return []
  const result: { row: SectionRosterRow; dates: string[] }[] = []
  for (const row of roster) {
    const dates = row.attendanceExceptions
      .filter(
        (entry) =>
          keyDates.has(entry.date) &&
          entry.status !== 'tardy' &&
          entry.status !== 'excused_tardy',
      )
      .map((entry) => entry.date)
    if (dates.length > 0) result.push({ row, dates })
  }
  return result.sort((a, b) => b.dates.length - a.dates.length)
}

function rosterIncidents(
  roster: SectionRosterRow[],
  window: { start: string; end: string } | null,
): ScopedIncident[] {
  const result: ScopedIncident[] = []
  for (const row of roster) {
    for (const incident of row.behaviorIncidents) {
      if (window && (incident.date < window.start || incident.date > window.end)) continue
      result.push({
        studentId: row.studentId,
        studentName: `${row.firstName} ${row.lastName}`,
        date: incident.date,
        incidentType: incident.incidentType,
        severity: incident.severity,
        description: incident.description,
        attributedToSection: incident.attributedToSection,
      })
    }
  }
  return result.sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Homework is measured per marking period, not per unit — the assignment list
 * each profile retains is a sample, while the marking-period rates are complete.
 * Reporting the section rate and its trend is what the data actually supports.
 */
function scopedHomework(roster: SectionRosterRow[]): { rate: number | null; trend: number | null } {
  const rates = roster
    .map((row) => row.homeworkCompletionRate)
    .filter((value): value is number => value !== null)
  const rate = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : null

  const byPeriod = new Map<number, number[]>()
  for (const row of roster) {
    for (const entry of row.completionRateByMarkingPeriod) {
      const bucket = byPeriod.get(entry.markingPeriod)
      if (bucket) bucket.push(entry.completionRate)
      else byPeriod.set(entry.markingPeriod, [entry.completionRate])
    }
  }
  const periods = [...byPeriod.entries()].sort((a, b) => a[0] - b[0])
  const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length
  const trend =
    periods.length >= 2
      ? mean(periods[periods.length - 1][1]) - mean(periods[0][1])
      : null

  return { rate, trend }
}

function formatMinutes(minutes: number): string {
  if (minutes === 0) return 'none'
  if (minutes < 60) return `${minutes} minutes`
  return `${(minutes / 60).toFixed(1)} hours`
}
