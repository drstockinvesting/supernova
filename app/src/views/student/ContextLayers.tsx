/**
 * The layers that explain the mastery map.
 *
 * The UI/UX document is specific that these sit on the same screen as the outcome
 * rather than behind tabs, because the point is the correlation: an absence in the
 * week a unit opened is only meaningful next to what happened to that unit's
 * standards.
 *
 * Which layers render is decided by the viewer's permissions, not by role names —
 * a guardian account simply does not carry `view_behavior_detail`, so the behaviour
 * layer is absent rather than empty.
 */

import type { ProfileYear, SchoolCalendar } from '../../types/profile'
import { StatusChip, formatDate, percent, type Tone } from '../../ui/primitives'

const ABSENCE_TONE: Record<string, Tone> = {
  absent: 'critical',
  excused_absent: 'caution',
  tardy: 'neutral',
  excused_tardy: 'neutral',
  partial_day: 'caution',
}

/**
 * Absences plotted along the instructional calendar, with the days a unit
 * introduced or developed key content marked underneath.
 *
 * Attendance is stored as exceptions only — a year is ~180 days, 90% of them
 * "present" — so present days are recovered from the calendar rather than read.
 */
export function AttendanceTimeline({
  year,
  calendar,
  keyDates,
}: {
  year: ProfileYear
  calendar: SchoolCalendar | undefined
  keyDates: Map<string, string[]>
}) {
  const exceptions = new Map(
    year.attendance.attendanceExceptions.map((entry) => [entry.date, entry]),
  )
  const days = calendar?.instructionalDays ?? [...exceptions.keys()].sort()
  const metrics = year.attendance.metrics

  // The dataset stops partway through the year; days after it have not happened.
  const elapsed = days.filter((day) => day <= (days[days.length - 1] ?? ''))
  const throughToday = elapsed.slice(0, metricsDayCount(metrics.daysEnrolled, elapsed.length))

  return (
    <section className="card stack-tight">
      <div className="section-heading">
        <h2>Attendance</h2>
        <span className="subtle">
          {metrics.daysPresent} present · {metrics.daysAbsent} absent
          {metrics.tardyCount ? ` · ${metrics.tardyCount} tardy` : ''}
        </span>
      </div>

      <div className="timeline" role="img" aria-label="Attendance across the instructional year">
        {throughToday.map((day) => {
          const exception = exceptions.get(day)
          const key = keyDates.get(day)
          return (
            <span
              key={day}
              className="timeline-day"
              data-status={exception?.status ?? 'present'}
              data-key-instruction={key ? 'true' : 'false'}
              title={
                exception
                  ? `${formatDate(day)} — ${exception.status.replace('_', ' ')}${
                      exception.notes ? `: ${exception.notes}` : ''
                    }${key ? `\nKey instruction: ${key.join('; ')}` : ''}`
                  : key
                    ? `${formatDate(day)} — key instruction: ${key.join('; ')}`
                    : formatDate(day)
              }
            />
          )
        })}
      </div>

      <p className="subtle">
        Each mark is an instructional day. Bars beneath a day indicate key instruction
        for a unit — where an absence costs the most.
      </p>

      {year.attendance.attendanceExceptions.length > 0 ? (
        <details className="details">
          <summary>
            {year.attendance.attendanceExceptions.length} recorded exceptions
          </summary>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Note</th>
                  <th>Key instruction that day</th>
                </tr>
              </thead>
              <tbody>
                {year.attendance.attendanceExceptions.map((entry) => (
                  <tr key={entry.date}>
                    <td>{formatDate(entry.date)}</td>
                    <td>
                      <StatusChip tone={ABSENCE_TONE[entry.status] ?? 'neutral'}>
                        {entry.status.replace(/_/g, ' ')}
                      </StatusChip>
                    </td>
                    <td className="muted">{entry.notes ?? '—'}</td>
                    <td className="muted">{keyDates.get(entry.date)?.join('; ') ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </section>
  )
}

/** Enrolled-day count is authoritative; the calendar may run past the as-of date. */
function metricsDayCount(daysEnrolled: number, available: number): number {
  return Math.min(daysEnrolled || available, available)
}

export function BehaviorLayer({ year }: { year: ProfileYear }) {
  const incidents = year.behavior.incidents
  if (incidents.length === 0) {
    return (
      <section className="card stack-tight">
        <div className="section-heading">
          <h2>Behaviour</h2>
        </div>
        <p className="subtle">No incidents recorded this year.</p>
      </section>
    )
  }

  return (
    <section className="card stack-tight">
      <div className="section-heading">
        <h2>Behaviour</h2>
        <span className="subtle">{incidents.length} recorded</span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Description</th>
              <th>Outcome</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((incident) => (
              <tr key={incident.id}>
                <td>{formatDate(incident.date)}</td>
                <td>
                  <StatusChip
                    tone={
                      incident.incidentType === 'positive_recognition'
                        ? 'strong'
                        : incident.severity === 'high'
                          ? 'critical'
                          : 'caution'
                    }
                  >
                    {incident.incidentType.replace(/_/g, ' ')}
                  </StatusChip>
                </td>
                <td>
                  {incident.description}
                  {incident.subject ? (
                    <span className="subtle"> · {incident.subject}</span>
                  ) : null}
                </td>
                <td className="muted">{incident.outcome ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function HomeworkLayer({ year }: { year: ProfileYear }) {
  const records = year.participation
  if (records.length === 0) return null

  const byPeriod = new Map<number, number[]>()
  for (const record of records) {
    const metrics = record.metrics as {
      completionRateByMarkingPeriod?: { markingPeriod: number; completionRate: number }[]
    }
    for (const entry of metrics.completionRateByMarkingPeriod ?? []) {
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

  const first = periods[0]?.rate
  const last = periods[periods.length - 1]?.rate
  const delta = first !== undefined && last !== undefined ? last - first : null

  return (
    <section className="card stack-tight">
      <div className="section-heading">
        <h2>Homework completion</h2>
        <span className="subtle">by marking period</span>
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

      {delta !== null && Math.abs(delta) >= 5 ? (
        <p className="subtle">
          Completion {delta < 0 ? 'fell' : 'rose'} {Math.abs(delta).toFixed(0)} points between
          the first and most recent marking period.
        </p>
      ) : null}
    </section>
  )
}

export function FamilyEngagementLayer({ year }: { year: ProfileYear }) {
  const engagement = year.familyEngagement
  const events = engagement.contactEvents ?? []

  return (
    <section className="card stack-tight">
      <div className="section-heading">
        <h2>Family contact</h2>
        <span className="subtle">
          {engagement.metrics.engagementLevel} engagement ·{' '}
          {percent(engagement.metrics.responseRate, 0)} response
        </span>
      </div>
      {events.length === 0 ? (
        <p className="subtle">No contact recorded this year.</p>
      ) : (
        <ul className="event-list">
          {events.slice(-6).reverse().map((event, index) => (
            <li key={`${event.date}-${index}`}>
              <span className="mono subtle">{formatDate(event.date)}</span>
              <span>{event.topic}</span>
              <span className="subtle">
                {event.contactType.replace(/_/g, ' ')} · initiated by {event.initiator}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function HealthLayer({ year }: { year: ProfileYear }) {
  const flags = year.health.flags ?? {}
  const raised = Object.entries(flags).filter(([, value]) =>
    Array.isArray(value) ? value.length > 0 : Boolean(value),
  )
  const events = year.health.healthEvents ?? []

  if (raised.length === 0 && events.length === 0) return null

  return (
    <section className="card stack-tight">
      <div className="section-heading">
        <h2>Health and wellness</h2>
        <StatusChip tone="neutral">restricted</StatusChip>
      </div>
      {raised.length > 0 ? (
        <div className="row">
          {raised.map(([flag]) => (
            <StatusChip key={flag} tone="caution">
              {flag.replace(/([A-Z])/g, ' $1').toLowerCase()}
            </StatusChip>
          ))}
        </div>
      ) : null}
      <p className="subtle">{events.length} health office contacts recorded this year.</p>
    </section>
  )
}
