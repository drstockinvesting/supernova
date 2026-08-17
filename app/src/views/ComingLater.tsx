import { Link } from 'react-router-dom'
import { Notice } from '../ui/primitives'

/**
 * Phase 2 builds outward from the student profile, so the outer layers have routes
 * before they have views. Saying which stage a layer belongs to is more useful than
 * a blank 404 — and keeps the build order visible while it is still in progress.
 */
export function ComingLater({ layer, stage }: { layer: string; stage: string }) {
  return (
    <div className="page stack">
      <div>
        <div className="eyebrow">{stage}</div>
        <h1>{layer} view</h1>
      </div>
      <Notice>
        This layer is not built yet. Supernova is being assembled from the inside out —
        the student profile first, then the family view, then teacher, administrator,
        and board. The data behind this view already exists in the dataset.
      </Notice>
      <p className="prose">
        <Link to="/">Back to your own dashboard</Link>
      </p>
    </div>
  )
}
