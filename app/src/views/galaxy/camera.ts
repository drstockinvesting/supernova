/**
 * Where the camera goes, and how fast.
 *
 * Three levels, and each one is a *derived* camera rather than a stored one: given
 * the level and what is focused, there is exactly one right frame, and it is
 * computed. Storing the camera and mutating it on every navigation is how a view
 * like this ends up half a screen off after the fourth zoom, with no way to say
 * what the correct position would have been.
 *
 * Pure, and therefore tested. The arithmetic that decides whether a student ever
 * sees their own current grade on load is not arithmetic to leave unchecked.
 */

import type { Scene } from './scene.ts'
import { smoothstep } from './scene.ts'
import {
  GALAXY_RADIUS,
  GALAXY_SPACING,
  PLANET_ORBIT_BASE,
  PLANET_ORBIT_STEP,
} from './scene.ts'

/**
 * Where the camera is: a world point and a scale.
 *
 * Declared here rather than in `render.ts` so this module — all of the view's
 * arithmetic — imports nothing that touches the DOM. The test project's `lib` is
 * ES2023 with no DOM at all, and a type imported across that line would drag a
 * canvas type into a file that has no business knowing about one.
 */
export interface Camera {
  x: number
  y: number
  zoom: number
}

export type ZoomLevel = 'row' | 'galaxy' | 'system'

/** What is being looked at. `star` and `planet` are ignored at shallower levels. */
export interface ViewState {
  level: ZoomLevel
  galaxy: number
  star: number
  planet: number
}

export interface Viewport {
  width: number
  height: number
}

/**
 * The row shows about three and a half galaxies across. Fewer and it is a
 * filmstrip; many more and each grade is a smudge with a number under it — the
 * first pass framed four and a half and the galaxies were too small to read as
 * places worth going into. Both terms are floored by the viewport's short side so
 * a laptop in a browser with three toolbars open still frames a whole galaxy.
 */
export function zoomFor(level: ZoomLevel, viewport: Viewport): number {
  const { width, height } = viewport
  switch (level) {
    case 'row':
      return Math.min(width / (GALAXY_SPACING * 3), height / (GALAXY_RADIUS * 2.6))
    case 'galaxy':
      return Math.min(width / (GALAXY_RADIUS * 2.6), height / (GALAXY_RADIUS * 2.3))
    case 'system': {
      // Framed on the outermost orbit a subject can have, not on the one it does
      // have: a subject with five skills and one with eight must be looked at
      // from the same distance, or the planets change size between subjects and
      // size stops meaning anything.
      const outer = PLANET_ORBIT_BASE + PLANET_ORBIT_STEP * 8
      return Math.min(width / (outer * 3.4), height / (outer * 2.3))
    }
  }
}

/**
 * Reveal bands, as a fraction of the level's own framing rather than as absolute
 * zoom values.
 *
 * They began as absolute numbers and were wrong, in a way worth recording: the
 * zoom that frames a galaxy depends on the viewport, so on a small window the
 * galaxy level sat *below* a fixed threshold and its subject stars never came
 * fully up. The view still rendered. It just quietly lost a level of its zoom on
 * exactly the laptops a school buys.
 *
 * Expressed as a ratio the question becomes the one actually being asked — "how
 * close is the camera to the distance this level is meant to be seen from?" — and
 * the answer no longer depends on how big the window is.
 */
export const SUBJECT_REVEAL: [number, number] = [0.5, 0.9]
export const PLANET_REVEAL: [number, number] = [0.45, 0.92]

/** How visible a level is at this zoom, from 0 to 1. */
export function revealFor(
  level: 'galaxy' | 'system',
  zoom: number,
  viewport: Viewport,
): number {
  const band = level === 'galaxy' ? SUBJECT_REVEAL : PLANET_REVEAL
  return smoothstep(band[0], band[1], zoom / zoomFor(level, viewport))
}

export function cameraFor(scene: Scene, view: ViewState, viewport: Viewport): Camera {
  const zoom = zoomFor(view.level, viewport)
  const galaxy = scene.galaxies[clampIndex(view.galaxy, scene.galaxies.length)]
  if (!galaxy) return { x: 0, y: 0, zoom }

  if (view.level === 'system') {
    const star = galaxy.stars[clampIndex(view.star, galaxy.stars.length)]
    if (star) return { x: star.x, y: star.y, zoom }
  }

  // The row is framed flat, at y of zero, rather than on each galaxy's own drift.
  // The drift then shows as galaxies sitting at different heights in the frame —
  // which is the point of it — and the entry sweep is a straight pan rather than
  // a line that bobs. Inside a galaxy the drift is centred out, because there the
  // galaxy is the frame.
  if (view.level === 'row') return { x: galaxy.x, y: 0, zoom }
  return { x: galaxy.x, y: galaxy.y, zoom }
}

function clampIndex(value: number, length: number): number {
  if (length === 0) return 0
  return Math.min(length - 1, Math.max(0, value))
}

/**
 * Interpolate between two cameras.
 *
 * Zoom is interpolated in log space and position is interpolated in *screen*
 * terms rather than world terms — the standard "smooth zoom" correction. A linear
 * world-space pan under a changing zoom swings the target wildly across the
 * screen on the way in and arrives from an odd direction; interpolating what the
 * eye actually sees keeps the thing being zoomed toward roughly still. On a
 * twenty-fold zoom, which is what row to system is, the difference is the whole
 * difference between a camera move and a lurch.
 */
export function tweenCamera(from: Camera, to: Camera, t: number): Camera {
  const k = Math.min(1, Math.max(0, t))
  const zoom = Math.exp(Math.log(from.zoom) + (Math.log(to.zoom) - Math.log(from.zoom)) * k)
  // Weight the positional interpolation by where the zoom actually is on its
  // logarithmic path, so the pan resolves as the zoom does.
  const ratio = Math.log(zoom / from.zoom) / Math.log(to.zoom / from.zoom || 1)
  const w = Number.isFinite(ratio) && to.zoom !== from.zoom ? ratio : k
  return {
    x: from.x + (to.x - from.x) * w,
    y: from.y + (to.y - from.y) * w,
    zoom,
  }
}

/** How long a move between two levels should take, in seconds. */
export function durationFor(from: ZoomLevel, to: ZoomLevel): number {
  if (from === to) return 0.5
  const rank: Record<ZoomLevel, number> = { row: 0, galaxy: 1, system: 2 }
  return Math.abs(rank[from] - rank[to]) === 2 ? 1.15 : 0.78
}

/**
 * Keep the row within the field. Enough slack at either end that kindergarten and
 * twelfth grade sit fully on screen rather than pinned against an edge.
 */
export function clampRowX(x: number, scene: Scene, viewport: Viewport): number {
  const zoom = zoomFor('row', viewport)
  const half = viewport.width / 2 / zoom
  const min = scene.minX + half - GALAXY_RADIUS * 1.6
  const max = scene.maxX - half + GALAXY_RADIUS * 1.6
  if (min > max) return (scene.minX + scene.maxX) / 2
  return Math.min(max, Math.max(min, x))
}

/** Which galaxy a world x is nearest. Used when a drag is released. */
export function nearestGalaxy(scene: Scene, worldX: number): number {
  let best = 0
  let bestDistance = Infinity
  scene.galaxies.forEach((galaxy, index) => {
    const distance = Math.abs(galaxy.x - worldX)
    if (distance < bestDistance) {
      bestDistance = distance
      best = index
    }
  })
  return best
}
