/**
 * The vocabulary every zoom level shares.
 *
 * The fractal premise only holds if a metric looks the same whether it describes
 * one student or a whole district, so these are deliberately unaware of scale:
 * they take a number, a label, and a tone, and nothing about who is being measured.
 */

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export type Tone = 'strong' | 'caution' | 'concern' | 'critical' | 'neutral'

/**
 * Thresholds come from the UI/UX document's colour rules. They are intentionally
 * in one place: a rate that is "concerning" on the student view must be concerning
 * on the district view too, or the colour language stops meaning anything.
 */
export function masteryTone(rate: number | null | undefined): Tone {
  if (rate === null || rate === undefined) return 'neutral'
  if (rate >= 70) return 'strong'
  if (rate >= 50) return 'caution'
  if (rate >= 30) return 'concern'
  return 'critical'
}

export function attendanceTone(rate: number | null | undefined): Tone {
  if (rate === null || rate === undefined) return 'neutral'
  if (rate >= 95) return 'strong'
  if (rate >= 90) return 'caution'
  if (rate >= 85) return 'concern'
  return 'critical'
}

export function completionTone(rate: number | null | undefined): Tone {
  if (rate === null || rate === undefined) return 'neutral'
  if (rate >= 85) return 'strong'
  if (rate >= 70) return 'caution'
  if (rate >= 55) return 'concern'
  return 'critical'
}

export function percent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined) return '—'
  return `${value.toFixed(digits)}%`
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return iso
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function MetricCard({
  label,
  value,
  note,
  tone = 'neutral',
}: {
  label: string
  value: ReactNode
  note?: ReactNode
  tone?: Tone
}) {
  return (
    <div className="card metric" data-tone={tone}>
      <span className="metric-value">{value}</span>
      <span className="metric-label">{label}</span>
      {note ? <span className="metric-note">{note}</span> : null}
    </div>
  )
}

export function StatusChip({
  children,
  tone = 'neutral',
  dot = true,
}: {
  children: ReactNode
  tone?: Tone
  dot?: boolean
}) {
  return (
    <span className="chip" data-tone={tone} data-dot={dot}>
      {children}
    </span>
  )
}

export function Notice({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: Tone
}) {
  return (
    <div className="notice" data-tone={tone}>
      {children}
    </div>
  )
}

export interface Crumb {
  label: string
  to?: string
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`}>
          {index > 0 ? <span className="breadcrumb-sep">/</span> : null}
          {item.to ? <Link to={item.to}>{item.label}</Link> : <span>{item.label}</span>}
        </span>
      ))}
    </nav>
  )
}

/**
 * Prose alongside the numbers. The vision document is explicit that raw figures
 * are paired with interpretation at every level, so this is a first-class element
 * rather than a caption.
 */
export function NarrativeBlock({
  title,
  children,
}: {
  title?: string
  children: ReactNode
}) {
  return (
    <div className="card narrative">
      {title ? <div className="eyebrow">{title}</div> : null}
      <div className="prose">{children}</div>
    </div>
  )
}

export function Loading({ what }: { what: string }) {
  return <div className="loading subtle">Loading {what}…</div>
}

export function ErrorState({ error }: { error: Error }) {
  return (
    <Notice tone="critical">
      <strong>Could not load this view.</strong> {error.message}
    </Notice>
  )
}
