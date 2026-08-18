/**
 * The students at my building, filtered to the stream I am responsible for.
 *
 * That sentence is Phase 3's, written when it found that a nurse and a counselor
 * hold permissions describing a job the app had no view for. Phase 4 made the
 * nurse's landing page honest about the absence and Phase 5 put the two research
 * claims on it they were entitled to; neither built the thing. This is the thing.
 *
 * Three roles land here, and they are not the same account. A nurse holds
 * attendance and health; a counselor holds those plus behaviour and special
 * services; a special education teacher holds attendance, behaviour, and services
 * and no health at all. So the page is assembled from the viewer's permissions
 * rather than from their role — `streamsFor` in `caseload.ts` — and a stream the
 * account does not hold is absent rather than empty. There is no "3 behaviour
 * flags withheld" anywhere on this page, because a count of what is being kept
 * from you is a disclosure of it.
 *
 * The special education teacher is the quiet find. Their scope is a *building*,
 * not sections, so `/teacher` refused them for holding no sections and redirected
 * them to `/teacher`, landing on the branch in `Guard` that exists only to stop a
 * redirect loop. That role has had no dashboard at all since Phase 3, and nothing
 * said so — the page it reached was an honest report of a configuration gap that
 * was really a missing view.
 *
 * ## Why there is a constellation on a nurse's page
 *
 * Because the rule says there should be one. A star is the smallest thing this
 * viewer is allowed to see, and a nurse is allowed to see a student — so a star
 * here is one child and its brightness is that child's own mastery rate, every
 * one of which they could read by opening the profile. Nothing on this page is a
 * mean of these students, which is the line `view_aggregate_mastery` actually
 * draws. And it is the useful picture: a caseload list says who needs attention,
 * and the sky beside it says what the thing needing attention is costing them.
 */

import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { CaseloadIndex } from '../types/profile'
import { loadAggregates, loadCaseload, loadSchoolIndex } from '../data/client'
import { useAsync } from '../data/useAsync'
import { useSession } from '../session/session'
import { ROLE_LABELS } from '../session/roles'
import { AS_OF_LABEL, formatSchoolYear, gradeLabel } from '../lib/dataset'
import {
  Breadcrumb,
  ErrorState,
  Loading,
  MetricCard,
  NarrativeBlock,
  Notice,
  StatusChip,
  formatDate,
  masteryTone,
  percent,
} from '../ui/primitives'
import { Constellation } from '../ui/Constellation'
import { SHARE_LEGEND } from '../ui/stars'
import { ResearchContext } from '../ui/ResearchContext'
import { groupMetrics } from '../ui/research'
import { caseloadSky } from './constellations'
import {
  DEFAULT_FILTER,
  THRESHOLDS,
  buildCaseload,
  gradesOf,
  levelCounts,
  streamsFor,
  type CaseloadEntry,
  type CaseloadLevel,
  type StreamKey,
} from './caseload/caseload'

/**
 * "attendance and health", not "attendance, health".
 *
 * Every sentence on this page is assembled from the viewer's streams, so there
 * are between one and four items in each list and a plain `join(', ')` reads as
 * a database field for the two-item case that two of the three roles here have.
 */
function listOf(items: string[], conjunction: 'and' | 'or' = 'and'): string {
  if (items.length <= 1) return items[0] ?? ''
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, ${conjunction} ${items[items.length - 1]}`
}

const LEVEL_LABELS: Record<CaseloadLevel, string> = {
  priority: 'Priority',
  full: 'Full caseload',
  everyone: 'Everyone here',
}

export function CaseloadView() {
  const { schoolId = '' } = useParams()
  const { session } = useSession()

  const [level, setLevel] = useState<CaseloadLevel>(DEFAULT_FILTER.level)
  const [stream, setStream] = useState<StreamKey | null>(null)
  const [grade, setGrade] = useState<string | null>(null)

  const caseloadState = useAsync(() => loadCaseload(schoolId), [schoolId])
  const schoolsState = useAsync(loadSchoolIndex, [])
  const aggregatesState = useAsync(loadAggregates, [])

  const index: CaseloadIndex | undefined = caseloadState.value

  // The streams this account holds, and nothing about which role it is. Computed
  // before anything is read off a row, so a stream the viewer lacks never enters
  // the render at all.
  const streams = useMemo(
    () => (session ? streamsFor(session.can) : []),
    [session],
  )
  const streamKeys = useMemo(() => streams.map((entry) => entry.key), [streams])

  // Memoised because an absent index would otherwise hand every downstream memo a
  // fresh empty array each render, which is both a lint warning and a real
  // recomputation of the whole caseload on every keystroke elsewhere in the tree.
  const rows = useMemo(() => index?.students ?? [], [index])
  const entries = useMemo(
    () => buildCaseload(rows, streamKeys, { level, stream, grade }),
    [rows, streamKeys, level, stream, grade],
  )
  const counts = useMemo(
    () => levelCounts(rows, streamKeys, { stream, grade }),
    [rows, streamKeys, stream, grade],
  )
  const grades = useMemo(() => gradesOf(rows), [rows])

  if (caseloadState.status === 'error') {
    return (
      <div className="page">
        <ErrorState error={caseloadState.error} />
      </div>
    )
  }
  if (!session || !index) {
    return (
      <div className="page">
        <Loading what="caseload" />
      </div>
    )
  }

  const school = schoolsState.value?.get(schoolId)
  const building = aggregatesState.value?.schools.find((entry) => entry.schoolId === schoolId)

  // A district administrator arrives here from the building page; a nurse's home
  // *is* this page. The crumb appears only when there is somewhere above it the
  // viewer can actually go, which is the same test every other view applies.
  const seesBuildingPage = session.can('view_aggregate_mastery')

  // No account reaches this page without both of these — `access.ts` requires
  // them — so the sky is always drawn and the guard here is belt and braces
  // against a future route that forgets.
  const canOpenStudents = session.can('view_individual_students') && session.can('view_student_names')

  const priorityCount = counts.priority
  const fullCount = counts.full

  return (
    <div className="page stack">
      {seesBuildingPage ? (
        <Breadcrumb
          items={[{ label: index.label, to: `/school/${schoolId}` }, { label: 'Caseload' }]}
        />
      ) : null}

      <header className="student-head">
        <div className="stack-tight">
          <div className="eyebrow">
            Caseload · {ROLE_LABELS[session.role]} · {formatSchoolYear(index.schoolYear)}
          </div>
          <h1>{index.label}</h1>
          <div className="row subtle">
            {school?.principalName ? (
              <>
                <span>{school.principalName}</span>
                <span>·</span>
              </>
            ) : null}
            <span>{rows.length.toLocaleString()} students enrolled</span>
            <span>·</span>
            <span>
              {streams.length} stream{streams.length === 1 ? '' : 's'} on this account
            </span>
            <span>·</span>
            <span>as of {AS_OF_LABEL}</span>
          </div>
        </div>
      </header>

      <NarrativeBlock title="What this list is">
        <p>
          Every student enrolled at {index.label}, carrying{' '}
          {listOf(streams.map((entry) => entry.label.toLowerCase()))} — the{' '}
          {streams.length === 1 ? 'stream' : 'streams'} this account is responsible for. A
          student appears on the caseload when something is on record in one of them, and on
          the priority list when that something is{' '}
          {listOf(streams.map((entry) => entry.priorityMeaning), 'or')}. {priorityCount} of{' '}
          {rows.length} students are on the priority list; {fullCount} have anything at all on
          record.
        </p>
        <p>
          Streams this account does not hold are not on this page — not withheld, not counted,
          not summarised. A count of what is being kept from you is a disclosure of it, so the
          only honest version of a stream you may not read is its absence.
        </p>
      </NarrativeBlock>

      <section className="grid">
        <MetricCard
          label="On the priority list"
          value={priorityCount.toLocaleString()}
          note={`${percent((100 * priorityCount) / Math.max(1, rows.length), 0)} of the building`}
          tone={'neutral'}
        />
        <MetricCard
          label="Anything on record"
          value={fullCount.toLocaleString()}
          note={`across ${streams.length} stream${streams.length === 1 ? '' : 's'}`}
          tone={'neutral'}
        />
        {streams.map((entry) => {
          const only = levelCounts(rows, streamKeys, { stream: entry.key, grade })
          return (
            <MetricCard
              key={entry.key}
              label={entry.label}
              value={only.full.toLocaleString()}
              note={entry.meaning}
              tone={'neutral'}
            />
          )
        })}
      </section>

      <section className="stack-tight">
        <div className="section-heading">
          <h2>The list</h2>
          <span className="subtle">
            {entries.length} shown · {LEVEL_LABELS[level].toLowerCase()}
          </span>
        </div>

        <div className="filter-row" role="group" aria-label="How much of the caseload to show">
          {(['priority', 'full', 'everyone'] as CaseloadLevel[]).map((option) => (
            <button
              key={option}
              type="button"
              className="button"
              data-active={level === option}
              onClick={() => setLevel(option)}
            >
              {LEVEL_LABELS[option]} ({counts[option]})
            </button>
          ))}
        </div>

        {/* Only rendered when the account holds more than one stream — a nurse
            narrowing "attendance and health" to one of two is useful; a control
            with a single option on it is a control that says nothing. */}
        {streams.length > 1 ? (
          <div className="filter-row" role="group" aria-label="Filter by stream">
            <button
              type="button"
              className="button"
              data-active={stream === null}
              onClick={() => setStream(null)}
            >
              All streams
            </button>
            {streams.map((entry) => (
              <button
                key={entry.key}
                type="button"
                className="button"
                data-active={stream === entry.key}
                onClick={() => setStream(entry.key)}
              >
                {entry.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="filter-row" role="group" aria-label="Filter by grade">
          <button
            type="button"
            className="button"
            data-active={grade === null}
            onClick={() => setGrade(null)}
          >
            All grades
          </button>
          {grades.map((entry) => (
            <button
              key={entry}
              type="button"
              className="button"
              data-active={grade === entry}
              onClick={() => setGrade(entry)}
            >
              {gradeLabel(entry)}
            </button>
          ))}
        </div>

        {entries.length === 0 ? (
          <Notice tone="neutral">
            Nothing on record here for{' '}
            {stream === null
              ? 'these streams'
              : streams.find((entry) => entry.key === stream)?.label.toLowerCase()}
            {grade === null ? '' : ` in ${gradeLabel(grade)}`} at this level. That is the list
            being empty, not the data being missing — widen it with the controls above.
          </Notice>
        ) : (
          <div className="caseload-list">
            {entries.map((entry) => (
              <CaseloadCard key={entry.row.studentId} entry={entry} linked={canOpenStudents} />
            ))}
          </div>
        )}
      </section>

      {entries.length > 0 ? (
        <section className="stack-tight">
          <div className="section-heading">
            <h2>This caseload's sky</h2>
            <span className="subtle">every student shown above, by grade</span>
          </div>
          <Constellation
            groups={caseloadSky(entries, { canOpenStudents })}
            legend={SHARE_LEGEND}
            legendNote="One star is one student, and its brightness is that student's own share of the standards taught to them so far — not an average of anyone. Open a star to read the profile it comes from."
            footnote="The list above says who needs attention. This says what it is costing them."
          />
        </section>
      ) : null}

      <NarrativeBlock title="How this list was assembled">
        <p>
          Chronic absence arrives already computed, against the standard definition of missing
          more than a tenth of enrolled days. Every other line is an editorial judgement made
          by reading this district's own figures: attendance below{' '}
          {THRESHOLDS.attendanceWatch}% without the chronic flag, {THRESHOLDS.tardyWatch} or
          more late arrivals, {THRESHOLDS.referralWatch} discipline referrals to watch and{' '}
          {THRESHOLDS.referralPriority} to prioritise, any suspension,{' '}
          {THRESHOLDS.nurseVisitWatch} or more health-office visits, and an IEP or 504 plan
          ahead of other services.
        </p>
        <p>
          None of those numbers was chosen by anyone qualified to choose them, which is the
          same admission <Link to="/research">the research library</Link> makes about its own
          thresholds and is worth making in the same words. They are named here so the rule
          that built the list can be argued with.
        </p>
      </NarrativeBlock>

      {/*
        Building figures, not the caseload's own. A rate computed over a list
        selected for chronic absence is 100% chronic absence by construction, and a
        research claim fired on it would be describing the filter rather than the
        building. Each figure is gated on the permission that covers it, so a nurse
        hands over attendance and nothing else — the rule Phase 5 stated and then
        applied case by case: a claim may only trigger on a metric the viewer could
        be shown directly.
      */}
      {building ? (
        <ResearchContext
          role={session.role}
          metrics={groupMetrics({
            attendanceRate: session.can('view_attendance_detail') ? building.attendanceRate : null,
            chronicAbsenteeismRate: session.can('view_attendance_detail')
              ? building.chronicAbsenteeismRate
              : null,
            masteryRate: seesBuildingPage ? building.masteryRate : null,
            homeworkCompletionRate: seesBuildingPage ? building.homeworkCompletionRate : null,
            disciplineReferrals: session.can('view_behavior_detail')
              ? building.disciplineReferrals
              : null,
            studentCount: building.studentCount,
          })}
        />
      ) : null}
    </div>
  )
}

/**
 * One student, with what is on record in the viewer's streams.
 *
 * The concerns are already filtered — `concernsOf` never computed the ones this
 * account cannot read — so this component has no permission logic in it at all.
 * That is deliberate: a card that decides for itself what to hide is a card that
 * will be copied without the check.
 */
function CaseloadCard({ entry, linked }: { entry: CaseloadEntry; linked: boolean }) {
  const { row, concerns, priority } = entry
  const name = `${row.firstName} ${row.lastName}`
  const rate = row.mastery.standardsTaughtToDate > 0 ? row.mastery.masteryRate : null

  const body = (
    <>
      <div className="caseload-card-head">
        <span className="roster-name">{name}</span>
        <span className="subtle">{gradeLabel(row.gradeLevel)}</span>
      </div>

      <div className="caseload-card-figures">
        <span className="roster-mastery numeric">
          {rate === null ? 'not yet taught' : percent(rate, 0)}
        </span>
        <span className="subtle">
          {row.mastery.standardsTaughtToDate === 0
            ? 'no standards taught yet'
            : `${row.mastery.standardsMastered} of ${row.mastery.standardsTaughtToDate} standards`}
        </span>
      </div>

      {concerns.length > 0 ? (
        <div className="roster-flags">
          {concerns.map((concern) => (
            <StatusChip key={`${concern.stream}-${concern.label}`} tone={concern.tone} dot={false}>
              {concern.label}
            </StatusChip>
          ))}
        </div>
      ) : (
        <span className="subtle">Nothing on record in these streams.</span>
      )}

      {row.health.lastEventDate || row.behavior.lastIncidentDate ? (
        <span className="subtle caseload-card-last">
          {/* Only dates from streams that produced a concern are printed. A last
              contact date from a stream the viewer does not hold would be the
              stream leaking through a timestamp. */}
          {lastTouch(entry)}
        </span>
      ) : null}
    </>
  )

  const className = 'roster-card caseload-card'
  const tone = masteryTone(rate)

  return linked ? (
    <Link className={className} to={`/student/${row.studentId}`} data-tone={tone} data-priority={priority}>
      {body}
    </Link>
  ) : (
    <div className={className} data-tone={tone} data-priority={priority}>
      {body}
    </div>
  )
}

/** The most recent thing on record, in a stream that produced a concern. */
function lastTouch(entry: CaseloadEntry): string | null {
  const streams = new Set(entry.concerns.map((concern) => concern.stream))
  const dates: string[] = []
  if (streams.has('health') && entry.row.health.lastEventDate) {
    dates.push(entry.row.health.lastEventDate)
  }
  if (streams.has('behavior') && entry.row.behavior.lastIncidentDate) {
    dates.push(entry.row.behavior.lastIncidentDate)
  }
  const latest = dates.sort().at(-1)
  return latest ? `Last recorded ${formatDate(latest)}` : null
}
