/**
 * The citation library, readable.
 *
 * The addendum's argument for storing research as records rather than sentences
 * in components was that the sourcing would be auditable. For four phases it was
 * auditable in principle and unauditable in fact: the only way to see what the
 * library held was to read the generator, and the only way to see what any role
 * actually got out of it was to sign in as that role and look at the bottom of a
 * page. Phase 5 began by writing a script to answer "what does a community
 * member see?" — which is the question this page now answers without one.
 *
 * Two things it is built to catch, in the same spirit as `/design`:
 *
 *   1. **A role the library does not speak to.** Four of the ten were in that
 *      state and it took four phases to notice, because a role with no claims and
 *      a role whose claims did not happen to trigger looked identical — both
 *      rendered nothing at all. The coverage table separates them.
 *   2. **A claim that can never fire.** Half the library was in that state: the
 *      trigger named a metric no view supplied. Anything still inert shows here
 *      as inert rather than as a well-written record nobody reads.
 *
 * Outside the guard, like `/design`, and for a stronger reason than convenience.
 * The library holds no district data — it is published research and the rules for
 * showing it — and a claim that auditability is a feature does not survive the
 * audit being available only to insiders. The one district figure on the page is
 * the coverage column, computed from aggregates the community view publishes to
 * anyone.
 */

import type { ResearchCitation } from '../types/supernova'
import { loadAggregates, loadResearchCitations } from '../data/client'
import { useAsync } from '../data/useAsync'
import { ROLE_LABELS, ROLE_ORDER, type Role } from '../session/roles'
import { spreadOf } from './admin/compare'
import {
  ErrorState,
  Loading,
  NarrativeBlock,
  Notice,
  StatusChip,
  percent,
} from '../ui/primitives'
import {
  METRICS,
  coverageOf,
  describeTrigger,
  exercisableAt,
  groupMetrics,
  isUnverified,
  matches,
  triggerOf,
  type MetricBag,
} from '../ui/research'

const TOPIC_LABELS: Record<string, string> = {
  attendance: 'Attendance',
  behavior: 'Behaviour',
  engagement: 'Engagement',
  mastery_progression: 'Mastery and evidence',
  family_involvement: 'Family involvement',
  interruptions: 'Interruptions',
  special_services: 'Special services',
  prior_achievement: 'Prior achievement',
}

const SOURCE_LABELS: Record<string, string> = {
  peer_reviewed: 'Peer reviewed',
  government_report: 'Government report',
  research_organization: 'Research organization',
  meta_analysis: 'Meta-analysis',
  other: 'Other',
}

export function ResearchView() {
  const libraryState = useAsync(loadResearchCitations, [])
  const aggregatesState = useAsync(loadAggregates, [])

  if (libraryState.status === 'error') {
    return (
      <div className="page">
        <ErrorState error={libraryState.error} />
      </div>
    )
  }
  if (!libraryState.value) {
    return (
      <div className="page">
        <Loading what="the research library" />
      </div>
    )
  }

  const citations = libraryState.value.citations
  const unverified = citations.filter(isUnverified).length

  // The district's own figures, so the coverage column reports what each role
  // sees today rather than what it could see against some other district.
  const aggregates = aggregatesState.value
  const districtBag: MetricBag | null = aggregates
    ? groupMetrics({
        ...aggregates.district,
        masterySpreadPoints: Math.max(
          spreadOf(aggregates.grades.map((entry) => entry.masteryRate)).range,
          spreadOf(aggregates.schools.map((entry) => entry.masteryRate)).range,
        ),
      })
    : null

  const byTopic = [...new Set(citations.map((citation) => citation.topic))].sort((a, b) =>
    (TOPIC_LABELS[a] ?? a).localeCompare(TOPIC_LABELS[b] ?? b),
  )

  return (
    <div className="page stack">
      <header className="student-head">
        <div className="stack-tight">
          <div className="eyebrow">Reference</div>
          <h1>The research library</h1>
          <div className="row subtle">
            <span>{citations.length} claims</span>
            <span>·</span>
            <span>{byTopic.length} topics</span>
            <span>·</span>
            <span>{unverified} awaiting review</span>
          </div>
        </div>
      </header>

      <NarrativeBlock>
        <p>
          Every dashboard in Supernova pairs its figures with research. The claims are stored
          as records rather than written into the pages, so the same claim reads identically
          at every zoom level and its sourcing can be checked — which is what this page is
          for. Nothing appears on a dashboard because its topic is relevant. It appears
          because a figure on that page crossed the threshold the claim is filed under.
        </p>
        <p className="subtle">
          A claim and its trigger are two different kinds of statement, and it is easy to read
          them as one. The claim is what the source says. The trigger is an editorial decision
          about when the claim is worth showing, and carries no authority from the source at
          all — “above 25 referrals per 100 students” is a judgement made here, not a rate any
          of this research identifies as high.
        </p>
      </NarrativeBlock>

      {unverified > 0 ? (
        <Notice tone="caution">
          <strong>
            {unverified} of {citations.length} claims have not been checked against their
            source.
          </strong>{' '}
          The schema is explicit that nothing marked <code>needs_human_review</code> should
          reach a stakeholder-facing view. They are shown anyway, flagged, on the grounds that
          an outstanding review which is visible is more honest than a library hidden until
          somebody gets to it — but the flag means what it says. Every claim below is worded
          correlationally and carries a note on how far it can be pushed; none of that is a
          substitute for reading the source.
        </Notice>
      ) : null}

      <CoverageTable citations={citations} bag={districtBag} />

      {byTopic.map((topic) => (
        <section className="stack-tight" key={topic}>
          <div className="section-heading">
            <h2>{TOPIC_LABELS[topic] ?? topic}</h2>
            <span className="subtle">
              {citations.filter((citation) => citation.topic === topic).length} claims
            </span>
          </div>
          {citations
            .filter((citation) => citation.topic === topic)
            .map((citation) => (
              <CitationCard key={citation.id} citation={citation} bag={districtBag} />
            ))}
        </section>
      ))}
    </div>
  )
}

/**
 * What each role gets, counted rather than asserted.
 *
 * The "showing" column is measured against the district's own figures, which are
 * group-scale, so a claim about one child is not failing there — it is not being
 * asked. Reporting those as zero would make the student and guardian rows look
 * like the gap this table exists to find. They are counted separately.
 */
function CoverageTable({
  citations,
  bag,
}: {
  citations: ResearchCitation[]
  bag: MetricBag | null
}) {
  return (
    <section className="card stack-tight">
      <div className="section-heading">
        <h2>What each role sees</h2>
        <span className="subtle">measured, not assumed</span>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Role</th>
              <th className="numeric">Claims tagged</th>
              <th className="numeric">About one student</th>
              <th className="numeric">Showing on district figures</th>
              <th>State</th>
            </tr>
          </thead>
          <tbody>
            {ROLE_ORDER.map((role) => (
              <CoverageRow key={role} role={role} citations={citations} bag={bag} />
            ))}
          </tbody>
        </table>
      </div>

      <p className="prose subtle">
        The last column is this district on the current year's figures, not a property of
        the library: a claim that is silent here is not
        broken, it is a claim about a condition this district does not meet. The column before
        it counts claims keyed to one student's own figures, which a page about a district
        never supplies and never should. A role with nothing in any column is the state worth
        acting on — the library has nothing to say to it at all.
      </p>
    </section>
  )
}

function CoverageRow({
  role,
  citations,
  bag,
}: {
  role: Role
  citations: ResearchCitation[]
  bag: MetricBag | null
}) {
  const tagged = citations.filter((citation) => citation.applicableRoles?.includes(role))
  const studentScale = tagged.filter((citation) => !exercisableAt(citation, 'group'))
  const firing = bag ? coverageOf(citations, bag, role).firing.length : null

  // A role whose claims are about individuals is not failing to appear here; a
  // page about a district does not supply a child's figures and should not. Only
  // an empty first column is a gap in the library.
  const [tone, label] =
    tagged.length === 0
      ? (['critical', 'No claims tagged'] as const)
      : firing !== null && firing > 0
        ? (['strong', 'Covered'] as const)
        : studentScale.length > 0
          ? (['neutral', 'Individual views only'] as const)
          : (['caution', 'Tagged, none triggered here'] as const)

  return (
    <tr>
      <td>{ROLE_LABELS[role]}</td>
      <td className="numeric">{tagged.length}</td>
      <td className="numeric">{studentScale.length}</td>
      <td className="numeric">{firing ?? '—'}</td>
      <td>
        <StatusChip tone={tone}>{label}</StatusChip>
      </td>
    </tr>
  )
}

function CitationCard({
  citation,
  bag,
}: {
  citation: ResearchCitation
  bag: MetricBag | null
}) {
  const condition = triggerOf(citation)
  const roles = citation.applicableRoles ?? []

  return (
    <article className="card citation">
      <p className="research-claim">{citation.claim}</p>

      <p className="research-source subtle">
        {citation.source.authorOrOrganization}, {citation.source.publicationYear}.{' '}
        <a href={citation.source.url} target="_blank" rel="noreferrer">
          {citation.source.title}
        </a>{' '}
        · {SOURCE_LABELS[citation.source.sourceType] ?? citation.source.sourceType}
        {isUnverified(citation) ? (
          <span className="research-flag" title="Not yet verified against the source">
            unverified
          </span>
        ) : null}
      </p>

      <p className="research-confidence">{citation.confidenceNote}</p>

      <dl className="citation-facts">
        <div>
          <dt>When it shows</dt>
          <dd>
            {condition ? (
              <>
                {describeTrigger(condition)}{' '}
                <span className="subtle">
                  Scale: {METRICS[condition.metric].scale === 'either'
                    ? 'a student or a group'
                    : METRICS[condition.metric].scale === 'student'
                      ? 'one student'
                      : 'a group'}
                  .
                </span>
              </>
            ) : (
              <span className="caution-text">
                No trigger this build can act on, so it never shows anywhere.
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt>Shown to</dt>
          <dd>
            {roles.length > 0
              ? ROLE_ORDER.filter((role) => roles.includes(role))
                  .map((role) => ROLE_LABELS[role])
                  .join(', ')
              : 'No role — this claim reaches nobody.'}
          </dd>
        </div>
        <div>
          <dt>On this district</dt>
          <dd>{describeStateHere(citation, bag)}</dd>
        </div>
      </dl>
    </article>
  )
}

function describeStateHere(citation: ResearchCitation, bag: MetricBag | null): string {
  const condition = triggerOf(citation)
  if (!condition) return 'Inert.'
  if (!bag) return 'Not yet computed.'
  if (!exercisableAt(citation, 'group')) {
    return 'Keyed to one student, so the district figures do not exercise it.'
  }
  const value = bag.values[condition.metric]
  if (value === null || value === undefined) return 'The district figures do not carry this metric.'
  const numeric = typeof value === 'boolean' ? (value ? 1 : 0) : value
  const reading =
    METRICS[condition.metric].unit === 'percent' ? percent(numeric, 1) : numeric.toFixed(1)
  return `${reading} district-wide — ${matches(condition, bag) ? 'showing' : 'silent'}.`
}
