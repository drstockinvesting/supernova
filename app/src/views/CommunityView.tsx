/**
 * The board and community layer — the outermost ring, and the only one built by
 * taking things away.
 *
 * Every number on this page already exists in `aggregates/current-year.json` and
 * has already been rendered, with names attached, one layer in. Nothing here
 * needed a new rollup. What the stage had to get right is what must *not* appear,
 * and that turns out to be a harder question than any layout below it:
 *
 *   - A grade level identifies a building. Nova teaches K-5, Meridian 6-8,
 *     Constellation 9-12, so "Grade 7 mastery is 39.1%" is Meridian's figure
 *     whether or not Meridian is named. A view forbidden from naming buildings
 *     cannot print a grade breakdown either.
 *   - Suppressing a single cell out of a published total hides nothing, because
 *     the reader can subtract. See `discloseCells`.
 *   - There is no drill-down. Not because the routes are guarded — Phase 2 does
 *     not guard them — but because the addendum is explicit that boundaries are
 *     invisible rather than blocked, so an out-of-scope building gets no
 *     affordance to click rather than a link that says no.
 *
 * The route serves two audiences with different rules; see `community/disclosure`.
 */

import { useMemo, useState } from 'react'
import type { AggregateCell, Aggregates } from '../types/profile'
import { loadAggregates, loadDistrict } from '../data/client'
import { useAsync } from '../data/useAsync'
import { useSession } from '../session/session'
import { AS_OF_LABEL, SUBJECT_ORDER, formatSchoolYear, gradeLabel } from '../lib/dataset'
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
import { ResearchContext } from '../ui/ResearchContext'
import { spreadOf, subjectRows } from './admin/compare'
import {
  STRENGTH_LABELS,
  discloseCells,
  evidenceMix,
  gradeDimensionNamesBuildings,
  gradesIdentifyingOneBuilding,
  ruleFor,
} from './community/disclosure'

const ALL_SUBJECTS = '__all__'

export function CommunityView() {
  const { session } = useSession()
  const aggregatesState = useAsync(loadAggregates, [])
  const districtState = useAsync(loadDistrict, [])
  const [subject, setSubject] = useState<string>(ALL_SUBJECTS)

  const aggregates = aggregatesState.value
  const rule = useMemo(() => (session ? ruleFor(session.role) : null), [session])

  if (aggregatesState.status === 'error') {
    return (
      <div className="page">
        <ErrorState error={aggregatesState.error} />
      </div>
    )
  }
  if (!session || !aggregates || !rule) {
    return (
      <div className="page">
        <Loading what="district figures" />
      </div>
    )
  }

  const district = aggregates.district
  const schools = [...aggregates.schools].sort((a, b) => a.label.localeCompare(b.label))
  const gradeSpread = spreadOf(aggregates.grades.map((entry) => entry.masteryRate))
  const schoolSpread = spreadOf(schools.map((entry) => entry.masteryRate))

  return (
    <div className="page stack">
      <header className="student-head">
        <div className="stack-tight">
          <div className="eyebrow">
            {rule.label} · {formatSchoolYear(aggregates.schoolYear)}
          </div>
          <h1>{district.label}</h1>
          <div className="row subtle">
            {districtState.value ? (
              <>
                <span>{districtState.value.superintendent}</span>
                <span>·</span>
              </>
            ) : null}
            <span>
              {schools.length} schools, {district.studentCount.toLocaleString()} students
            </span>
            <span>·</span>
            <span>as of {AS_OF_LABEL}</span>
          </div>
        </div>
      </header>

      <NarrativeBlock>
        <p>
          The Constellation Area School District measures learning by whether a student has
          demonstrated mastery of a standard, not by an average of scores. Partway through the{' '}
          {formatSchoolYear(aggregates.schoolYear)} year, students across the district have
          demonstrated mastery of {percent(district.masteryRate, 1)} of the standards their
          classes have taught so far — {district.standardsMastered.toLocaleString()}{' '}
          demonstrations out of {district.standardsTaughtToDate.toLocaleString()}.
        </p>
        <p className="subtle">
          A standard is only counted once it has been taught. A figure this far from complete
          is a year in progress, not a year's result: standards taught in April are not in this
          number, and neither is the mastery students will show of them.
        </p>
      </NarrativeBlock>

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
          note={`${percent(district.chronicAbsenteeismRate, 1)} of students miss more than a tenth of days`}
          tone={attendanceTone(district.attendanceRate)}
        />
        <MetricCard
          label="Homework completion"
          value={percent(district.homeworkCompletionRate)}
          note="district-wide"
          tone={completionTone(district.homeworkCompletionRate)}
        />
        <MetricCard
          label="Students"
          value={district.studentCount.toLocaleString()}
          note={`across ${schools.length} schools`}
          tone="neutral"
        />
      </section>

      <EvidencePanel cell={district} audience={rule.audience} />

      <section className="card stack-tight">
        <div className="section-heading">
          <h2>By subject</h2>
          <span className="subtle">district-wide, every school combined</span>
        </div>
        <ComparisonTable
          rows={subjectRows(district.masteryBySubject)}
          headings={{ label: 'Subject' }}
          benchmark={{ label: 'the district rate', rate: district.masteryRate }}
        />
      </section>

      {rule.namesBuildings ? (
        <PublicSchools
          aggregates={aggregates}
          subject={subject}
          onSubject={setSubject}
        />
      ) : (
        <WithheldFromBoard aggregates={aggregates} />
      )}

      <NarrativeBlock title="How much the schools differ">
        <p>
          {rule.namesBuildings ? (
            <>
              The {schools.length} schools sit within {schoolSpread.range.toFixed(1)} points of
              one another on mastery, from {percent(schoolSpread.min, 1)} to{' '}
              {percent(schoolSpread.max, 1)}. Grade levels vary more than twice as widely —{' '}
              {gradeSpread.range.toFixed(1)} points between the highest and the lowest.
            </>
          ) : (
            <>
              The district's schools sit within {schoolSpread.range.toFixed(1)} points of one
              another on mastery. Grade levels within them vary{' '}
              {gradeSpread.range.toFixed(1)} points, more than twice as widely.
            </>
          )}{' '}
          That ordering matters for how these figures should be read: a difference between
          schools of about a point is not a finding, and treating it as one would direct
          attention away from the variation that is real.
        </p>
        <p className="subtle">
          Measured as the range between the highest and lowest at each level, over standards
          taught to date. Standard deviation {schoolSpread.sd.toFixed(2)} across{' '}
          {schoolSpread.count} schools, {gradeSpread.sd.toFixed(2)} across {gradeSpread.count}{' '}
          grade levels.
        </p>
      </NarrativeBlock>

      <Notice>
        <strong>No comparison to last year is shown, because none can be made honestly.</strong>{' '}
        Rollups are computed for the current year only, and prior years are held per student
        rather than per school — a student now in one building may have spent last year in
        another. Comparing those figures would compare a group of students against itself
        rather than a school against itself, so nothing here is described as improving or
        declining.
      </Notice>

      <ResearchContext
        role={session.role}
        metrics={{
          attendanceRate: district.attendanceRate,
          schoolAttendanceRate: district.attendanceRate,
          completionRate: district.homeworkCompletionRate,
          disciplineReferralCount: district.disciplineReferrals,
        }}
      />
    </div>
  )
}

// --- The public view's schools ----------------------------------------------

/**
 * School-level aggregates, and the grade breakdown underneath them.
 *
 * The cards do not link. A community member has no scope on a building's
 * classrooms, teachers, or students, and the addendum's rule is that
 * out-of-scope material has no affordance rather than a refusal — so the card is
 * where the view ends, and it ends without saying so.
 */
function PublicSchools({
  aggregates,
  subject,
  onSubject,
}: {
  aggregates: Aggregates
  subject: string
  onSubject: (next: string) => void
}) {
  const schools = [...aggregates.schools].sort((a, b) => a.label.localeCompare(b.label))
  const schoolNames = new Map(schools.map((entry) => [entry.schoolId, entry.label]))

  // The suppression rule, applied to the grade breakdown. The district figure is
  // published above, so a lone withheld grade would be recoverable by
  // subtraction — `discloseCells` accounts for that.
  const disclosed = discloseCells(aggregates.grades, { totalIsPublished: true })
  const withheld = disclosed.filter((entry) => entry.suppressed !== null)

  const gradeRows: ComparisonRow[] = disclosed
    .filter((entry) => entry.suppressed === null)
    .map(({ cell }) => {
      const scoped =
        subject === ALL_SUBJECTS
          ? {
              standardsTaughtToDate: cell.standardsTaughtToDate,
              standardsMastered: cell.standardsMastered,
              masteryRate: cell.masteryRate,
            }
          : cell.masteryBySubject[subject]
      return { cell, scoped }
    })
    .filter((entry) => entry.scoped !== undefined && entry.scoped.standardsTaughtToDate > 0)
    .map(({ cell, scoped }) => ({
      key: `${cell.schoolId}-${cell.gradeLevel}`,
      label: gradeLabel(cell.gradeLevel),
      sublabel: schoolNames.get(cell.schoolId),
      mastered: scoped.standardsMastered,
      taught: scoped.standardsTaughtToDate,
      rate: scoped.masteryRate,
      extra: `${cell.studentCount} students`,
    }))
    .sort((a, b) => b.rate - a.rate)

  const districtRate =
    subject === ALL_SUBJECTS
      ? aggregates.district.masteryRate
      : (aggregates.district.masteryBySubject[subject]?.masteryRate ??
        aggregates.district.masteryRate)

  return (
    <>
      <section className="stack-tight">
        <div className="section-heading">
          <h2>Schools</h2>
          <span className="subtle">{schools.length} in the district</span>
        </div>
        <div className="classroom-grid">
          {schools.map((school) => (
            <SchoolCard
              key={school.schoolId}
              school={school}
              districtRate={aggregates.district.masteryRate}
            />
          ))}
        </div>
      </section>

      <section className="card stack-tight">
        <div className="section-heading">
          <h2>By grade level</h2>
          <span className="subtle">
            {subject === ALL_SUBJECTS ? 'all subjects' : subject}, ranked
          </span>
        </div>

        <div className="row unit-switch" role="group" aria-label="Filter by subject">
          <button
            type="button"
            className="button"
            data-active={subject === ALL_SUBJECTS}
            onClick={() => onSubject(ALL_SUBJECTS)}
          >
            All subjects
          </button>
          {SUBJECT_ORDER.map((name) => (
            <button
              key={name}
              type="button"
              className="button"
              data-active={subject === name}
              onClick={() => onSubject(name)}
            >
              {name}
            </button>
          ))}
        </div>

        <ComparisonTable
          rows={gradeRows}
          headings={{ label: 'Grade', extra: 'Size' }}
          benchmark={{
            label:
              subject === ALL_SUBJECTS
                ? 'the district rate'
                : `the district rate in ${subject}`,
            rate: districtRate,
          }}
        />

        {withheld.length > 0 ? (
          <Notice tone="caution">
            <strong>
              {withheld.length} grade level{withheld.length === 1 ? '' : 's'} withheld.
            </strong>{' '}
            {withheld.map(({ cell }) => gradeLabel(cell.gradeLevel)).join(', ')} —{' '}
            {withheld.some((entry) => entry.suppressed === 'below_threshold')
              ? `a grade with fewer than ${aggregates.publicSuppressionThreshold} students can identify a child at the top or bottom of it. `
              : ''}
            {withheld.some((entry) => entry.suppressed === 'complementary')
              ? 'A second grade is withheld alongside the first, because one withheld figure can be recovered by subtracting the published grades from the district total.'
              : ''}
          </Notice>
        ) : (
          <p className="subtle">
            No grade level is withheld. The suppression rule applies below{' '}
            {aggregates.publicSuppressionThreshold} students, and the smallest grade in the
            district holds{' '}
            {Math.min(...aggregates.grades.map((entry) => entry.studentCount))}.
          </p>
        )}
      </section>
    </>
  )
}

/** A school, with no way in. See `PublicSchools` for why it is not a link. */
function SchoolCard({
  school,
  districtRate,
}: {
  school: AggregateCell & { schoolId: string; gradesCovered: string[] }
  districtRate: number
}) {
  const delta = school.masteryRate - districtRate
  const grades = school.gradesCovered
  const span = grades.length > 0 ? `${grades[0]}–${grades[grades.length - 1]}` : '—'

  return (
    <div className="card classroom-card">
      <div className="stack-tight">
        <div className="eyebrow">Grades {span}</div>
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
              {percent(school.chronicAbsenteeismRate, 1)} miss over a tenth of days
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
          <dt>Standards taught</dt>
          <dd>
            <span className="classroom-fact-value numeric">
              {school.standardsTaughtToDate.toLocaleString()}
            </span>
            <span className="classroom-fact-note subtle">so far this year</span>
          </dd>
        </div>
      </dl>
    </div>
  )
}

// --- The board view's subtraction --------------------------------------------

/**
 * What the board view leaves out, and the reasoning, in the place where the
 * breakdown would otherwise be.
 *
 * The alternative — omitting the section silently — would leave a reader unable
 * to tell a district with no grade-level variation from one whose variation is
 * being withheld. The addendum's "boundaries are invisible" rule is about not
 * dangling links at people, not about concealing that a rule exists; a governing
 * body in particular is owed the rule it is governing under.
 */
function WithheldFromBoard({ aggregates }: { aggregates: Aggregates }) {
  const identifying = gradesIdentifyingOneBuilding(aggregates.grades)
  const everyGrade = gradeDimensionNamesBuildings(aggregates.grades)

  return (
    <section className="card stack-tight">
      <div className="section-heading">
        <h2>By grade level</h2>
        <span className="subtle">not shown</span>
      </div>

      <Notice tone="caution">
        <strong>A grade level names a school in this district.</strong>{' '}
        {everyGrade ? 'Every one of the' : `${identifying.length} of the`}{' '}
        {aggregates.grades.length} grade levels is taught in exactly one building, so
        publishing a grade's mastery rate publishes that building's — the school does not have
        to be named for a reader to know which one it is. A board member's scope is aggregates
        without school identifiers, and a grade breakdown would defeat that through the back
        door rather than honour it.
      </Notice>

      {/* Deliberately does not name the buildings. The section exists to explain a
          rule against school identifiers, and an explanation that breaks the rule
          it is explaining is worse than no explanation. The shape of the problem
          survives the anonymity; the names add nothing to it. */}
      <p className="prose subtle">
        This is a property of how the district is organised, not a fixed rule about grades:
        its {aggregates.schools.length} schools divide the grades between them with no
        overlap. A district whose buildings shared a grade range — two schools each teaching
        the same grades — could publish that breakdown without identifying either, and this
        view would show it, because the check is computed from the data rather than written
        into the page.
      </p>
    </section>
  )
}

// --- Evidence behind the rate -------------------------------------------------

function EvidencePanel({ cell, audience }: { cell: AggregateCell; audience: 'board' | 'public' }) {
  const mix = evidenceMix(cell)
  if (mix.length === 0) return null

  const total = mix.reduce((sum, entry) => sum + entry.count, 0)
  const none = mix.find((entry) => entry.strength === 'none')
  const substantial = mix.find((entry) => entry.strength === 'substantial')
  const peak = Math.max(...mix.map((entry) => entry.share))

  return (
    <section className="card stack-tight">
      <div className="section-heading">
        <h2>What the rate rests on</h2>
        <span className="subtle">{total.toLocaleString()} standards taught so far</span>
      </div>

      <div className="bars">
        {mix.map((entry) => (
          <div className="bar" key={entry.strength}>
            <span className="bar-value numeric">{percent(entry.share, 0)}</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                data-tone={entry.strength === 'none' ? 'critical' : 'neutral'}
                style={{ height: `${peak > 0 ? (100 * entry.share) / peak : 0}%` }}
              />
            </div>
            <span className="subtle">{STRENGTH_LABELS[entry.strength] ?? entry.strength}</span>
          </div>
        ))}
      </div>

      <p className="prose subtle">
        A mastery rate is a count of judgements, and a judgement is only as good as the work
        behind it.{' '}
        {substantial ? (
          <>
            {percent(substantial.share, 1)} of the standards taught so far rest on substantial
            evidence
            {none ? (
              <>
                , and {percent(none.share, 1)} carry no recorded artifact at all
              </>
            ) : null}
            .
          </>
        ) : null}{' '}
        {audience === 'board'
          ? 'The figure above should be read against this: where evidence is thin, the rate is measuring recording practice as much as learning.'
          : 'Teachers record evidence as they go, so this shifts through the year — a standard taught last week has had less chance to accumulate it than one taught in September.'}
      </p>
    </section>
  )
}
