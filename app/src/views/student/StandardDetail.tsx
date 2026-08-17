/**
 * What stands behind one star.
 *
 * "Every claim backed by evidence" is the product's central promise, and this is
 * where it either holds or does not: the real standard code and text, then the
 * individual artifacts, each with its source, its date, and whether the analysis
 * judged that it demonstrated the standard.
 *
 * Artifacts load from the evidence companion file only when a standard is opened —
 * they are roughly three quarters of a student's data, and nobody needs them until
 * they ask this question.
 */

import type { Evidence, MasteryRecord, Standard } from '../../types/supernova'
import { StatusChip, formatDate, type Tone } from '../../ui/primitives'
import { starLabel, starStateOf } from './MasteryConstellation'

const STRENGTH_NOTE: Record<string, string> = {
  none: 'no artifacts recorded',
  insubstantial: '1–2 artifacts',
  moderate: '3–5 artifacts',
  substantial: '6 or more artifacts',
}

const STATE_TONE: Record<string, Tone> = {
  mastered: 'strong',
  in_progress: 'caution',
  no_evidence: 'concern',
  not_taught: 'neutral',
}

export function StandardDetail({
  record,
  standard,
  artifacts,
  unitName,
  canSeeEvidence,
  onClose,
}: {
  record: MasteryRecord
  standard: Standard | undefined
  artifacts: Evidence[] | null
  unitName: string | undefined
  canSeeEvidence: boolean
  onClose: () => void
}) {
  const state = starStateOf(record)

  return (
    <aside className="detail card" aria-label="Standard detail">
      <div className="detail-head">
        <div className="stack-tight">
          <div className="eyebrow">{standard?.framework ?? 'Standard'}</div>
          <h3 className="mono">{standard?.standardCode ?? record.standardId}</h3>
        </div>
        <button type="button" className="button button-quiet" onClick={onClose}>
          Close
        </button>
      </div>

      <p className="detail-text">{standard?.standardText ?? 'Standard text unavailable.'}</p>

      <div className="row">
        <StatusChip tone={STATE_TONE[state]}>{starLabel(record)}</StatusChip>
        <span className="subtle">
          {record.subject}
          {unitName ? ` · ${unitName}` : ''}
          {standard?.domainOrCluster ? ` · ${standard.domainOrCluster}` : ''}
        </span>
      </div>

      {state === 'not_taught' ? (
        <p className="subtle">
          This class has not reached this standard yet. It is tracked for the year and
          counted in the full-year total, but it is not counted against this student's
          mastery rate.
        </p>
      ) : (
        <dl className="detail-facts">
          <div>
            <dt>Evidence strength</dt>
            <dd>
              {record.evidenceStrength}
              <span className="subtle"> · {STRENGTH_NOTE[record.evidenceStrength]}</span>
            </dd>
          </div>
          <div>
            <dt>First evidence</dt>
            <dd>{formatDate(record.firstEvidenceDate)}</dd>
          </div>
          <div>
            <dt>Most recent</dt>
            <dd>{formatDate(record.mostRecentEvidenceDate)}</dd>
          </div>
        </dl>
      )}

      {state !== 'not_taught' ? (
        <div className="detail-evidence">
          <div className="eyebrow">
            Evidence ({record.evidenceCount})
          </div>
          {!canSeeEvidence ? (
            <p className="subtle">This account cannot view individual evidence artifacts.</p>
          ) : record.evidenceCount === 0 ? (
            <p className="subtle">
              Nothing has come back for this standard. The gap itself is the finding — it
              is what a reteach or a check-in would target.
            </p>
          ) : artifacts === null ? (
            <p className="subtle">Loading evidence…</p>
          ) : (
            <ul className="evidence-list">
              {artifacts.map((artifact) => (
                <li key={artifact.id}>
                  <div className="evidence-head">
                    <span className="evidence-title">{artifact.title}</span>
                    <StatusChip
                      tone={artifact.analysis?.demonstratesStandard ? 'strong' : 'neutral'}
                      dot={false}
                    >
                      {artifact.analysis?.demonstratesStandard ? 'demonstrates' : 'partial'}
                    </StatusChip>
                  </div>
                  <div className="subtle">
                    {formatDate(artifact.evidenceDate)} · {artifact.dataSourceType} ·{' '}
                    {artifact.dataSourceName}
                  </div>
                  {artifact.analysis?.contextNotes ? (
                    <p className="evidence-note">{artifact.analysis.contextNotes}</p>
                  ) : null}
                  {artifact.studentArtifactLink ? (
                    <a
                      className="subtle"
                      href={artifact.studentArtifactLink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open artifact
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </aside>
  )
}
