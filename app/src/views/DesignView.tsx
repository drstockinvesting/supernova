/**
 * The design system, rendering itself.
 *
 * A written design document describes what the tokens are supposed to be. This
 * page *is* the tokens: every swatch reads its own custom property, every star is
 * the real component, every chip is `StatusChip`. So it cannot drift — a token
 * renamed in theme.css breaks a swatch here in the same commit, and a star state
 * that stops being distinguishable is visible on one screen instead of being
 * discovered on a student profile months later.
 *
 * Three things it is deliberately built to catch:
 *
 *   1. **Contrast in both themes.** Every pair is drawn on the surface it actually
 *      lands on, and the theme control in the header switches the whole page. The
 *      mastery ramp lives on the dark panel in both themes because the sky does
 *      not become paper when the chrome does.
 *   2. **Colour carrying meaning alone.** Each status tone is shown beside its
 *      shape and its words. If a row is only distinguishable by hue, that is
 *      legible here as a row that says nothing.
 *   3. **The brightness ramp being one scale.** The evidence steps and the
 *      aggregate ramp are drawn together, because they are the same visual
 *      language reading two different quantities, and the moment they stop lining
 *      up the fractal claim is false.
 *
 * The route is outside `Guard` — it holds no district data, only the language the
 * data is drawn in, so there is nothing here to scope to an account.
 */

import { Constellation, UnlitSky } from '../ui/Constellation'
import { SHARE_LEGEND, intensityOfRate, type StarGroup } from '../ui/stars'
import {
  MetricCard,
  NarrativeBlock,
  Notice,
  StatusChip,
  type Tone,
  attendanceTone,
  completionTone,
  masteryTone,
  percent,
} from '../ui/primitives'
import { SupernovaMark } from '../ui/ThemeToggle'

const TONES: Tone[] = ['strong', 'caution', 'concern', 'critical', 'neutral']

const SURFACE_TOKENS = [
  ['--bg', 'The page. A sky in dark, paper in light.'],
  ['--surface', 'A card.'],
  ['--surface-raised', 'A card that floats — the persona panel.'],
  ['--surface-sunken', 'A well: a track behind a bar, an input.'],
  ['--surface-deep', 'The constellation panel. Dark in both themes.'],
  ['--border', 'A hairline between things of equal weight.'],
  ['--border-strong', 'The edge of something interactive.'],
]

const TEXT_TOKENS = [
  ['--text', 'Body copy and every figure that matters.'],
  ['--text-muted', 'Prose that explains a figure.'],
  ['--text-subtle', 'Labels, units, and counts beside a thing.'],
  ['--accent', 'Links, focus, and the current selection.'],
]

/** The four evidence steps, as they appear on a student profile. */
const EVIDENCE_STEPS: { state: string; strength: string; label: string; meaning: string }[] = [
  {
    state: 'mastered',
    strength: 'substantial',
    label: 'Mastered · substantial',
    meaning: 'Six or more artifacts stand behind the judgement.',
  },
  {
    state: 'mastered',
    strength: 'moderate',
    label: 'Mastered · moderate',
    meaning: 'Three to five artifacts.',
  },
  {
    state: 'mastered',
    strength: 'insubstantial',
    label: 'Mastered · insubstantial',
    meaning: 'One or two. Mastery claimed on thin evidence, and it looks thin.',
  },
  {
    state: 'in_progress',
    strength: 'moderate',
    label: 'In progress',
    meaning: 'Evidence is accumulating; mastery is not yet claimed.',
  },
  {
    state: 'no_evidence',
    strength: 'none',
    label: 'No evidence',
    meaning: 'Taught, and nothing came back. Genuinely dark.',
  },
  {
    state: 'not_taught',
    strength: 'none',
    label: 'Not yet taught',
    meaning: 'Dark because the class has not reached it. Not a failure.',
  },
  {
    state: 'withheld',
    strength: 'none',
    label: 'Withheld',
    meaning: 'Suppressed by the small-cell rule. Drawn, not removed.',
  },
]

const RAMP = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

/** A sky built from nothing but the scale itself, so it can be read as a ruler. */
const RAMP_SKY: StarGroup[] = [
  {
    id: 'ramp',
    label: 'The aggregate ramp',
    meta: 'one star every ten points',
    clusters: [
      {
        id: 'ramp-cluster',
        label: '0% through 100%',
        stars: RAMP.map((rate) => ({
          id: `ramp-${rate}`,
          state: 'lit' as const,
          brightness: 'none' as const,
          intensity: intensityOfRate(rate),
          label: `${rate}% of standards taught have been demonstrated`,
        })),
      },
      {
        id: 'ramp-dark',
        label: 'The two dark states',
        stars: [
          {
            id: 'ramp-untaught',
            state: 'not_taught' as const,
            brightness: 'none' as const,
            label: 'Not yet taught',
          },
          {
            id: 'ramp-withheld',
            state: 'withheld' as const,
            brightness: 'none' as const,
            label: 'Withheld by the small-cell rule',
          },
        ],
      },
    ],
  },
]

export function DesignView() {
  return (
    <div className="page stack design">
      <header className="stack-tight">
        <div className="eyebrow">Design system · Phase 4</div>
        <h1 className="design-title">
          <SupernovaMark size={34} />
          The language every view is drawn in
        </h1>
        <p className="prose">
          Nothing on this page is district data. Every swatch below reads the same custom
          property the app reads, and every star and chip is the component the views use — so
          this page breaks when a token drifts, which is the only reason to have it. Switch the
          theme in the header to check both.
        </p>
      </header>

      {/* --- Colour ------------------------------------------------------- */}

      <section className="card stack-tight">
        <div className="section-heading">
          <h2>Surfaces</h2>
          <span className="subtle">dark is the base; light is the override</span>
        </div>
        <ul className="swatch-list">
          {SURFACE_TOKENS.map(([token, meaning]) => (
            <li key={token} className="swatch-row">
              <span className="swatch" style={{ background: `var(${token})` }} />
              <span className="mono">{token}</span>
              <span className="subtle">{meaning}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card stack-tight">
        <div className="section-heading">
          <h2>Text and accent</h2>
          <span className="subtle">drawn on the surface each one lands on</span>
        </div>
        <ul className="swatch-list">
          {TEXT_TOKENS.map(([token, meaning]) => (
            <li key={token} className="swatch-row">
              <span className="swatch swatch-type" style={{ color: `var(${token})` }}>
                Aa
              </span>
              <span className="mono">{token}</span>
              <span className="subtle">{meaning}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* --- Status ------------------------------------------------------- */}

      <section className="card stack-tight">
        <div className="section-heading">
          <h2>Status tones</h2>
          <span className="subtle">four meanings, at every scale</span>
        </div>
        <p className="prose">
          A tone means the same thing whether it describes one student or a whole district. The
          thresholds live in <span className="mono">ui/primitives.ts</span> and are the reason:
          a rate that is concerning on a profile has to be concerning on a district page, or
          the colour stops carrying anything. Each row shows the tone in every form it takes,
          and each one carries words as well as hue — nothing here is legible by colour alone.
        </p>
        <ul className="swatch-list">
          {TONES.map((tone) => (
            <li key={tone} className="swatch-row swatch-row-wide">
              <StatusChip tone={tone}>{tone}</StatusChip>
              <span className="tone-sample" data-tone={tone}>
                <span className="metric" data-tone={tone}>
                  <span className="metric-value">72.6%</span>
                </span>
              </span>
              <span className="rate-cell">
                <span className="rate-track">
                  <span className="rate-fill" data-tone={tone} style={{ width: '62%' }} />
                </span>
              </span>
              <span className="subtle">{TONE_MEANING[tone]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="stack-tight">
        <div className="section-heading">
          <h2>Thresholds</h2>
          <span className="subtle">where each tone begins</span>
        </div>
        <div className="table-scroll card">
          <table>
            <thead>
              <tr>
                <th>Rate</th>
                <th>Mastery</th>
                <th>Attendance</th>
                <th>Homework completion</th>
              </tr>
            </thead>
            <tbody>
              {[97, 92, 87, 75, 60, 40, 20].map((rate) => (
                <tr key={rate}>
                  <td className="numeric mono">{percent(rate, 0)}</td>
                  <td>
                    <StatusChip tone={masteryTone(rate)}>{masteryTone(rate)}</StatusChip>
                  </td>
                  <td>
                    <StatusChip tone={attendanceTone(rate)}>{attendanceTone(rate)}</StatusChip>
                  </td>
                  <td>
                    <StatusChip tone={completionTone(rate)}>{completionTone(rate)}</StatusChip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* --- The star ----------------------------------------------------- */}

      <section className="stack-tight">
        <div className="section-heading">
          <h2>The star</h2>
          <span className="subtle">the one mark the whole product is made of</span>
        </div>
        <p className="prose">
          Brightness carries how much mastery is demonstrated; hue carries nothing. The ramp is
          ordered by luminance so it survives being printed in grey or read by an eye that
          cannot separate the golds — and the two dark states are told apart by their outline,
          not their fill, for the same reason.
        </p>

        <div className="card-deep constellation stack-tight">
          <h3 className="design-panel-heading">Evidence strength — one student, one standard</h3>
          <ul className="star-legend">
            {EVIDENCE_STEPS.map((step) => (
              <li key={step.label}>
                <span
                  className="star"
                  data-state={step.state}
                  data-strength={step.strength}
                  aria-hidden
                />
                <span className="star-legend-label">{step.label}</span>
                <span className="star-legend-meaning">{step.meaning}</span>
              </li>
            ))}
          </ul>
        </div>

        <Constellation
          groups={RAMP_SKY}
          legend={SHARE_LEGEND}
          legendNote="The aggregate ramp is continuous rather than banded, because every quantity it describes — a classroom's rate, a grade's rate in one subject — is a share. It is absolute: 40% is this bright in every sky in the app, never shaded against the stars beside it."
        />
      </section>

      {/* --- Composed --------------------------------------------------- */}

      <section className="stack-tight">
        <div className="section-heading">
          <h2>Composed elements</h2>
          <span className="subtle">as the views assemble them</span>
        </div>

        <div className="grid">
          <MetricCard
            label="Mastery of standards taught so far"
            value={percent(63.4)}
            note="26 of 41 taught · 11 not yet taught"
            tone={masteryTone(63.4)}
          />
          <MetricCard
            label="Attendance"
            value={percent(88)}
            note="chronically absent — above 10% of days"
            tone={attendanceTone(88)}
          />
          <MetricCard label="Discipline referrals" value="558" note="neutral by design" />
        </div>

        <NarrativeBlock title="Narrative block">
          <p>
            Prose alongside the numbers, at every level. The vision document is explicit that
            raw figures are paired with interpretation, so this is a first-class element rather
            than a caption — it is set at the reading measure and in muted text so it reads as
            explanation rather than as another figure.
          </p>
        </NarrativeBlock>

        <Notice>
          A neutral notice. Used for a limitation of the data — something the page cannot show,
          and why.
        </Notice>
        <Notice tone="caution">
          A caution notice. Used where a figure is real but would be misread without a warning
          beside it.
        </Notice>
      </section>

      {/* --- Enforcement states ------------------------------------------- */}

      <section className="stack-tight">
        <div className="section-heading">
          <h2>The states enforcement created</h2>
          <span className="subtle">absent is not empty</span>
        </div>
        <p className="prose">
          Three states exist only because Phase 3 enforces anything, and none of them is an
          error. The redirect notice sits under the header and is shown by navigating to
          something outside an account's scope; the other two are here.
        </p>

        <UnlitSky title="The unlit sky">
          <p>
            The constellation frame, kept intact and dark, for a viewer who holds no claim on
            what would be drawn in it. A page that dropped the panel and printed a paragraph
            would say there is nothing here. This says there is something here and it is not
            yours, which is the true statement.
          </p>
        </UnlitSky>

        <div className="card stack-tight">
          <ul className="rule-list">
            <li className="rule">
              <span className="rule-name">A rule with a state</span>
              <StatusChip tone="strong">Enforced on every route</StatusChip>
              <span className="rule-body">
                On the board's disclosure panel, each rule carries whether it is merely in
                force or has actually fired on this district. A protection that has never run
                has been reasoned about, not proven, and a body governing under it is owed that
                distinction.
              </span>
            </li>
            <li className="rule">
              <span className="rule-name">The same rule, untested</span>
              <StatusChip tone="neutral">In force · never fired</StatusChip>
              <span className="rule-body">
                The small-cell suppression is inert on this dataset: the smallest published
                group holds 59 students against a threshold of ten.
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* --- Motion ------------------------------------------------------- */}

      <section className="card stack-tight">
        <div className="section-heading">
          <h2>Motion</h2>
          <span className="subtle">three durations, two curves</span>
        </div>
        <p className="prose">
          Motion exists to keep a change from being missed, never to decorate. A star grows on
          hover because it is a target; the redirect notice arrives with a short movement
          because that is the only cue separating "this just happened" from "this was always
          here". Everything here is removed under{' '}
          <span className="mono">prefers-reduced-motion</span>, and nothing is lost when it is —
          every state that moves is also carried by colour and by words.
        </p>
        <ul className="swatch-list">
          {[
            ['--duration-fast', '120ms', 'A hover. A press.'],
            ['--duration', '220ms', 'Something arriving on screen.'],
            ['--duration-slow', '420ms', 'Reserved. Nothing uses it yet.'],
          ].map(([token, value, meaning]) => (
            <li key={token} className="swatch-row swatch-row-tokens">
              <span className="mono">{token}</span>
              <span className="mono subtle">{value}</span>
              <span className="subtle">{meaning}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

const TONE_MEANING: Record<Tone, string> = {
  strong: 'Healthy. On track.',
  caution: 'Worth a look, not an intervention.',
  concern: 'Behind. Something to act on.',
  critical: 'Far behind, or a count that should not be growing.',
  neutral: 'A figure with no good or bad direction — referrals, counts, totals.',
}
