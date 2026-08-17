/**
 * One student, in full. The base of the fractal.
 *
 * Everything the outer layers show — a classroom's mastery rate, a school's
 * attendance, a district trend — is an aggregate of this view. Building it first
 * means the rollups above it summarise something already known to be true.
 */

import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { Evidence, MasteryRecord } from '../types/supernova'
import type { StudentProfile } from '../types/profile'
import {
  loadCalendars,
  loadCurriculumUnits,
  loadProfileById,
  loadSchoolIndex,
  loadStandardIndex,
  loadStudentEvidence,
} from '../data/client'
import { useAsync } from '../data/useAsync'
import { useSession } from '../session/session'
import { AS_OF_LABEL, CURRENT_SCHOOL_YEAR, formatSchoolYear, gradeLabel } from '../lib/dataset'
import {
  ErrorState,
  Loading,
  MetricCard,
  Notice,
  StatusChip,
  attendanceTone,
  completionTone,
  formatDate,
  masteryTone,
  percent,
} from '../ui/primitives'
import { ResearchContext } from '../ui/ResearchContext'
import { MasteryConstellation } from './student/MasteryConstellation'
import { StandardDetail } from './student/StandardDetail'
import {
  AttendanceTimeline,
  BehaviorLayer,
  FamilyEngagementLayer,
  HealthLayer,
  HomeworkLayer,
} from './student/ContextLayers'

export function StudentView() {
  const { studentId = '' } = useParams()
  return <StudentProfileScreen studentId={studentId} />
}

/**
 * Shared with the family view, which renders the same student through a guardian's
 * narrower permission set rather than a different layout. The interface a family
 * sees should be the interface the school sees, minus what a family should not see.
 */
export function StudentProfileScreen({
  studentId,
  audience = 'staff',
}: {
  studentId: string
  audience?: 'staff' | 'family'
}) {
  const { session } = useSession()
  const [selected, setSelected] = useState<MasteryRecord | null>(null)
  const [year, setYear] = useState<string | null>(null)

  const profileState = useAsync(() => loadProfileById(studentId), [studentId])
  const standardsState = useAsync(loadStandardIndex, [])
  const unitsState = useAsync(loadCurriculumUnits, [])
  const calendarsState = useAsync(loadCalendars, [])
  const schoolsState = useAsync(loadSchoolIndex, [])

  const profile = profileState.value
  const activeYear = year ?? profile?.schoolYears[profile.schoolYears.length - 1] ?? null

  const evidenceState = useAsync(
    () =>
      selected && profile
        ? loadStudentEvidence(profile.student.schoolId, profile.studentId)
        : Promise.resolve(null),
    [selected?.id ?? '', profile?.studentId ?? ''],
  )

  const units = useMemo(
    () => new Map((unitsState.value ?? []).map((unit) => [unit.id, unit])),
    [unitsState.value],
  )

  /** Instructional dates a unit flagged as key, so absences can be read against them. */
  const keyDates = useMemo(() => {
    const map = new Map<string, string[]>()
    if (!profile || !activeYear) return map
    const sectionIds = new Set(profile.years[activeYear]?.sectionIds ?? [])
    for (const unit of unitsState.value ?? []) {
      if (!sectionIds.has(unit.sectionId)) continue
      for (const entry of unit.keyInstructionDates ?? []) {
        const bucket = map.get(entry.date)
        const label = `${unit.name} — ${entry.description}`
        if (bucket) bucket.push(label)
        else map.set(entry.date, [label])
      }
    }
    return map
  }, [profile, activeYear, unitsState.value])

  if (profileState.status === 'error') return <Page><ErrorState error={profileState.error} /></Page>
  if (!profile || !activeYear || !session) return <Page><Loading what="student profile" /></Page>

  const year_ = profile.years[activeYear]
  if (!year_) return <Page><Loading what="school year" /></Page>

  const summary = year_.summary
  const student = profile.student
  const school = schoolsState.value?.get(student.schoolId)
  const calendar = (calendarsState.value ?? []).find(
    (entry) => entry.schoolId === student.schoolId && entry.schoolYear === activeYear,
  )

  const isCurrentYear = activeYear === CURRENT_SCHOOL_YEAR

  // A year can be on record without holding any mastery data: a student now in
  // grade 6 spent grade 5 in a different building, and this profile carries their
  // attendance for that year but not their coursework. Rendering the summary's
  // 0.0% would assert they mastered nothing, which is the opposite of true.
  const hasMasteryRecord = year_.mastery.length > 0
  const schoolThatYear = (schoolsState.value ? [...schoolsState.value.values()] : []).find(
    (entry) => entry.gradesCovered.includes(year_.gradeLevel),
  )
  const qualityFlags = student.metadata?.qualityFlags ?? []
  const isTransfer = qualityFlags.includes('transferred_from_outside_district')
  const historyNotes = year_.priorAchievement.metadata?.historicalDataQualityNotes ?? []

  // Permissions come from the account, not from the route. A guardian holds
  // view_attendance_detail and view_evidence_artifacts but not behaviour or health.
  const canSeeAttendance = session.can('view_attendance_detail')
  const canSeeBehavior = session.can('view_behavior_detail') && audience === 'staff'
  const canSeeHealth = session.can('view_health_detail') && audience === 'staff'
  const canSeeEvidence = session.can('view_evidence_artifacts')

  const artifacts: Evidence[] | null =
    selected && evidenceState.status === 'ready' && evidenceState.value
      ? (evidenceState.value.evidenceByYear[activeYear] ?? []).filter(
          (artifact) => artifact.masteryRecordId === selected.id,
        )
      : null

  return (
    <Page>
      <header className="student-head">
        <div className="stack-tight">
          <div className="eyebrow">
            {school?.name ?? student.schoolId} · {gradeLabel(year_.gradeLevel)}
          </div>
          <h1>
            {student.firstName} {student.lastName}
          </h1>
          <div className="row subtle">
            <span className="mono">{student.studentId}</span>
            <span>·</span>
            <span>{student.enrollmentStatus}</span>
            <span>·</span>
            <span>enrolled {student.enrollmentDate}</span>
          </div>
        </div>

        <div className="year-switch" role="group" aria-label="School year">
          {profile.schoolYears.map((entry) => (
            <button
              key={entry}
              type="button"
              className="button"
              data-active={entry === activeYear}
              onClick={() => {
                setYear(entry)
                setSelected(null)
              }}
            >
              {formatSchoolYear(entry)}
            </button>
          ))}
        </div>
      </header>

      {isTransfer ? (
        <Notice tone="caution">
          <strong>Transferred from outside the district.</strong> No history has been
          inferred to fill the gap — a blank stretch here means the record is missing, not
          that nothing was learned.
          {historyNotes.length > 0 ? (
            <ul className="note-list">
              {historyNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}
        </Notice>
      ) : null}

      {!isCurrentYear && hasMasteryRecord ? (
        <Notice>
          <strong>{formatSchoolYear(activeYear)} is a closed year.</strong> Mastery records,
          benchmarks, and screeners are retained; the individual evidence artifacts behind
          them are not carried forward. What a standard was judged on that year is no longer
          inspectable.
        </Notice>
      ) : null}

      {!hasMasteryRecord ? (
        <Notice tone="caution">
          <strong>No mastery record is held for {formatSchoolYear(activeYear)}.</strong>{' '}
          {student.firstName} was in {gradeLabel(year_.gradeLevel).toLowerCase()} that year
          {schoolThatYear && schoolThatYear.id !== student.schoolId
            ? `, a ${schoolThatYear.name} year,`
            : ''}{' '}
          and this profile carries their attendance for it but not their coursework. That is
          a gap in the record, not a year without learning — it is shown as absent rather
          than as zero.
        </Notice>
      ) : null}

      <section className="grid">
        {hasMasteryRecord ? (
          <MetricCard
            label="Mastery of standards taught so far"
            value={percent(summary.masteryRate)}
            note={`${summary.standardsMastered} of ${summary.standardsTaughtToDate} taught · ${summary.standardsNotYetTaught} not yet taught`}
            tone={masteryTone(summary.masteryRate)}
          />
        ) : null}
        {canSeeAttendance ? (
          <MetricCard
            label="Attendance"
            value={percent(summary.attendanceRate)}
            note={
              summary.chronicAbsenteeismFlag
                ? 'Chronically absent — above 10% of days'
                : `${year_.attendance.metrics.daysAbsent} days absent`
            }
            tone={attendanceTone(summary.attendanceRate)}
          />
        ) : null}
        <MetricCard
          label="Homework completion"
          value={percent(summary.homeworkCompletionRate)}
          note="across all sections this year"
          tone={completionTone(summary.homeworkCompletionRate)}
        />
        {canSeeBehavior ? (
          <MetricCard
            label="Behaviour incidents"
            value={summary.totalBehaviorIncidents}
            note={`${summary.disciplineReferralCount} discipline referrals`}
            tone={summary.disciplineReferralCount > 3 ? 'concern' : 'neutral'}
          />
        ) : null}
      </section>

      {hasMasteryRecord ? (
      <section className="stack-tight">
        <div className="section-heading">
          <h2>Mastery constellation</h2>
          <span className="subtle">
            {isCurrentYear ? `as of ${AS_OF_LABEL}` : formatSchoolYear(activeYear)}
          </span>
        </div>

        <div className="constellation-layout" data-open={selected ? 'true' : 'false'}>
          <MasteryConstellation
            records={year_.mastery}
            units={units}
            standards={standardsState.value ?? new Map()}
            selectedId={selected?.id ?? null}
            onSelect={(record) => setSelected(record)}
          />

          {selected ? (
            <StandardDetail
              record={selected}
              standard={standardsState.value?.get(selected.standardId)}
              artifacts={isCurrentYear ? artifacts : []}
              unitName={
                selected.curriculumUnitId ? units.get(selected.curriculumUnitId)?.name : undefined
              }
              canSeeEvidence={canSeeEvidence && isCurrentYear}
              onClose={() => setSelected(null)}
            />
          ) : null}
        </div>
      </section>
      ) : null}

      {hasMasteryRecord ? <SubjectBreakdown summary={summary} /> : null}

      <BenchmarkSection profile={profile} year={activeYear} />

      {canSeeAttendance ? (
        <AttendanceTimeline year={year_} calendar={calendar} keyDates={keyDates} />
      ) : null}
      <HomeworkLayer year={year_} />
      {canSeeBehavior ? <BehaviorLayer year={year_} /> : null}
      {canSeeHealth ? <HealthLayer year={year_} /> : null}
      {audience === 'staff' ? <FamilyEngagementLayer year={year_} /> : null}

      <ResearchContext
        role={session.role}
        metrics={{
          attendanceRate: summary.attendanceRate,
          disciplineReferralCount: summary.disciplineReferralCount,
          completionRate: summary.homeworkCompletionRate,
          responseRate: year_.familyEngagement.metrics.responseRate,
          hasIncompletePriorHistory: isTransfer,
        }}
      />
    </Page>
  )
}

function Page({ children }: { children: React.ReactNode }) {
  return <div className="page stack">{children}</div>
}

function SubjectBreakdown({ summary }: { summary: StudentProfile['years'][string]['summary'] }) {
  const rows = Object.entries(summary.masteryBySubject).sort((a, b) =>
    a[0].localeCompare(b[0]),
  )
  if (rows.length === 0) return null

  return (
    <section className="card stack-tight">
      <div className="section-heading">
        <h2>By subject</h2>
        <span className="subtle">standards taught to date</span>
      </div>
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
                <td className="numeric">{entry.mastered}</td>
                <td className="numeric">{entry.total}</td>
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

function BenchmarkSection({ profile, year }: { profile: StudentProfile; year: string }) {
  const prior = profile.years[year]?.priorAchievement
  const benchmarks = prior?.benchmarkResults ?? []
  const screeners = prior?.screenerResults ?? []
  if (benchmarks.length === 0 && screeners.length === 0) return null

  return (
    <section className="card stack-tight">
      <div className="section-heading">
        <h2>Benchmarks and screeners</h2>
        <span className="subtle">administered to date</span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Assessment</th>
              <th>Subject</th>
              <th>Date</th>
              <th className="numeric">Score</th>
              <th>Level</th>
            </tr>
          </thead>
          <tbody>
            {benchmarks.map((entry, index) => (
              <tr key={`${entry.assessmentName}-${entry.subject}-${index}`}>
                <td>{entry.assessmentName}</td>
                <td>{entry.subject}</td>
                <td>{formatDate(entry.date)}</td>
                <td className="numeric">{entry.score}</td>
                <td>
                  <StatusChip
                    tone={
                      entry.performanceLevel === 'above_grade_level'
                        ? 'strong'
                        : entry.performanceLevel === 'at_grade_level'
                          ? 'caution'
                          : 'concern'
                    }
                  >
                    {entry.performanceLevel.replace(/_/g, ' ')}
                  </StatusChip>
                </td>
              </tr>
            ))}
            {screeners.map((entry, index) => (
              <tr key={`${entry.screenerName}-${index}`}>
                <td>{entry.screenerName}</td>
                <td className="muted">screener</td>
                <td>{formatDate(entry.date)}</td>
                <td className="numeric">{entry.score}</td>
                <td>
                  <StatusChip
                    tone={
                      entry.riskLevel === 'low'
                        ? 'strong'
                        : entry.riskLevel === 'moderate'
                          ? 'caution'
                          : 'concern'
                    }
                  >
                    {entry.riskLevel} risk
                  </StatusChip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
