/**
 * Research context, matched to what the numbers on screen actually say.
 *
 * The citation library carries machine-readable trigger conditions
 * (`{metric, comparator, threshold}`) and an applicable-role list, so a view hands
 * over its metrics and gets back only the claims that bear on them. Nothing is
 * shown "because the topic is attendance"; it is shown because this student's
 * attendance is below the threshold the citation is about.
 *
 * Every citation in the dataset is marked `needs_human_review`, and the schema is
 * blunt that nothing so marked should reach a stakeholder-facing view. Rather than
 * hide the library until someone verifies it, unreviewed claims render behind an
 * explicit marker — the reviewing is visibly outstanding instead of silently
 * skipped.
 */

import type { ResearchCitation } from '../types/supernova'
import { useAsync } from '../data/useAsync'
import { loadResearchCitations } from '../data/client'
import type { Role } from '../session/roles'

export type MetricBag = Record<string, number | boolean | null | undefined>

interface TriggerCondition {
  metric: string
  comparator: 'above' | 'below' | 'equals'
  threshold: number
}

function triggerOf(citation: ResearchCitation): TriggerCondition | null {
  const raw = citation.triggerConditions as Partial<TriggerCondition> | undefined
  if (!raw?.metric || !raw.comparator || raw.threshold === undefined) return null
  return raw as TriggerCondition
}

function matches(condition: TriggerCondition, metrics: MetricBag): boolean {
  const raw = metrics[condition.metric]
  if (raw === null || raw === undefined) return false

  // Boolean-valued conditions are expressed as `equals 1` in the data.
  const value = typeof raw === 'boolean' ? (raw ? 1 : 0) : raw

  switch (condition.comparator) {
    case 'above':
      return value > condition.threshold
    case 'below':
      return value < condition.threshold
    case 'equals':
      return value === condition.threshold
    default:
      return false
  }
}

export function selectCitations(
  citations: ResearchCitation[],
  metrics: MetricBag,
  role: Role,
): ResearchCitation[] {
  return citations.filter((citation) => {
    if (citation.applicableRoles && !citation.applicableRoles.includes(role)) return false
    const condition = triggerOf(citation)
    return condition ? matches(condition, metrics) : false
  })
}

export function ResearchContext({
  metrics,
  role,
  limit = 3,
}: {
  metrics: MetricBag
  role: Role
  limit?: number
}) {
  const state = useAsync(loadResearchCitations, [])
  if (state.status !== 'ready') return null

  const selected = selectCitations(state.value.citations, metrics, role).slice(0, limit)
  if (selected.length === 0) return null

  return (
    <section className="card research">
      <div className="eyebrow">Research context</div>
      <ul className="research-list">
        {selected.map((citation) => (
          <li key={citation.id}>
            <p className="research-claim">{citation.claim}</p>
            <p className="research-confidence">{citation.confidenceNote}</p>
            <p className="research-source subtle">
              {citation.source.authorOrOrganization}, {citation.source.publicationYear}.{' '}
              <a href={citation.source.url} target="_blank" rel="noreferrer">
                {citation.source.title}
              </a>
              {citation.metadata.reviewStatus === 'needs_human_review' ? (
                <span className="research-flag" title="Not yet verified against the source">
                  unverified
                </span>
              ) : null}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
