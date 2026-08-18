/**
 * The constellation, at any scale.
 *
 * The vision document's central claim is that one visual language repeats at every
 * zoom level — lesson, unit, subject, student, classroom, grade, building,
 * community — and that a reader who learns it once can read all of them. Through
 * Phase 3 that claim was only true of the student profile: everything above it was
 * cards and ranked tables, and the constellation was a student-shaped component
 * that could not describe anything else.
 *
 * This is the same picture with the student taken out of it. It knows about groups,
 * clusters, and stars; it does not know whether a star is a standard, a unit, a
 * classroom, or a grade. Each view supplies the mapping, and the rules that make
 * the picture readable are the same everywhere:
 *
 *   A star is one child of the thing you are looking at.
 *   Its brightness is how much of the mastery inside it has been demonstrated.
 *   Darkness is a place, not an error — and "not yet taught" is not "not learned".
 *
 * Two levels of grouping, always. On a student it is subject then unit; on a
 * building it is grade then subject; on the district it is building then grade.
 * The nesting is what makes a sky legible instead of a heap, and holding it fixed
 * at two is what makes the levels feel like the same picture.
 */

import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { EVIDENCE_LEGEND, type LegendEntry, type Star, type StarGroup } from './stars'

/*
 * The vocabulary — star states, the brightness ramp, and the two legends — lives
 * in `stars.ts`. Two reasons, and the second is the reason it is imported rather
 * than re-exported from here:
 *
 *   - `node --test` strips types but does not transform JSX, so anything a test
 *     touches has to live outside a `.tsx` file.
 *   - This file exports components. A module that exports both components and
 *     values breaks React Fast Refresh, and a wildcard re-export makes that
 *     impossible for the linter to reason about at all. Views import the picture
 *     from here and the words for it from `./stars`.
 */

function StarMark({ star }: { star: Star }) {
  const props = {
    className: 'star',
    'data-state': star.state,
    'data-strength': star.brightness,
    'data-selected': star.selected ?? false,
    title: star.label,
    'aria-label': star.label,
    // The one inline style in the app, and it earns it: this is a per-datum value
    // on a continuous scale, so it cannot live in a stylesheet. The CSS reads it
    // as a custom property and does the mixing.
    style:
      star.intensity === undefined
        ? undefined
        : ({ '--star-intensity': star.intensity } as CSSProperties),
  }

  if (star.to) return <Link {...props} to={star.to} />
  if (star.onSelect) {
    return <button {...props} type="button" onClick={star.onSelect} />
  }
  // No drill-down from here. Still labelled, so a screen reader gets the same
  // reading a sighted user gets from the colour.
  return <span {...props} role="img" />
}

/**
 * The sky, with nothing in it — because the viewer holds no claim on what would be
 * drawn, not because the data came back empty.
 *
 * This is the frame every other zoom level uses, kept deliberately intact. A page
 * that drops the constellation entirely and prints a paragraph says "there is
 * nothing here"; the frame left standing and unlit says "there is something here,
 * and it is not yours", which is the true statement and the one the product's own
 * grammar already has a word for. It is the same distinction the student profile
 * draws between a dark star and an absent one.
 */
export function UnlitSky({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="constellation card-deep unlit-sky">
      <div className="unlit-sky-mark" aria-hidden>
        <span className="star" data-state="not_taught" data-strength="none" />
      </div>
      <div className="unlit-sky-body">
        <h3>{title}</h3>
        <div className="prose">{children}</div>
      </div>
    </div>
  )
}

export function Constellation({
  groups,
  legend = EVIDENCE_LEGEND,
  legendNote,
  footnote,
}: {
  groups: StarGroup[]
  legend?: LegendEntry[]
  /** What a star *is* at this zoom level. Without it the picture is ambiguous. */
  legendNote?: ReactNode
  footnote?: ReactNode
}) {
  return (
    <div className="constellation card-deep">
      <div className="constellation-legend">
        {legend.map((entry) => (
          <span key={`${entry.state}-${entry.brightness}-${entry.label}`} className="legend-item">
            <span
              className="star"
              data-state={entry.state}
              data-strength={entry.brightness}
              style={
                entry.intensity === undefined
                  ? undefined
                  : ({ '--star-intensity': entry.intensity } as CSSProperties)
              }
              aria-hidden
            />
            {entry.label}
          </span>
        ))}
      </div>

      {legendNote ? <p className="constellation-note">{legendNote}</p> : null}

      {groups.map((group) => (
        <section key={group.id} className="constellation-subject">
          <header>
            <h3>{group.label}</h3>
            {group.meta ? <span className="constellation-count">{group.meta}</span> : null}
          </header>

          <div className="constellation-units">
            {group.clusters.map((cluster) => (
              <div key={cluster.id} className="constellation-unit">
                <div className="constellation-unit-name" title={cluster.label}>
                  {cluster.label}
                </div>
                <div className="star-field">
                  {cluster.stars.map((star) => (
                    <StarMark key={star.id} star={star} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {footnote ? <p className="constellation-note">{footnote}</p> : null}
    </div>
  )
}
