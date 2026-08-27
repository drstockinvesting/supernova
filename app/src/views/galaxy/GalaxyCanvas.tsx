/**
 * The canvas, and everything that touches it every frame.
 *
 * React owns the map, the view state, and the chrome. This component owns the
 * render loop, and the boundary between them is strict: nothing inside the
 * animation frame calls `setState`, and nothing outside it touches the camera.
 * A sixty-times-a-second React update would give up the frame rate the spec sets
 * as a non-negotiable, and would do it in a way that only shows on the hardware a
 * school actually buys.
 *
 * So the loop reads refs, and the refs are mirrored from props. The one thing
 * that crosses back the other way is navigation — a click or a key produces an
 * `onViewChange`, and the camera follows the new view rather than being moved
 * directly.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { GalaxyAudio } from './audio'
import type { GalaxyMap, SkillAddress } from './model'
import { skillAt } from './model.ts'
import type { Scene } from './scene'
import { findPlanet, planetPosition } from './scene.ts'
import type { Camera, ViewState, Viewport } from './camera.ts'
import { cameraFor, clampRowX, durationFor, nearestGalaxy, tweenCamera, zoomFor } from './camera.ts'
import type { Focus, Ignition, Palette, SpritePair } from './render.ts'
import { bakeSprites, buildDust, drawFrame, easeInOut, readPalette, toWorld } from './render.ts'

/** Resolution of the bloom buffer relative to the canvas. A quarter is plenty. */
const GLOW_SCALE = 0.4

export interface SweepOptions {
  from: number
  to: number
  duration: number
  /** Called once as the camera crosses each galaxy, in order. */
  onPass: (index: number) => void
  onDone?: () => void
  /** Hold every galaxy past the sweep front dark until it is crossed. */
  gate?: boolean
}

export interface GalaxyHandle {
  /** Fire the full treatment on one skill: flash, shockwave, sparks, impact. */
  celebrate: (address: SkillAddress, options?: { power?: number; pitch?: number; delay?: number }) => void
  /** Fire it on a whole grade at once, at the galaxy rather than at a planet. */
  celebrateGrade: (index: number, options?: { power?: number; pitch?: number }) => void
  /** Pan the row, lighting as it goes. The entry sequence and `Fill` are both this. */
  sweep: (options: SweepOptions) => void
  /** Seconds until the camera settles. Callers time their own sound against it. */
  timeToRest: () => number
}

interface Props {
  scene: Scene
  map: GalaxyMap
  view: ViewState
  onViewChange: (next: ViewState) => void
  audio: GalaxyAudio
  reducedMotion: boolean
  /** Announced to assistive technology whenever focus moves. */
  onAnnounce: (message: string) => void
}

interface Tween {
  from: Camera
  to: Camera
  start: number
  duration: number
}

interface PendingIgnition {
  x: number
  y: number
  power: number
  pitch: number
  fireAt: number
}

interface SweepRun extends SweepOptions {
  start: number
  next: number
  fromX: number
  toX: number
}

export const GalaxyCanvas = forwardRef<GalaxyHandle, Props>(function GalaxyCanvas(
  { scene, map, view, onViewChange, audio, reducedMotion, onAnnounce },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [viewport, setViewport] = useState<Viewport>({ width: 960, height: 560 })

  // --- Everything the loop reads ------------------------------------------
  const mapRef = useRef(map)
  const sceneRef = useRef(scene)
  const viewRef = useRef(view)
  const viewportRef = useRef(viewport)
  const reducedRef = useRef(reducedMotion)
  const cameraRef = useRef<Camera | null>(null)
  const tweenRef = useRef<Tween | null>(null)
  const ignitionsRef = useRef<Ignition[]>([])
  const pendingRef = useRef<PendingIgnition[]>([])
  const sweepRef = useRef<SweepRun | null>(null)
  const revealRef = useRef(Number.POSITIVE_INFINITY)
  const glowRef = useRef<HTMLCanvasElement | null>(null)
  const bloomRef = useRef<HTMLCanvasElement | null>(null)
  const paletteRef = useRef<Palette | null>(null)
  const spritesRef = useRef<Map<string, SpritePair>>(new Map())
  const startedAtRef = useRef(0)
  const dragRef = useRef<{ pointerId: number; startX: number; cameraX: number; moved: boolean } | null>(null)

  mapRef.current = map
  sceneRef.current = scene
  viewRef.current = view
  viewportRef.current = viewport
  reducedRef.current = reducedMotion

  const dust = useMemo(() => buildDust(), [])

  // --- Size ----------------------------------------------------------------
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const observer = new ResizeObserver(() => {
      const rect = host.getBoundingClientRect()
      setViewport({ width: Math.max(320, rect.width), height: Math.max(280, rect.height) })
    })
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  // --- Palette and sprites -------------------------------------------------
  useEffect(() => {
    const palette = readPalette(document.documentElement)
    paletteRef.current = palette
    spritesRef.current = bakeSprites(scene, palette)
  }, [scene])

  // --- The camera follows the view ----------------------------------------
  useEffect(() => {
    const target = cameraFor(scene, view, viewportRef.current)
    if (view.level === 'row') target.x = clampRowX(target.x, scene, viewportRef.current)

    const current = cameraRef.current
    if (!current) {
      cameraRef.current = target
      return
    }
    if (reducedRef.current) {
      // A reader who asked for less motion gets the destination, not the journey.
      // The illumination still happens; only the travel is cut.
      cameraRef.current = target
      tweenRef.current = null
      return
    }
    tweenRef.current = {
      from: current,
      to: target,
      start: performance.now() / 1000,
      duration: durationFor(levelOfZoom(current.zoom, viewportRef.current), view.level),
    }
  }, [scene, view, viewport])

  // --- The loop ------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current
    const host = hostRef.current
    if (!canvas || !host) return

    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    if (!glowRef.current) glowRef.current = document.createElement('canvas')
    if (!bloomRef.current) bloomRef.current = document.createElement('canvas')
    const glowCanvas = glowRef.current
    const bloomCanvas = bloomRef.current
    const glow = glowCanvas.getContext('2d')
    const bloom = bloomCanvas.getContext('2d')
    if (!glow || !bloom) return

    const supportsFilter = (() => {
      const probe = document.createElement('canvas').getContext('2d')
      if (!probe) return false
      probe.filter = 'blur(2px)'
      return probe.filter === 'blur(2px)'
    })()

    startedAtRef.current = performance.now() / 1000
    let raf = 0

    const render = () => {
      raf = requestAnimationFrame(render)
      const palette = paletteRef.current
      if (!palette) return

      const now = performance.now() / 1000
      const time = now - startedAtRef.current
      const { width, height } = viewportRef.current
      const dpr = Math.min(2, window.devicePixelRatio || 1)

      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr)
        canvas.height = Math.round(height * dpr)
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`
        glowCanvas.width = Math.max(1, Math.round(width * GLOW_SCALE))
        glowCanvas.height = Math.max(1, Math.round(height * GLOW_SCALE))
        bloomCanvas.width = glowCanvas.width
        bloomCanvas.height = glowCanvas.height
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Camera: a sweep overrides the tween, and the tween overrides rest.
      const sweep = sweepRef.current
      if (sweep) {
        const t = Math.min(1, (now - sweep.start) / sweep.duration)
        const eased = easeInOut(t)
        const x = sweep.fromX + (sweep.toX - sweep.fromX) * eased
        const camera = cameraRef.current
        if (camera) camera.x = x
        // Fire each galaxy's illumination as the front reaches it, rather than on
        // a timer: the light and the position it happens at cannot drift apart.
        const front = x / (sceneRef.current.galaxies[1]?.x || 1)
        if (sweep.gate) revealRef.current = front
        const direction = sweep.to >= sweep.from ? 1 : -1
        while (
          sweep.next !== sweep.to + direction &&
          (direction > 0 ? sweep.next <= front + 0.35 : sweep.next >= front - 0.35)
        ) {
          sweep.onPass(sweep.next)
          sweep.next += direction
        }
        if (t >= 1) {
          while (sweep.next !== sweep.to + direction) {
            sweep.onPass(sweep.next)
            sweep.next += direction
          }
          revealRef.current = Number.POSITIVE_INFINITY
          sweepRef.current = null
          sweep.onDone?.()
        }
      } else {
        const tween = tweenRef.current
        if (tween) {
          const t = Math.min(1, (now - tween.start) / tween.duration)
          cameraRef.current = tweenCamera(tween.from, tween.to, easeInOut(t))
          if (t >= 1) tweenRef.current = null
        }
      }

      const camera = cameraRef.current
      if (!camera) return

      // Pending ignitions, held until the camera has arrived somewhere worth
      // watching them from.
      if (pendingRef.current.length > 0) {
        const still: PendingIgnition[] = []
        for (const item of pendingRef.current) {
          if (now >= item.fireAt) fire(item.x, item.y, item.power, item.pitch, time)
          else still.push(item)
        }
        pendingRef.current = still
      }

      ignitionsRef.current = ignitionsRef.current.filter(
        (ignition) => time - ignition.start < ignition.duration,
      )

      drawFrame({
        ctx,
        glow,
        bloom,
        width,
        height,
        glowScale: GLOW_SCALE,
        camera,
        scene: sceneRef.current,
        map: mapRef.current,
        palette,
        sprites: spritesRef.current,
        dust,
        orbitTime: reducedRef.current ? 0 : time,
        time,
        focus: focusOf(viewRef.current),
        ignitions: ignitionsRef.current,
        reducedMotion: reducedRef.current,
        sweeping: sweepRef.current !== null,
        currentGrade: mapRef.current.student.currentGrade,
        revealThrough: revealRef.current,
        supportsFilter,
      })
    }

    const fire = (x: number, y: number, power: number, pitch: number, time: number) => {
      const sparks = reducedRef.current
        ? []
        : Array.from({ length: 22 }, () => ({
            angle: Math.random() * Math.PI * 2,
            speed: 0.35 + Math.random() * 0.9,
            size: 1 + Math.random() * 2.4,
          }))
      ignitionsRef.current.push({ x, y, start: time, duration: 0.95, power, sparks })
      audio.ignite({ power, pitch })
    }

    raf = requestAnimationFrame(render)
    return () => cancelAnimationFrame(raf)
  }, [audio, dust])

  // --- Imperative surface --------------------------------------------------
  const worldOf = useCallback(
    (address: SkillAddress) => {
      const planet = findPlanet(sceneRef.current, address)
      if (!planet) return null
      const now = performance.now() / 1000 - startedAtRef.current
      return planetPosition(planet, reducedRef.current ? 0 : now)
    },
    [],
  )

  const timeToRest = useCallback(() => {
    const tween = tweenRef.current
    if (!tween) return 0
    return Math.max(0, tween.start + tween.duration - performance.now() / 1000)
  }, [])

  useImperativeHandle(
    ref,
    (): GalaxyHandle => ({
      celebrate: (address, options = {}) => {
        const position = worldOf(address)
        if (!position) return
        pendingRef.current.push({
          x: position.x,
          y: position.y,
          power: options.power ?? 1,
          pitch: options.pitch ?? 1,
          fireAt: performance.now() / 1000 + (options.delay ?? 0),
        })
      },
      celebrateGrade: (index, options = {}) => {
        const galaxy = sceneRef.current.galaxies[index]
        if (!galaxy) return
        pendingRef.current.push({
          x: galaxy.x,
          y: galaxy.y,
          power: options.power ?? 0.85,
          pitch: options.pitch ?? 1,
          fireAt: performance.now() / 1000,
        })
      },
      sweep: (options) => {
        const galaxies = sceneRef.current.galaxies
        const fromGalaxy = galaxies[Math.max(0, Math.min(galaxies.length - 1, options.from))]
        const toGalaxy = galaxies[Math.max(0, Math.min(galaxies.length - 1, options.to))]
        if (!fromGalaxy || !toGalaxy) return
        const port = viewportRef.current
        const zoom = cameraFor(sceneRef.current, { ...viewRef.current, level: 'row' }, port).zoom
        cameraRef.current = { x: fromGalaxy.x, y: 0, zoom }
        tweenRef.current = null
        if (options.gate) revealRef.current = -1

        if (reducedRef.current) {
          // No camera move. Every grade still lights, in order, on a short timer —
          // the illumination is the content and it is kept.
          revealRef.current = Number.POSITIVE_INFINITY
          const direction = options.to >= options.from ? 1 : -1
          let index = options.from
          const step = () => {
            options.onPass(index)
            if (index === options.to) {
              options.onDone?.()
              return
            }
            index += direction
            window.setTimeout(step, 90)
          }
          step()
          cameraRef.current = cameraFor(sceneRef.current, viewRef.current, port)
          return
        }

        sweepRef.current = {
          ...options,
          start: performance.now() / 1000,
          fromX: clampRowX(fromGalaxy.x, sceneRef.current, port),
          toX: clampRowX(toGalaxy.x, sceneRef.current, port),
          next: options.from,
        }
      },
      timeToRest,
    }),
    [timeToRest, worldOf],
  )

  // --- Pointer -------------------------------------------------------------
  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    audio.unlock()
    canvasRef.current?.focus()
    if (viewRef.current.level !== 'row') return
    const camera = cameraRef.current
    if (!camera) return
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      cameraX: camera.x,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    const camera = cameraRef.current
    if (!drag || !camera || drag.pointerId !== event.pointerId) return
    const delta = (event.clientX - drag.startX) / camera.zoom
    if (Math.abs(event.clientX - drag.startX) > 4) drag.moved = true
    tweenRef.current = null
    camera.x = clampRowX(drag.cameraX - delta, sceneRef.current, viewportRef.current)
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    dragRef.current = null
    const camera = cameraRef.current
    if (!camera) return

    if (drag?.moved) {
      // Released mid-row: snap focus to whatever is nearest, so the keyboard and
      // the HUD agree with what the eye is looking at.
      const index = nearestGalaxy(sceneRef.current, camera.x)
      if (index !== viewRef.current.galaxy) {
        onViewChange({ ...viewRef.current, galaxy: index, star: 0, planet: 0 })
        announce(mapRef.current, { ...viewRef.current, galaxy: index }, onAnnounce)
      }
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    const point = toWorld(
      camera,
      viewportRef.current.width,
      viewportRef.current.height,
      event.clientX - rect.left,
      event.clientY - rect.top,
    )
    const next = pick(sceneRef.current, viewRef.current, point, reducedRef.current ? 0 : performance.now() / 1000 - startedAtRef.current)
    if (next) {
      audio.tick(next.level === 'system' ? 1.3 : next.level === 'galaxy' ? 1.1 : 0.9)
      onViewChange(next)
      announce(mapRef.current, next, onAnnounce)
    }
  }

  // --- Keyboard ------------------------------------------------------------
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    const current = viewRef.current
    const galaxies = sceneRef.current.galaxies
    const galaxy = galaxies[current.galaxy]
    let next: ViewState | null = null

    const step = (delta: number) => {
      if (current.level === 'row') {
        return { ...current, galaxy: wrap(current.galaxy + delta, galaxies.length), star: 0, planet: 0 }
      }
      if (current.level === 'galaxy') {
        return { ...current, star: wrap(current.star + delta, galaxy?.stars.length ?? 1), planet: 0 }
      }
      const planets = galaxy?.stars[current.star]?.planets.length ?? 1
      return { ...current, planet: wrap(current.planet + delta, planets) }
    }

    switch (event.key) {
      case 'ArrowRight':
        next = step(1)
        break
      case 'ArrowLeft':
        next = step(-1)
        break
      case 'ArrowDown':
      case 'Enter':
      case ' ':
        if (current.level === 'row') next = { ...current, level: 'galaxy', star: 0, planet: 0 }
        else if (current.level === 'galaxy') next = { ...current, level: 'system', planet: 0 }
        break
      case 'ArrowUp':
      case 'Escape':
        if (current.level === 'system') next = { ...current, level: 'galaxy' }
        else if (current.level === 'galaxy') next = { ...current, level: 'row' }
        break
      case 'Home':
        next = { ...current, level: 'row', galaxy: 0, star: 0, planet: 0 }
        break
      case 'End':
        next = { ...current, level: 'row', galaxy: galaxies.length - 1, star: 0, planet: 0 }
        break
      default:
        return
    }

    if (!next) return
    event.preventDefault()
    audio.unlock()
    audio.tick(next.level === 'system' ? 1.3 : next.level === 'galaxy' ? 1.1 : 0.9)
    onViewChange(next)
    announce(mapRef.current, next, onAnnounce)
  }

  return (
    <div className="galaxy-canvas-host" ref={hostRef}>
      <canvas
        ref={canvasRef}
        className="galaxy-canvas"
        tabIndex={0}
        role="application"
        aria-label="Mastery map. Arrow keys move between grades, Enter zooms in, Escape zooms out."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
      />
    </div>
  )
})

// --- Helpers ------------------------------------------------------------------

function wrap(value: number, length: number): number {
  if (length <= 0) return 0
  return ((value % length) + length) % length
}

function focusOf(view: ViewState): Focus {
  return {
    galaxy: view.galaxy,
    star: view.level === 'row' ? null : view.star,
    planet: view.level === 'system' ? view.planet : null,
  }
}

/**
 * Which level a zoom corresponds to. Only used to pick a tween duration — a jump
 * from the row to a star system should take longer than a step between adjacent
 * levels, and the camera is the only thing that knows where it currently is.
 */
function levelOfZoom(zoom: number, viewport: Viewport): 'row' | 'galaxy' | 'system' {
  const galaxyZoom = zoomFor('galaxy', viewport)
  const systemZoom = zoomFor('system', viewport)
  if (zoom >= (galaxyZoom + systemZoom) / 2) return 'system'
  if (zoom >= galaxyZoom * 0.6) return 'galaxy'
  return 'row'
}

/** What a click at this world point selects, or null if it selects nothing. */
function pick(scene: Scene, view: ViewState, point: { x: number; y: number }, time: number): ViewState | null {
  if (view.level === 'system') {
    const star = scene.galaxies[view.galaxy]?.stars[view.star]
    if (!star) return null
    let best: number | null = null
    let bestDistance = Infinity
    star.planets.forEach((planet, index) => {
      const position = planetPosition(planet, time)
      const distance = Math.hypot(position.x - point.x, position.y - point.y)
      if (distance < bestDistance && distance < planet.radius * 4) {
        bestDistance = distance
        best = index
      }
    })
    if (best !== null) return { ...view, planet: best }
    // A click on empty sky at the deepest level steps back out, which is the
    // gesture every map application has trained people to expect.
    return { ...view, level: 'galaxy' }
  }

  if (view.level === 'galaxy') {
    const galaxy = scene.galaxies[view.galaxy]
    if (!galaxy) return null
    let best: number | null = null
    let bestDistance = Infinity
    galaxy.stars.forEach((star, index) => {
      const distance = Math.hypot(star.x - point.x, star.y - point.y)
      if (distance < bestDistance && distance < star.radius * 5) {
        bestDistance = distance
        best = index
      }
    })
    if (best !== null) return { ...view, level: 'system', star: best, planet: 0 }
    if (Math.hypot(galaxy.x - point.x, galaxy.y - point.y) > galaxy.radius) {
      return { ...view, level: 'row' }
    }
    return null
  }

  let best: number | null = null
  let bestDistance = Infinity
  scene.galaxies.forEach((galaxy, index) => {
    const distance = Math.hypot(galaxy.x - point.x, (galaxy.y - point.y) * 1.5)
    if (distance < bestDistance && distance < galaxy.radius) {
      bestDistance = distance
      best = index
    }
  })
  if (best === null) return null
  return { level: 'galaxy', galaxy: best, star: 0, planet: 0 }
}

/**
 * What the screen reader hears.
 *
 * Always says the state in words. The whole view encodes mastery as brightness,
 * which is the one encoding that reaches nobody who cannot see it — so the text
 * is not a summary of the picture, it is the picture, said.
 */
function announce(map: GalaxyMap, view: ViewState, emit: (message: string) => void): void {
  const grade = map.grades[view.galaxy]
  if (!grade) return
  if (view.level === 'row') {
    const total = grade.subjects.reduce((sum, subject) => sum + subject.skills.length, 0)
    const lit = grade.subjects.reduce(
      (sum, subject) => sum + subject.skills.filter((skill) => skill.masteryState === 'lit').length,
      0,
    )
    emit(`${grade.label}. ${lit} of ${total} skills lit.`)
    return
  }
  const subject = grade.subjects[view.star]
  if (!subject) return
  if (view.level === 'galaxy') {
    const lit = subject.skills.filter((skill) => skill.masteryState === 'lit').length
    emit(`${grade.label}, ${subject.name}. ${lit} of ${subject.skills.length} skills lit.`)
    return
  }
  const address = { grade: view.galaxy, subject: view.star, skill: view.planet }
  const skill = skillAt(map, address)
  if (!skill) return
  const state =
    skill.masteryState === 'lit' ? 'lit' : skill.masteryState === 'emerging' ? 'emerging' : 'unexplored'
  emit(`${skill.name}. ${state}. ${grade.label}, ${subject.name}.`)
}
