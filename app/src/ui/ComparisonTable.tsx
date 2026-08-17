/**
 * A ranked comparison of like things, with a bar per row.
 *
 * The fractal premise again: comparing six subjects within one student, six
 * within a classroom, and thirteen grades across a district are the same
 * operation on different scales, so they are the same component. It takes rows
 * that already know their own label and numbers, and nothing about what a row
 * represents.
 *
 * Rows can carry a `to` and become links, which is how a district's building
 * list and a building's grade list drill down.
 */

import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { masteryTone, percent, type Tone } from './primitives'

export interface ComparisonRow {
  key: string
  label: string
  /** Shown under the label — a grade's school, a teacher's section count. */
  sublabel?: ReactNode
  mastered: number
  taught: number
  rate: number
  /** Right-hand column, when the comparison needs a second dimension. */
  extra?: ReactNode
  to?: string
  tone?: Tone
}

export function ComparisonTable({
  rows,
  headings = { label: 'Name', extra: null },
  /** Marks the district or building average, so a row reads as above or below it. */
  benchmark,
}: {
  rows: ComparisonRow[]
  headings?: { label: string; extra?: ReactNode }
  benchmark?: { label: string; rate: number }
}) {
  if (rows.length === 0) return null

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>{headings.label}</th>
            <th className="numeric">Mastered</th>
            <th className="numeric">Taught</th>
            <th className="numeric">Rate</th>
            {headings.extra ? <th className="numeric">{headings.extra}</th> : null}
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>
                {row.to ? <Link to={row.to}>{row.label}</Link> : row.label}
                {row.sublabel ? <div className="subtle">{row.sublabel}</div> : null}
              </td>
              <td className="numeric">{row.mastered.toLocaleString()}</td>
              <td className="numeric">{row.taught.toLocaleString()}</td>
              <td className="numeric">{percent(row.rate, 1)}</td>
              {headings.extra ? <td className="numeric">{row.extra ?? '—'}</td> : null}
              <td className="rate-cell">
                <div className="rate-track">
                  <div
                    className="rate-fill"
                    data-tone={row.tone ?? masteryTone(row.rate)}
                    style={{ width: `${Math.min(100, Math.max(0, row.rate))}%` }}
                  />
                  {benchmark ? (
                    <div
                      className="rate-benchmark"
                      style={{ left: `${Math.min(100, Math.max(0, benchmark.rate))}%` }}
                      title={`${benchmark.label}: ${percent(benchmark.rate, 1)}`}
                    />
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {benchmark ? (
        <p className="subtle">
          The line on each bar marks {benchmark.label.toLowerCase()}, {percent(benchmark.rate, 1)}.
        </p>
      ) : null}
    </div>
  )
}
