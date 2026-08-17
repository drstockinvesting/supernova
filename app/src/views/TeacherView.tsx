/**
 * A teacher's own classrooms.
 *
 * Most teachers here hold four or five sections — 36 hold four, 18 hold five —
 * so landing on one of them and dropping the rest would hide most of the job.
 * This is the index: every section the account is scoped to, as classroom cards,
 * with the teacher's own totals across all of them above.
 *
 * Sections come from the account's `scopeIds`, not from a search over the
 * district. That is the same list Phase 3 will enforce against, so the view is
 * already shaped by the permission it will later be restricted by.
 */

import { useMemo } from 'react'
import { loadSectionsContext, loadStaffIndex } from '../data/client'
import { useAsync } from '../data/useAsync'
import { useSession } from '../session/session'
import { AS_OF_LABEL, CURRENT_SCHOOL_YEAR, formatSchoolYear } from '../lib/dataset'
import {
  ErrorState,
  Loading,
  MetricCard,
  Notice,
  attendanceTone,
  completionTone,
  masteryTone,
  percent,
} from '../ui/primitives'
import { ResearchContext } from '../ui/ResearchContext'
import { ClassroomCard } from './section/ClassroomCard'

export function TeacherView() {
  const { session } = useSession()
  const contextState = useAsync(loadSectionsContext, [])
  const staffState = useAsync(loadStaffIndex, [])

  const sections = useMemo(() => {
    if (!session || !contextState.value) return []
    const scoped = new Set(
      session.user.roleAssignments
        .filter((entry) => entry.scopeType === 'section')
        .flatMap((entry) => entry.scopeIds),
    )
    return contextState.value.sections
      .filter((section) => scoped.has(section.sectionId))
      .sort(
        (a, b) =>
          a.gradeLevel.localeCompare(b.gradeLevel, undefined, { numeric: true }) ||
          (a.period ?? '').localeCompare(b.period ?? '', undefined, { numeric: true }) ||
          a.sectionName.localeCompare(b.sectionName),
      )
  }, [session, contextState.value])

  if (contextState.status === 'error') {
    return (
      <div className="page">
        <ErrorState error={contextState.error} />
      </div>
    )
  }

  if (!session || contextState.status !== 'ready') {
    return (
      <div className="page">
        <Loading what="your classrooms" />
      </div>
    )
  }

  // A teacher account is backed by a Staff record, but the link is nullable in
  // the schema — the display name on the account is the fallback, not a guess.
  const teacher = session.user.principalId
    ? staffState.value?.get(session.user.principalId)
    : undefined
  const teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}` : session.user.displayName

  if (sections.length === 0) {
    return (
      <div className="page stack">
        <h1>Your classrooms</h1>
        <Notice tone="caution">
          This account holds no section assignments for {formatSchoolYear(CURRENT_SCHOOL_YEAR)},
          so there is nothing to show. Section rosters are maintained in the scheduling system.
        </Notice>
      </div>
    )
  }

  // Totals are computed over standards, not by averaging section rates: a
  // section with 90 standards taught and one with 20 should not count equally.
  const taught = sections.reduce((total, section) => total + section.standardsTaughtToDate, 0)
  const mastered = sections.reduce((total, section) => total + section.standardsMastered, 0)
  const masteryRate = taught > 0 ? (100 * mastered) / taught : null
  const students = sections.reduce((total, section) => total + section.studentCount, 0)
  const chronicallyAbsent = sections.reduce(
    (total, section) => total + section.chronicallyAbsentStudents,
    0,
  )
  const interruptionMinutes = sections.reduce(
    (total, section) => total + section.interruptions.totalMinutesLost,
    0,
  )
  const attendance = weighted(sections.map((s) => [s.attendanceRate, s.studentCount]))
  const homework = weighted(sections.map((s) => [s.homeworkCompletionRate, s.studentCount]))

  return (
    <div className="page stack">
      <header className="student-head">
        <div className="stack-tight">
          <div className="eyebrow">Teacher · {formatSchoolYear(CURRENT_SCHOOL_YEAR)}</div>
          <h1>Your classrooms</h1>
          <div className="row subtle">
            <span>{teacherName}</span>
            <span>·</span>
            <span>
              {sections.length} section{sections.length === 1 ? '' : 's'}
            </span>
            <span>·</span>
            <span>{students} students</span>
            <span>·</span>
            <span>as of {AS_OF_LABEL}</span>
          </div>
        </div>
      </header>

      <section className="grid">
        <MetricCard
          label="Mastery of standards taught so far"
          value={percent(masteryRate)}
          note={`${mastered} of ${taught} across your sections`}
          tone={masteryTone(masteryRate)}
        />
        <MetricCard
          label="Attendance"
          value={percent(attendance)}
          note={
            chronicallyAbsent > 0
              ? `${chronicallyAbsent} student place${chronicallyAbsent === 1 ? '' : 's'} above 10% absence`
              : 'no student above 10% absence'
          }
          tone={attendanceTone(attendance)}
        />
        <MetricCard
          label="Homework completion"
          value={percent(homework)}
          note="across your sections"
          tone={completionTone(homework)}
        />
        <MetricCard
          label="Instructional time lost"
          value={`${Math.round(interruptionMinutes / 60)}h`}
          note={`${sections.reduce((t, s) => t + s.interruptions.totalInterruptions, 0)} interruptions logged this year`}
          tone={interruptionMinutes > 60 * 20 ? 'caution' : 'neutral'}
        />
      </section>

      <section className="stack-tight">
        <div className="section-heading">
          <h2>Sections</h2>
          <span className="subtle">open one for the context behind its mastery</span>
        </div>
        <div className="classroom-grid">
          {sections.map((section) => (
            <ClassroomCard key={section.sectionId} section={section} />
          ))}
        </div>
      </section>

      {sections.some((section) => section.instructionalModel === 'departmentalized') ? (
        <Notice>
          <strong>Attendance is a school-day record, not a period one.</strong> The district's
          system records whether a student was in school, so a section's attendance rate is its
          roster's whole-day attendance rather than attendance in that period.
        </Notice>
      ) : null}

      <ResearchContext
        role={session.role}
        metrics={{
          attendanceRate: attendance,
          completionRate: homework,
          disciplineReferralCount: sections.reduce((t, s) => t + s.disciplineReferrals, 0),
        }}
      />
    </div>
  )
}

/** Weighted by student count, skipping sections that report no rate at all. */
function weighted(pairs: [number | null, number][]): number | null {
  let total = 0
  let weight = 0
  for (const [value, count] of pairs) {
    if (value === null) continue
    total += value * count
    weight += count
  }
  return weight > 0 ? total / weight : null
}
