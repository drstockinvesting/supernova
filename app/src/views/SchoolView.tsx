/**
 * One building: its grades, its subjects, its teachers, and its classrooms.
 *
 * This is the view the UI/UX document details most fully, and the one Phase 2
 * deliberately built last. Its classroom grid is the same `ClassroomCard` the
 * teacher's own index renders — a principal and a teacher looking at the same
 * class see the same card, which is the point of the fractal architecture rather
 * than a convenience.
 *
 * What a building administrator gets that a teacher does not is comparison:
 * across grades, across subjects, and across teachers within the building.
 */

import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { SectionContext } from '../types/profile'
import {
  loadAggregates,
  loadSchoolIndex,
  loadSectionsContext,
  loadStaffIndex,
} from '../data/client'
import { useAsync } from '../data/useAsync'
import { useSession } from '../session/session'
import { AS_OF_LABEL, formatSchoolYear, gradeLabel } from '../lib/dataset'
import {
  Breadcrumb,
  ErrorState,
  Loading,
  MetricCard,
  NarrativeBlock,
  Notice,
  attendanceTone,
  completionTone,
  masteryTone,
  percent,
} from '../ui/primitives'
import { ComparisonTable, type ComparisonRow } from '../ui/ComparisonTable'
import { ResearchContext } from '../ui/ResearchContext'
import { ClassroomCard } from './section/ClassroomCard'
import { spreadOf, subjectRows } from './admin/compare'

const ALL_GRADES = '__all__'

export function SchoolView() {
  const { schoolId = '' } = useParams()
  const { session } = useSession()
  const [gradeFilter, setGradeFilter] = useState<string>(ALL_GRADES)

  const aggregatesState = useAsync(loadAggregates, [])
  const sectionsState = useAsync(loadSectionsContext, [])
  const schoolsState = useAsync(loadSchoolIndex, [])
  const staffState = useAsync(loadStaffIndex, [])

  const aggregates = aggregatesState.value

  const sections: SectionContext[] = useMemo(
    () =>
      (sectionsState.value?.sections ?? [])
        .filter((entry) => entry.schoolId === schoolId)
        .sort(
          (a, b) =>
            a.gradeLevel.localeCompare(b.gradeLevel, undefined, { numeric: true }) ||
            a.sectionName.localeCompare(b.sectionName),
        ),
    [sectionsState.value, schoolId],
  )

  if (aggregatesState.status === 'error') {
    return (
      <div className="page">
        <ErrorState error={aggregatesState.error} />
      </div>
    )
  }
  if (!session || !aggregates) {
    return (
      <div className="page">
        <Loading what="building" />
      </div>
    )
  }

  const building = aggregates.schools.find((entry) => entry.schoolId === schoolId)
  if (!building) {
    return (
      <div className="page stack">
        <h1>Building not found</h1>
        <Notice tone="caution">
          No building with the id <span className="mono">{schoolId}</span> holds a rollup for{' '}
          {formatSchoolYear(aggregates.schoolYear)}.
        </Notice>
      </div>
    )
  }

  const school = schoolsState.value?.get(schoolId)
  const district = aggregates.district
  const grades = aggregates.grades
    .filter((entry) => entry.schoolId === schoolId)
    .sort((a, b) => a.gradeLevel.localeCompare(b.gradeLevel, undefined, { numeric: true }))

  // A district administrator reaches this view through the district; a building
  // administrator's own home is this page, so the crumb only appears when there
  // is somewhere above it the viewer can actually go.
  const seesDistrict = session.assignment.scopeType === 'district'

  const gradeRows: ComparisonRow[] = [...grades]
    .sort((a, b) => b.masteryRate - a.masteryRate)
    .map((entry) => ({
      key: entry.gradeLevel,
      label: gradeLabel(entry.gradeLevel),
      sublabel: `${entry.studentCount} students`,
      mastered: entry.standardsMastered,
      taught: entry.standardsTaughtToDate,
      rate: entry.masteryRate,
      extra: percent(entry.attendanceRate, 1),
    }))

  const sectionsLoaded = sectionsState.status === 'ready'
  const teacherRows = buildTeacherRows(sections, staffState.value)
  const gradeSpread = spreadOf(grades.map((entry) => entry.masteryRate))
  const sectionSpread = spreadOf(
    sections.filter((entry) => entry.standardsTaughtToDate > 0).map((entry) => entry.masteryRate),
  )

  const visibleSections =
    gradeFilter === ALL_GRADES
      ? sections
      : sections.filter((entry) => entry.gradeLevel === gradeFilter)

  const interruptionMinutes = sections.reduce(
    (total, entry) => total + entry.interruptions.totalMinutesLost,
    0,
  )

  return (
    <div className="page stack">
      {/* "District" rather than the district's full name, to match the crumb the
          classroom view shows one level down. */}
      {seesDistrict ? (
        <Breadcrumb items={[{ label: 'District', to: '/district' }, { label: building.label }]} />
      ) : null}

      <header className="student-head">
        <div className="stack-tight">
          <div className="eyebrow">
            Building · {formatSchoolYear(aggregates.schoolYear)}
          </div>
          <h1>{building.label}</h1>
          <div className="row subtle">
            {school ? (
              <>
                <span>{school.principalName}</span>
                <span>·</span>
              </>
            ) : null}
            <span>
              Grades {building.gradesCovered[0]}–
              {building.gradesCovered[building.gradesCovered.length - 1]}
            </span>
            <span>·</span>
            <span>{building.studentCount.toLocaleString()} students</span>
            <span>·</span>
            <span>{sections.length} sections</span>
            <span>·</span>
            <span>as of {AS_OF_LABEL}</span>
          </div>
        </div>
      </header>

      <section className="grid">
        <MetricCard
          label="Mastery of standards taught so far"
          value={percent(building.masteryRate)}
          note={`${(building.masteryRate - district.masteryRate >= 0 ? '+' : '') + (building.masteryRate - district.masteryRate).toFixed(1)} against the district`}
          tone={masteryTone(building.masteryRate)}
        />
        <MetricCard
          label="Attendance"
          value={percent(building.attendanceRate)}
          note={`${building.chronicallyAbsentStudents} students above 10% absence`}
          tone={attendanceTone(building.attendanceRate)}
        />
        <MetricCard
          label="Homework completion"
          value={percent(building.homeworkCompletionRate)}
          note="across every section here"
          tone={completionTone(building.homeworkCompletionRate)}
        />
        <MetricCard
          label="Instructional time lost"
          value={`${Math.round(interruptionMinutes / 60)}h`}
          note={`${sections.reduce((t, s) => t + s.interruptions.totalInterruptions, 0)} interruptions logged`}
          tone={'neutral'}
        />
      </section>

      <NarrativeBlock title="Where to look first">
        <p>
          Grades in this building span {gradeSpread.range.toFixed(1)} points of mastery, from{' '}
          {percent(gradeSpread.min, 1)} to {percent(gradeSpread.max, 1)}. Individual classrooms
          span {sectionSpread.range.toFixed(1)}. The building's own rate,{' '}
          {percent(building.masteryRate, 1)}, sits within{' '}
          {Math.abs(building.masteryRate - district.masteryRate).toFixed(1)} points of the
          district — so it is the spread below, not the building figure, that has something to
          act on.
        </p>
      </NarrativeBlock>

      <section className="card stack-tight">
        <div className="section-heading">
          <h2>By grade</h2>
          <span className="subtle">ranked, against the district rate</span>
        </div>
        <ComparisonTable
          rows={gradeRows}
          headings={{ label: 'Grade', extra: 'Attendance' }}
          benchmark={{ label: 'the district rate', rate: district.masteryRate }}
        />
      </section>

      <section className="card stack-tight">
        <div className="section-heading">
          <h2>By subject</h2>
          <span className="subtle">this building</span>
        </div>
        <ComparisonTable
          rows={subjectRows(building.masteryBySubject)}
          headings={{ label: 'Subject' }}
          benchmark={{ label: 'the district rate', rate: district.masteryRate }}
        />
      </section>

      {/* The section index is four times the size of the aggregates and arrives
          later. Rendering a ranked table with no rows under a heading that
          promises staff reads as "nobody teaches here", so these two wait. */}
      {sectionsLoaded ? (
        <>
          <section className="card stack-tight">
            <div className="section-heading">
              <h2>By teacher</h2>
              <span className="subtle">{teacherRows.length} teaching staff</span>
            </div>
            <ComparisonTable
              rows={teacherRows}
              headings={{ label: 'Teacher', extra: 'Attendance' }}
              benchmark={{ label: 'the building rate', rate: building.masteryRate }}
            />
            <Notice tone="caution">
              <strong>This ranks classes, not teaching.</strong> A teacher's rate here is the
              mastery of the students assigned to them, and rosters are not equivalent — the
              attendance column is the clearest reason two rows differ. A row near the bottom
              is a place to open the classroom and read its context layers, not a conclusion.
            </Notice>
          </section>

          <section className="stack-tight">
            <div className="section-heading">
              <h2>Classrooms</h2>
              <span className="subtle">
                {visibleSections.length} of {sections.length} shown
              </span>
            </div>

            <div className="row unit-switch" role="group" aria-label="Filter by grade">
              <button
                type="button"
                className="button"
                data-active={gradeFilter === ALL_GRADES}
                onClick={() => setGradeFilter(ALL_GRADES)}
              >
                All grades
              </button>
              {building.gradesCovered.map((grade) => (
                <button
                  key={grade}
                  type="button"
                  className="button"
                  data-active={gradeFilter === grade}
                  onClick={() => setGradeFilter(grade)}
                >
                  {gradeLabel(grade)}
                </button>
              ))}
            </div>

            <div className="classroom-grid">
              {visibleSections.map((section) => (
                <ClassroomCard
                  key={section.sectionId}
                  section={section}
                  teacherName={teacherNameOf(section, staffState.value)}
                />
              ))}
            </div>
          </section>
        </>
      ) : (
        <Loading what="classrooms" />
      )}

      <ResearchContext
        role={session.role}
        metrics={{
          attendanceRate: building.attendanceRate,
          completionRate: building.homeworkCompletionRate,
          disciplineReferralCount: building.disciplineReferrals,
        }}
      />
    </div>
  )
}

function teacherNameOf(
  section: SectionContext,
  staff: Map<string, { firstName: string; lastName: string }> | undefined,
): string | undefined {
  const member = staff?.get(section.teacherId)
  return member ? `${member.firstName} ${member.lastName}` : undefined
}

/**
 * Teachers, rolled up over the sections they hold in this building.
 *
 * Totalled over standards rather than by averaging section rates: a teacher with
 * one large section and one small one should not have the small one count
 * equally. Attendance is weighted by student count for the same reason.
 */
function buildTeacherRows(
  sections: SectionContext[],
  staff: Map<string, { firstName: string; lastName: string }> | undefined,
): ComparisonRow[] {
  const byTeacher = new Map<
    string,
    { taught: number; mastered: number; sections: number; attendance: number; students: number }
  >()

  for (const section of sections) {
    const entry = byTeacher.get(section.teacherId) ?? {
      taught: 0,
      mastered: 0,
      sections: 0,
      attendance: 0,
      students: 0,
    }
    entry.taught += section.standardsTaughtToDate
    entry.mastered += section.standardsMastered
    entry.sections += 1
    if (section.attendanceRate !== null) {
      entry.attendance += section.attendanceRate * section.studentCount
      entry.students += section.studentCount
    }
    byTeacher.set(section.teacherId, entry)
  }

  return [...byTeacher.entries()]
    .map(([teacherId, entry]) => {
      const member = staff?.get(teacherId)
      const rate = entry.taught > 0 ? (100 * entry.mastered) / entry.taught : 0
      return {
        key: teacherId,
        label: member ? `${member.firstName} ${member.lastName}` : teacherId,
        sublabel: `${entry.sections} section${entry.sections === 1 ? '' : 's'}`,
        mastered: entry.mastered,
        taught: entry.taught,
        rate,
        extra:
          entry.students > 0 ? percent(entry.attendance / entry.students, 1) : '—',
      }
    })
    .sort((a, b) => b.rate - a.rate)
}
