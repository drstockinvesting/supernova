/**
 * The alternative student dashboard: a K-12 career as a field of galaxies.
 *
 * This is a second view of a student's mastery, not a replacement for the one at
 * `/student/:id`. That view is the record — every standard, its evidence, the
 * attendance and behaviour context it has to be read against, and the permission
 * rules that decide who sees which of those. This one makes one argument at high
 * volume: **your work is light, and here is all of it at once.** They are for
 * different moments, and neither is a better version of the other.
 *
 * Built to the spec in `Supernova Dashboard Spec v1`, with its open questions
 * answered as follows, all of them reversible:
 *
 *   - **§2, entry audio.** Option A. A single Enter button gates the sweep, so it
 *     runs with sound the first time rather than silently. Browsers will not
 *     allow otherwise, and a silent first run of the best moment in the product
 *     is a bad trade for one click.
 *   - **§4, the update queue.** Not implemented against data, because the demo has
 *     no "since last session" to derive from. The mechanism it would use is here
 *     and exercised by the controls: an ignition queue, one at a time, camera
 *     flying to each in turn, with the fly-to defeatable.
 *   - **§3, the emerging state.** Carried and rendered, marked as unconfirmed.
 *     See `model.ts`.
 *   - **§3, "planets orbiting it".** Drawn as a system, held still. The spec asks
 *     for orbiting skills and the first build gave them to it; watching somebody
 *     use it settled the question. A skill is the one thing in this view a reader
 *     is asked to click, and a click target that drifts away from the cursor —
 *     taking its label with it — turns reading your own record into a game of
 *     catch. The orbit rings stay, the positions are fixed, and the motion the
 *     spec wanted moved to the one place it costs nothing: the galaxy discs, which
 *     turn slowly and are never clicked anywhere but at their centre. See the top
 *     of `scene.ts`.
 *   - **§5, how loud.** Well under what the first build shipped. Measured on the
 *     way out, one ignition peaked past full scale and `Fill` reached three times
 *     it — clipping, on every event that mattered. Every sound is the same sound,
 *     mixed with headroom, softened at the attack, and ducked when events stack.
 *     See the top of `galaxy/audio.ts`.
 *
 * The demo controls are the point of this build. Mastery here is attached to
 * nothing: `Master` and `Unmaster` move one skill at a time, `Reset` empties the
 * career, `Fill` lights all of it. What is being demonstrated is the feel, and
 * the fastest way to judge the feel is to be able to drive it by hand.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GalaxyAudio, readStoredMute } from './galaxy/audio.ts'
import { GalaxyCanvas, type GalaxyHandle } from './galaxy/GalaxyCanvas'
import type { ViewState } from './galaxy/camera'
import { mockGalaxyMap } from './galaxy/mock.ts'
import {
  lastLit,
  nextUnlit,
  skillAt,
  tally,
  withAllSkills,
  withGradeState,
  withSkillState,
} from './galaxy/model.ts'
import { buildScene } from './galaxy/scene.ts'
import './galaxy/galaxy.css'

const EVIDENCE_AT = '2025-02-10'

export function GalaxyView() {
  // The map's *shape* never changes, only its states, so the scene is built once.
  // Rebuilding it per update would re-bake thirteen galaxy sprites on every
  // ignition, which is a stall exactly when the view is asking to be watched.
  const initialMap = useMemo(() => mockGalaxyMap(), [])
  const scene = useMemo(() => buildScene(initialMap), [initialMap])
  const [map, setMap] = useState(initialMap)

  const [view, setView] = useState<ViewState>(() => ({
    level: 'row',
    galaxy: initialMap.student.currentGrade,
    star: 0,
    planet: 0,
  }))
  const [entered, setEntered] = useState(false)
  const [muted, setMuted] = useState(readStoredMute)
  const [flyTo, setFlyTo] = useState(true)
  const [announcement, setAnnouncement] = useState('')
  const reducedMotion = usePrefersReducedMotion()

  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<GalaxyHandle>(null)
  const audioRef = useRef<GalaxyAudio | null>(null)
  if (!audioRef.current) audioRef.current = new GalaxyAudio()
  const audio = audioRef.current

  useEffect(() => () => audio.close(), [audio])

  /**
   * Fill the viewport below the app header, whatever height that header is.
   *
   * The header is sticky and sized by its own content, so it has no fixed height
   * to subtract — and it grows when the persona picker wraps on a narrow window.
   * A hard-coded offset was right on one viewport and cut the control bar off the
   * bottom on the next. Measuring where this element actually starts is the only
   * version that survives a change to the chrome above it.
   */
  useEffect(() => {
    const node = rootRef.current
    if (!node) return
    const measure = () => {
      const top = node.getBoundingClientRect().top + window.scrollY
      node.style.setProperty('--galaxy-top', `${Math.round(top)}px`)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const counts = tally(map)
  const grade = map.grades[view.galaxy]
  const subject = grade?.subjects[view.star]
  const focusedSkill =
    view.level === 'system'
      ? skillAt(map, { grade: view.galaxy, subject: view.star, skill: view.planet })
      : undefined

  /**
   * Light one body, having flown to it first.
   *
   * The delay is read from the camera rather than guessed, because the ignition
   * has to land when the body is on screen — a stadium light striking on
   * somewhere off-frame is just a noise. Scheduled inside a frame callback so the
   * camera tween the view change starts has actually been created by then.
   */
  const celebrateAfterFlight = useCallback(
    (address: { grade: number; subject: number; skill: number }, immediate: boolean) => {
      if (immediate) {
        canvasRef.current?.celebrate(address)
        return
      }
      requestAnimationFrame(() => {
        const delay = canvasRef.current?.timeToRest() ?? 0
        canvasRef.current?.celebrate(address, { delay: Math.max(0, delay - 0.06) })
      })
    },
    [],
  )

  const master = useCallback(() => {
    audio.unlock()
    const address = nextUnlit(map)
    if (!address) {
      setAnnouncement('Every skill on the map is lit.')
      return
    }
    setMap((previous) => withSkillState(previous, address, 'lit', EVIDENCE_AT))
    const skill = skillAt(map, address)
    setAnnouncement(`${skill?.name ?? 'A skill'} is lit.`)
    if (flyTo && !reducedMotion) {
      setView({ level: 'system', galaxy: address.grade, star: address.subject, planet: address.skill })
      celebrateAfterFlight(address, false)
    } else {
      celebrateAfterFlight(address, true)
    }
  }, [audio, celebrateAfterFlight, flyTo, map, reducedMotion])

  const unmaster = useCallback(() => {
    audio.unlock()
    const address = lastLit(map)
    if (!address) {
      setAnnouncement('The map is already empty.')
      return
    }
    setMap((previous) => withSkillState(previous, address, 'unlit', null))
    const skill = skillAt(map, address)
    setAnnouncement(`${skill?.name ?? 'A skill'} is unlit.`)
    if (flyTo && !reducedMotion) {
      setView({ level: 'system', galaxy: address.grade, star: address.subject, planet: address.skill })
    }
    audio.extinguish(0.85)
  }, [audio, flyTo, map, reducedMotion])

  const reset = useCallback(() => {
    audio.unlock()
    setMap((previous) => withAllSkills(previous, 'unlit', null))
    setView((previous) => ({ ...previous, level: 'row' }))
    audio.extinguish(1)
    window.setTimeout(() => audio.extinguish(0.55), 150)
    setAnnouncement('The map is empty. Every skill is unexplored.')
  }, [audio])

  /**
   * Fill, as a sweep rather than as an assignment.
   *
   * Setting every skill lit in one statement is one frame of work and no
   * experience at all. Lighting a grade at a time as the camera crosses it is the
   * entry sequence run forwards over an empty career, and it is the thing worth
   * showing a room: thirteen years arriving in order, each with its own impact,
   * pitched up as it goes.
   */
  const fill = useCallback(() => {
    audio.unlock()
    setView((previous) => ({ ...previous, level: 'row' }))
    const duration = 2.4
    audio.sweep(duration)
    requestAnimationFrame(() => {
      canvasRef.current?.sweep({
        from: 0,
        to: map.grades.length - 1,
        duration,
        onPass: (index) => {
          setMap((previous) => withGradeState(previous, index, 'lit', EVIDENCE_AT))
          canvasRef.current?.celebrateGrade(index, {
            power: 0.42,
            pitch: 0.78 + index * 0.055,
          })
        },
        onDone: () => {
          setView({
            level: 'row',
            galaxy: map.student.currentGrade,
            star: 0,
            planet: 0,
          })
          setAnnouncement('Every skill on the map is lit.')
        },
      })
    })
  }, [audio, map.grades.length, map.student.currentGrade])

  /**
   * The entry sequence, per §2: a fast pan from kindergarten to the current
   * grade, each completed grade striking on as the front reaches it, under a
   * rising tone, coming to rest with the current grade centred.
   *
   * The grades are already lit in the data — the sweep gates the *rendering* of
   * that light rather than mutating the map, so nothing the HUD counts is briefly
   * untrue in order to make the animation work.
   */
  const runEntry = useCallback(() => {
    const current = map.student.currentGrade
    const duration = 2
    audio.sweep(duration)
    requestAnimationFrame(() => {
      canvasRef.current?.sweep({
        from: 0,
        to: current,
        duration,
        gate: true,
        onPass: (index) => {
          canvasRef.current?.celebrateGrade(index, {
            power: 0.3,
            pitch: 0.8 + index * 0.07,
          })
        },
        onDone: () => {
          setView({ level: 'row', galaxy: current, star: 0, planet: 0 })
          canvasRef.current?.celebrateGrade(current, { power: 1, pitch: 0.92 })
          setAnnouncement(
            `${map.grades[current]?.label ?? 'Your grade'}. Arrow keys move between grades, Enter zooms in.`,
          )
        },
      })
    })
  }, [audio, map.grades, map.student.currentGrade])

  const enter = () => {
    audio.unlock()
    setEntered(true)
    // One frame, so the canvas is mounted and sized before the sweep is handed to it.
    requestAnimationFrame(() => requestAnimationFrame(runEntry))
  }

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    audio.setMuted(next)
    if (!next) audio.unlock()
  }

  const zoomOut = () => {
    audio.tick(0.9)
    setView((previous) =>
      previous.level === 'system'
        ? { ...previous, level: 'galaxy' }
        : { ...previous, level: 'row' },
    )
  }

  return (
    <div className="galaxy-view" ref={rootRef}>
      <GalaxyCanvas
        ref={canvasRef}
        scene={scene}
        map={map}
        view={view}
        onViewChange={setView}
        audio={audio}
        reducedMotion={reducedMotion}
        onAnnounce={setAnnouncement}
      />

      <div className="galaxy-hud">
        <div className="galaxy-hud-top">
          <div className="galaxy-titles">
            <span className="galaxy-eyebrow">Mastery map · demonstration</span>
            <h1>{map.student.displayName}</h1>
            <nav className="galaxy-crumbs" aria-label="Zoom level">
              <button
                type="button"
                className="galaxy-crumb"
                data-active={view.level === 'row'}
                onClick={() => setView((previous) => ({ ...previous, level: 'row' }))}
              >
                K–12
              </button>
              {view.level !== 'row' && grade ? (
                <>
                  <span aria-hidden>›</span>
                  <button
                    type="button"
                    className="galaxy-crumb"
                    data-active={view.level === 'galaxy'}
                    onClick={() => setView((previous) => ({ ...previous, level: 'galaxy' }))}
                  >
                    {grade.label}
                  </button>
                </>
              ) : null}
              {view.level === 'system' && subject ? (
                <>
                  <span aria-hidden>›</span>
                  <span className="galaxy-crumb" data-active="true">
                    {subject.name}
                  </span>
                </>
              ) : null}
            </nav>
          </div>

          <div className="galaxy-hud-actions">
            {view.level !== 'row' ? (
              <button type="button" className="galaxy-button" onClick={zoomOut}>
                ← Zoom out
              </button>
            ) : null}
            <button
              type="button"
              className="galaxy-button"
              onClick={toggleMute}
              aria-pressed={muted}
              title={muted ? 'Sound is off' : 'Sound is on'}
            >
              {muted ? 'Sound off' : 'Sound on'}
            </button>
          </div>
        </div>

        {focusedSkill ? (
          <div className="galaxy-detail">
            <div className="galaxy-detail-name">{focusedSkill.name}</div>
            <div className="galaxy-detail-meta">
              {focusedSkill.standardCode ? <span className="mono">{focusedSkill.standardCode}</span> : null}
              <span className="galaxy-state" data-state={focusedSkill.masteryState}>
                {focusedSkill.masteryState === 'lit'
                  ? 'Lit'
                  : focusedSkill.masteryState === 'emerging'
                    ? 'Emerging'
                    : 'Unexplored'}
              </span>
              {focusedSkill.evidenceCount > 0 ? (
                <span>
                  {focusedSkill.evidenceCount} piece{focusedSkill.evidenceCount === 1 ? '' : 's'} of
                  evidence
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="galaxy-hud-bottom">
          {/* Not a progress bar and not a score. It counts what is there — never
              what is missing — which is the spec's rule about punitive framing
              taken literally rather than approximately. */}
          <div className="galaxy-count">
            <strong>{counts.lit}</strong> of {counts.total} skills lit
            {counts.emerging > 0 ? <span className="galaxy-count-sub"> · {counts.emerging} emerging</span> : null}
          </div>

          <div className="galaxy-controls" role="group" aria-label="Demonstration controls">
            <button type="button" className="galaxy-button" onClick={unmaster}>
              Unmaster
            </button>
            <button type="button" className="galaxy-button galaxy-button-primary" onClick={master}>
              Master
            </button>
            <button type="button" className="galaxy-button" onClick={reset}>
              Reset
            </button>
            <button type="button" className="galaxy-button" onClick={fill}>
              Fill
            </button>
            <span className="galaxy-divider" aria-hidden />
            <button type="button" className="galaxy-button" onClick={runEntry}>
              Replay entry
            </button>
            <label className="galaxy-switch">
              <input
                type="checkbox"
                checked={flyTo}
                onChange={(event) => setFlyTo(event.target.checked)}
              />
              Fly to each ignition
            </label>
          </div>

          <p className="galaxy-hint">
            Drag to scroll the row. Arrow keys move, Enter zooms in, Escape zooms out.
            {reducedMotion ? ' Reduced motion is on: camera moves and particles are off.' : ''}
          </p>
        </div>
      </div>

      {/* The picture speaks in brightness, which reaches nobody who cannot see it.
          This says the same thing in words, on every move. */}
      <div className="galaxy-live" role="status" aria-live="polite">
        {announcement}
      </div>

      {!entered ? (
        <div className="galaxy-gate">
          <div className="galaxy-gate-panel">
            <span className="galaxy-eyebrow">Supernova</span>
            <h2>{map.student.displayName}’s mastery map</h2>
            <p>
              Thirteen galaxies, one for each grade. The stars inside them are subjects, and the
              planets are the skills. Everything you have shown evidence of is lit.
            </p>
            <button type="button" className="galaxy-button galaxy-button-primary galaxy-enter" onClick={enter}>
              Enter
            </button>
            <p className="galaxy-gate-note">
              {/* Stated rather than hidden. A browser will not play sound until the
                  page has been clicked, so the button is the reason the entry sweep
                  can have any. Saying so is better than a silent first run nobody
                  can explain. */}
              Starts with sound. You can mute it at any time.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(media.matches)
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])
  return reduced
}
