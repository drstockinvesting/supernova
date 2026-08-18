/**
 * The district, and the buildings inside it.
 *
 * The outermost view with names still attached. Everything here is an aggregate
 * of aggregates — the district rate is the schools' rates, which are the grades',
 * which are the sections', which are the students'. Because the whole chain was
 * built from the inside out, every number on this page is one the reader can
 * click down to and check.
 *
 * The comparison this view leads with is not "which building is best". With three
 * buildings inside about a point of each other, ranking them is reading noise —
 * so the view says where the variation actually is instead, and sends the reader
 * there.
 */

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { AggregateCell, SectionContext } from '../types/profile'
import { loadAggregates, loadDistrict, loadSectionsContext } from '../data/client'
import { useAsync } from '../data/useAsync'
import { useSession } from '../session/session'
import { AS_OF_LABEL, formatSchoolYear, gradeLabel } from '../lib/dataset'
import {
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
import { Constellation } from '../ui/Constellation'
import { SHARE_LEGEND } from '../ui/stars'
import { ResearchContext } from '../ui/ResearchContext'
import { groupMetrics } from '../ui/research'
import { spreadOf, subjectRows } from './admin/compare'
import { districtSky } from './constellations'

export function DistrictView() {
  const { session } = useSession()
  const aggregatesState = useAsync(loadAggregates, [])
  const districtState = useAsync(loadDistrict, [])
  const sectionsState = useAsync(loadSectionsContext, [])

  const aggregates = aggregatesState.value
  const sections: SectionContext[] = useMemo(
    () => sectionsState.value?.sections ?? [],
    [sectionsState.value],
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
        <Loading what="district" />
      </div>
    )
  }

  const sectionsLoaded = sectionsState.status === 'ready'
  const district = aggregates.district
  const schools = [...aggregates.schools].sort((a, b) => a.label.localeCompare(b.label))
  const grades = aggregates.grades

  // Where the variation lives. Each level is measured against its own peers, so
  // the three numbers are directly comparable — and they are the argument for
  // drilling down rather than governing from the top figure.
  const schoolSpread = spreadOf(schools.map((entry) => entry.masteryRate))
  const gradeSpread = spreadOf(grades.map((entry) => entry.masteryRate))
  const sectionSpread = spreadOf(
    sections.filter((entry) => entry.standardsTaughtToDate > 0).map((entry) => entry.masteryRate),
  )

  const gradeRows: ComparisonRow[] = [...grades]
    .sort((a, b) => b.masteryRate - a.masteryRate)
    .map((entry) => ({
      key: `${entry.schoolId}-${entry.gradeLevel}`,
      label: gradeLabel(entry.gradeLevel),
      sublabel: schools.find((school) => school.schoolId === entry.schoolId)?.label,
      mastered: entry.standardsMastered,
      taught: entry.standardsTaughtToDate,
      rate: entry.masteryRate,
      extra: percent(entry.attendanceRate, 1),
      to: `/school/${entry.schoolId}`,
    }))

  const subjects = subjectRows(district.masteryBySubject)

  return (
    <div className="page stack">
      <header className="student-head">
        <div className="stack-tight">
          <div className="eyebrow">District · {formatSchoolYear(aggregates.schoolYear)}</div>
          <h1>{district.label}</h1>
          <div className="row subtle">
            {districtState.value ? (
              <>
                <span>{districtState.value.superintendent}</span>
                <span>·</span>
              </>
            ) : null}
            <span>{schools.length} schools</span>
            <span>·</span>
            <span>{district.studentCount.toLocaleString()} students</span>
            <span>·</span>
            <span>as of {AS_OF_LABEL}</span>
          </div>
        </div>
      </header>

      <section className="grid">
        <MetricCard
          label="Mastery of standards taught so far"
          value={percent(district.masteryRate)}
          note={`${district.standardsMastered.toLocaleString()} of ${district.standardsTaughtToDate.toLocaleString()} demonstrations`}
          tone={masteryTone(district.masteryRate)}
        />
        <MetricCard
          label="Attendance"
          value={percent(district.attendanceRate)}
          note={`${district.chronicallyAbsentStudents} students above 10% absence`}
          tone={attendanceTone(district.attendanceRate)}
        />
        <MetricCard
          label="Homework completion"
          value={percent(district.homeworkCompletionRate)}
          note="across every section"
          tone={completionTone(district.homeworkCompletionRate)}
        />
        <MetricCard
          label="Discipline referrals"
          value={district.disciplineReferrals.toLocaleString()}
          note={`${district.totalBehaviorIncidents.toLocaleString()} behaviour incidents recorded`}
          tone={'neutral'}
        />
      </section>

      {/* The classroom figure comes from the section index, which arrives after
          the aggregates. The claim is about all three levels at once, so it waits
          for all three rather than briefly asserting a spread of zero. */}
      {sectionsLoaded ? (
        <NarrativeBlock title="Where the variation is">
          <p>
            The {schools.length} buildings sit within {schoolSpread.range.toFixed(1)} points of
            each other on mastery. Grades within them span {gradeSpread.range.toFixed(1)}{' '}
            points, and individual classrooms span {sectionSpread.range.toFixed(1)}. Ranking
            the buildings against one another would be reading noise; the differences that
            matter are inside them.
          </p>
          <p className="subtle">
            Measured as the range between the highest and lowest at each level, over standards
            taught to date. Standard deviations: {schoolSpread.sd.toFixed(2)} across{' '}
            {schools.length} buildings, {gradeSpread.sd.toFixed(2)} across {grades.length}{' '}
            grades, {sectionSpread.sd.toFixed(2)} across {sectionSpread.count} classrooms.
          </p>
        </NarrativeBlock>
      ) : null}

      {/* Every classroom in the district, as one picture. The paragraph above says
          the variation is inside the buildings rather than between them; this is
          that claim drawn rather than asserted, and each star opens the classroom
          it describes. */}
      {sectionsLoaded ? (
        <section className="stack-tight">
          <div className="section-heading">
            <h2>The district's sky</h2>
            <span className="subtle">
              {sections.length} classrooms, by building and grade
            </span>
          </div>
          <Constellation
            groups={districtSky(
              sections,
              schools.map((school) => ({ schoolId: school.schoolId, label: school.label })),
            )}
            legend={SHARE_LEGEND}
            legendNote="One star is one classroom. Brightness is the share of standards taught there that students have demonstrated, on the same absolute scale used at every level of this app — never shaded against the other stars in this picture, which would turn a district that is genuinely even into a ranking."
          />
        </section>
      ) : null}

      <section className="stack-tight">
        <div className="section-heading">
          <h2>Buildings</h2>
          <span className="subtle">open one for its classrooms</span>
        </div>
        {sectionsLoaded ? (
          <div className="classroom-grid">
            {schools.map((school) => (
              <BuildingCard
                key={school.schoolId}
                school={school}
                districtRate={district.masteryRate}
                sections={sections.filter((entry) => entry.schoolId === school.schoolId)}
              />
            ))}
          </div>
        ) : (
          <Loading what="buildings" />
        )}
      </section>

      <section className="card stack-tight">
        <div className="section-heading">
          <h2>By grade</h2>
          <span className="subtle">every grade in the district, ranked</span>
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
          <span className="subtle">district-wide</span>
        </div>
        <ComparisonTable
          rows={subjects}
          headings={{ label: 'Subject' }}
          benchmark={{ label: 'the district rate', rate: district.masteryRate }}
        />
      </section>

      <Notice>
        <strong>No year-over-year trend is shown, because the aggregates cannot support
        one.</strong>{' '}
        Rollups are computed for the current year only, and prior years are held per student
        rather than per building — a student now in this district may have spent last year in
        a different school in it. Comparing those figures would compare a cohort against
        itself rather than a building against itself, so nothing here is labelled improving or
        declining.
      </Notice>

      <ResearchContext
        role={session.role}
        metrics={groupMetrics({
          ...district,
          masterySpreadPoints: Math.max(
            schoolSpread.range,
            gradeSpread.range,
            sectionSpread.range,
          ),
        })}
      />
    </div>
  )
}

function BuildingCard({
  school,
  districtRate,
  sections,
}: {
  school: AggregateCell & { schoolId: string; gradesCovered: string[] }
  districtRate: number
  sections: SectionContext[]
}) {
  const delta = school.masteryRate - districtRate
  const grades = school.gradesCovered
  const span =
    grades.length > 0 ? `${grades[0]}–${grades[grades.length - 1]}` : '—'

  // A section is not the same unit of thing at both levels. At Nova a section is
  // one teacher and a child's whole day across six subjects; at Constellation it
  // is one subject for one period. Printing "18 sections" beside "144 sections"
  // without saying so invites a comparison that means nothing.
  const selfContained = sections.some(
    (entry) => entry.instructionalModel === 'self_contained',
  )
  const sectionNoun = selfContained ? 'self-contained classes' : 'subject sections'

  const strongest = Object.entries(school.masteryBySubject).sort(
    (a, b) => b[1].masteryRate - a[1].masteryRate,
  )[0]
  const weakest = Object.entries(school.masteryBySubject).sort(
    (a, b) => a[1].masteryRate - b[1].masteryRate,
  )[0]

  return (
    <Link className="card classroom-card" to={`/school/${school.schoolId}`}>
      <div className="stack-tight">
        <div className="eyebrow">
          Grades {span} · {sections.length} {sectionNoun}
        </div>
        <h3 className="classroom-name">{school.label}</h3>
        <div className="subtle">{school.studentCount.toLocaleString()} students</div>
      </div>

      <dl className="classroom-facts">
        <div className="classroom-fact" data-tone={masteryTone(school.masteryRate)}>
          <dt>Mastery</dt>
          <dd>
            <span className="classroom-fact-value numeric">
              {percent(school.masteryRate, 1)}
            </span>
            <span className="classroom-fact-note subtle">
              {delta >= 0 ? '+' : ''}
              {delta.toFixed(1)} vs district
            </span>
          </dd>
        </div>
        <div className="classroom-fact" data-tone={attendanceTone(school.attendanceRate)}>
          <dt>Attendance</dt>
          <dd>
            <span className="classroom-fact-value numeric">
              {percent(school.attendanceRate, 1)}
            </span>
            <span className="classroom-fact-note subtle">
              {school.chronicallyAbsentStudents} above 10% absence
            </span>
          </dd>
        </div>
        <div className="classroom-fact" data-tone={completionTone(school.homeworkCompletionRate)}>
          <dt>Homework</dt>
          <dd>
            <span className="classroom-fact-value numeric">
              {percent(school.homeworkCompletionRate, 1)}
            </span>
          </dd>
        </div>
        <div className="classroom-fact">
          <dt>Referrals</dt>
          <dd>
            <span className="classroom-fact-value numeric">
              {school.disciplineReferrals.toLocaleString()}
            </span>
          </dd>
        </div>
      </dl>

      {strongest && weakest && strongest[0] !== weakest[0] ? (
        <div className="subtle">
          Strongest {strongest[0]} ({percent(strongest[1].masteryRate, 0)}), weakest{' '}
          {weakest[0]} ({percent(weakest[1].masteryRate, 0)})
        </div>
      ) : null}
    </Link>
  )
}
