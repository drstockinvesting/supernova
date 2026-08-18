/**
 * Research context, matched to what the numbers on screen actually say.
 *
 * The selector, the metric vocabulary, and the reasoning behind both live in
 * `ui/research.ts` — plain TypeScript, because a test cannot reach into a `.tsx`
 * and this is the part of the product whose failures are invisible.
 *
 * What this file owns is the rendering, and one decision inside it: what to draw
 * when nothing fires.
 *
 * Until Phase 5 the answer was nothing at all — the component returned null and
 * the page simply had no research on it. That made three different facts look
 * identical. The library might hold claims for this role and have none that bear
 * on these figures, which is the ordinary case and the point of triggering at
 * all. Or it might hold nothing for this role whatsoever, which is what four of
 * the ten roles were in and what nobody noticed for four phases. Or the layer
 * might simply not have been placed on the page. A silent component cannot be
 * audited, and this one was silently wrong for most of the product's life.
 *
 * So the three states have three shapes. Context is a card. A quiet library is
 * one line saying how many claims were considered. An untagged role is a caution,
 * because it is a gap in the library rather than a fact about the district — the
 * same reasoning as the disclosure rules that carry "in force · never fired": a
 * protection or a gap that has never announced itself is not thereby absent.
 *
 * Every citation in the dataset is marked `needs_human_review`, and the schema is
 * blunt that nothing so marked should reach a stakeholder-facing view. Rather
 * than hide the library until someone verifies it, unreviewed claims render
 * behind an explicit marker — the reviewing is visibly outstanding instead of
 * silently skipped.
 */

import { Link } from 'react-router-dom'
import type { ResearchCitation } from '../types/supernova'
import { useAsync } from '../data/useAsync'
import { loadResearchCitations } from '../data/client'
import type { Role } from '../session/roles'
import { coverageOf, isUnverified, type MetricBag } from './research'

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

  const coverage = coverageOf(state.value.citations, metrics, role)

  if (coverage.state === 'untagged') {
    return (
      <p className="research-quiet caution-text">
        <strong>No research context is available to this role.</strong> The library holds no
        claim tagged for it, which is a gap in the library rather than a statement about the
        figures above. <Link to="/research">The library and its coverage</Link>.
      </p>
    )
  }

  if (coverage.state === 'quiet') {
    return (
      <p className="research-quiet subtle">
        No research context here. {coverage.tagged} claim{coverage.tagged === 1 ? '' : 's'} in
        the library apply to this role and none of them bear on the figures above.{' '}
        <Link to="/research">See what would show them</Link>.
      </p>
    )
  }

  const shown = coverage.firing.slice(0, limit)
  const hidden = coverage.firing.length - shown.length

  return (
    <section className="card research">
      <div className="eyebrow">Research context</div>
      <ul className="research-list">
        {shown.map((citation) => (
          <Claim key={citation.id} citation={citation} />
        ))}
      </ul>
      <p className="subtle">
        {hidden > 0 ? (
          <>
            {hidden} further claim{hidden === 1 ? '' : 's'} bear{hidden === 1 ? 's' : ''} on
            these figures and {hidden === 1 ? 'is' : 'are'} not shown here.{' '}
          </>
        ) : null}
        Each claim appears because a figure on this page crossed the threshold it is filed
        under, not because its topic seemed relevant.{' '}
        <Link to="/research">The library, and when each claim shows</Link>.
      </p>
    </section>
  )
}

function Claim({ citation }: { citation: ResearchCitation }) {
  return (
    <li>
      <p className="research-claim">{citation.claim}</p>
      <p className="research-confidence">{citation.confidenceNote}</p>
      <p className="research-source subtle">
        {citation.source.authorOrOrganization}, {citation.source.publicationYear}.{' '}
        <a href={citation.source.url} target="_blank" rel="noreferrer">
          {citation.source.title}
        </a>
        {isUnverified(citation) ? (
          <span className="research-flag" title="Not yet verified against the source">
            unverified
          </span>
        ) : null}
      </p>
    </li>
  )
}
