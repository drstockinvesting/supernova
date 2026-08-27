/**
 * The picture.
 *
 * Canvas 2D, and deliberately not PixiJS. The spec recommends Pixi with an
 * advanced-bloom filter on the grounds that "CSS glow will not sell it", which is
 * true — but the third option it does not consider is the one this app is already
 * built for. Supernova ships React, React Router, and nothing else; adding a
 * WebGL renderer and its filter package to draw at most a few hundred bodies
 * would be the largest dependency in the project, and the spec's own section 6
 * says to defer to what the LMS already uses. So the bloom is real and hand-rolled:
 * emissive bodies are drawn a second time into a quarter-resolution buffer, and
 * that buffer is blurred and composited back additively. Two passes at two radii,
 * which is what `UnrealBloomPass` is doing conceptually, at a body count where the
 * difference does not show.
 *
 * If parallax between galaxy layers is wanted later, that is the point at which
 * three.js earns its weight. It does not earn it for this.
 *
 * Nothing in this file reads mastery data except through `model.ts`'s brightness
 * functions, and nothing in it knows where a body sits except through `scene.ts`.
 * It draws what it is given.
 */

import type { GalaxyMap } from './model'
import { STATE_BRIGHTNESS, gradeBrightness, subjectBrightness } from './model.ts'
import type { Camera } from './camera.ts'
import { revealFor } from './camera.ts'
import type { Scene, SceneGalaxy } from './scene.ts'
import { ORBIT_TILT, smoothstep } from './scene.ts'
import { seededRandom } from './mock.ts'

/** What the keyboard and the mouse are pointed at. Null fields mean "not that deep". */
export interface Focus {
  galaxy: number | null
  star: number | null
  planet: number | null
}

/** One light striking on, from the moment it fires until its tail is gone. */
export interface Ignition {
  x: number
  y: number
  /** Seconds, on the same clock as `time`. */
  start: number
  duration: number
  power: number
  sparks: { angle: number; speed: number; size: number }[]
}

/**
 * The palette, read from the design system rather than restated here.
 *
 * `/design` exists so a token drift breaks something visible; a canvas with hex
 * literals in it is exactly the place a drift would hide. The constellation
 * surface is dark in both themes by deliberate decision in `theme.css`, so these
 * values are stable across the theme toggle and can be read once.
 */
export interface Palette {
  sky: string
  lit: RGB
  ember: RGB
  unlit: RGB
  text: string
  textMuted: string
  outline: string
}

export type RGB = [number, number, number]

export function readPalette(root: HTMLElement): Palette {
  const style = getComputedStyle(root)
  const token = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback
  return {
    sky: token('--surface-deep', '#06080d'),
    lit: hexToRgb(token('--lit-substantial', '#ffe9a8')),
    ember: hexToRgb(token('--lit-moderate', '#d8c68a')),
    unlit: hexToRgb(token('--unlit', '#2b3140')),
    text: 'rgba(233, 237, 246, 0.92)',
    textMuted: 'rgba(233, 237, 246, 0.6)',
    outline: 'rgba(233, 237, 246, 0.22)',
  }
}

export function hexToRgb(hex: string): RGB {
  const value = hex.replace('#', '')
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value
  const int = Number.parseInt(full.slice(0, 6), 16)
  if (Number.isNaN(int)) return [255, 233, 168]
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
}

function rgba(color: RGB, alpha: number): string {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`
}

function mix(a: RGB, b: RGB, t: number): RGB {
  const k = Math.min(1, Math.max(0, t))
  return [
    Math.round(a[0] + (b[0] - a[0]) * k),
    Math.round(a[1] + (b[1] - a[1]) * k),
    Math.round(a[2] + (b[2] - a[2]) * k),
  ]
}

// --- Galaxy sprites -----------------------------------------------------------

/**
 * The type stack, spelled out.
 *
 * A canvas `font` is not CSS: `var(--font-sans)` does not resolve, and an invalid
 * font declaration is not an error — the canvas keeps its previous value, which
 * is 10px sans-serif. The first pass of this file used the design token and every
 * label on the row came out at ten pixels. There is no way to read a custom
 * property into a canvas font; naming the stack here is the only option, so it is
 * named once.
 */
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif"

const SPRITE_SIZE = 320

/**
 * How fast a galaxy disc turns, in radians per second.
 *
 * A full revolution takes about six minutes, which is slow enough that nobody
 * watches it happen and fast enough that the sky is not a photograph. This is the
 * only continuous motion left in the scene, and it is allowed precisely because a
 * galaxy's dust is scenery: the disc turns about its own centre, so the thing a
 * reader clicks — the galaxy, at that centre, within that radius — does not move
 * a pixel while it does. Held at zero for reduced motion.
 */
const GALAXY_SPIN = 0.017

/**
 * How far a galaxy disc is flattened, as the sprite is placed. The viewing angle
 * of the whole row, and the reason a galaxy reads as a disc lying in space rather
 * than as a circle painted on the sky.
 */
const DISC_TILT = 0.62

/**
 * A galaxy, baked once.
 *
 * Two sprites per grade over the same dust: one cold, one gold. Brightness
 * cross-fades between them, so a grade filling up is the same galaxy warming
 * rather than a different galaxy appearing — which is the difference between
 * "your work lit this" and "this got swapped out". Baked because eight hundred
 * dust points times thirteen galaxies times sixty frames is fifty thousand
 * `arc` calls a second for a picture that never changes.
 */
export function bakeGalaxySprite(galaxy: SceneGalaxy, color: RGB): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = SPRITE_SIZE
  canvas.height = SPRITE_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const random = seededRandom(galaxy.seed)
  const centre = SPRITE_SIZE / 2
  const arms = 2 + Math.floor(random() * 2)
  const points = 900

  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < points; i += 1) {
    const arm = i % arms
    // Distance from the core, biased outward so the arms have body rather than a
    // ring of dust at a fixed radius.
    const t = Math.sqrt(random())
    const spread = 0.24 + t * 0.5
    const angle =
      galaxy.rotation +
      (arm / arms) * Math.PI * 2 +
      t * 4.4 +
      (random() - 0.5) * spread
    const radius = t * centre * 0.92
    // Baked as a round disc, flattened to its viewing angle when drawn. Baking the
    // squash in would mean rotating an ellipse in screen space, which reads as a
    // disc wobbling rather than one turning.
    const x = centre + Math.cos(angle) * radius
    const y = centre + Math.sin(angle) * radius
    const size = 0.5 + random() * 1.5
    const alpha = (1 - t * 0.72) * (0.16 + random() * 0.34)
    ctx.fillStyle = rgba(color, alpha)
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()
  }

  // The bulge. Round here, like the arms, and flattened with them at draw time —
  // which is why it is wider than the 0.42 it was when only the arms were squashed.
  const bulge = ctx.createRadialGradient(centre, centre, 0, centre, centre, centre * 0.5)
  bulge.addColorStop(0, rgba(color, 0.5))
  bulge.addColorStop(0.45, rgba(color, 0.14))
  bulge.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = bulge
  ctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE)

  return canvas
}

export interface SpritePair {
  cold: HTMLCanvasElement
  hot: HTMLCanvasElement
}

export function bakeSprites(scene: Scene, palette: Palette): Map<string, SpritePair> {
  const sprites = new Map<string, SpritePair>()
  for (const galaxy of scene.galaxies) {
    sprites.set(galaxy.id, {
      cold: bakeGalaxySprite(galaxy, mix(palette.unlit, [150, 168, 210], 0.55)),
      hot: bakeGalaxySprite(galaxy, palette.lit),
    })
  }
  return sprites
}

// --- Background dust ----------------------------------------------------------

export interface DustMote {
  x: number
  y: number
  size: number
  alpha: number
}

/** A screen-space tile of faint stars, scrolled at a fraction of camera speed. */
export function buildDust(count = 260, seed = 4242): DustMote[] {
  const random = seededRandom(seed)
  const motes: DustMote[] = []
  for (let i = 0; i < count; i += 1) {
    motes.push({
      x: random(),
      y: random(),
      size: 0.4 + random() * 1.1,
      alpha: 0.1 + random() * 0.45,
    })
  }
  return motes
}

// --- The frame ----------------------------------------------------------------

export interface Frame {
  ctx: CanvasRenderingContext2D
  /** The emissive buffer: everything that glows is drawn here a second time. */
  glow: CanvasRenderingContext2D
  /** Where the emissive buffer is blurred, at the same reduced size. */
  bloom: CanvasRenderingContext2D
  width: number
  height: number
  glowScale: number
  camera: Camera
  scene: Scene
  map: GalaxyMap
  palette: Palette
  sprites: Map<string, SpritePair>
  dust: DustMote[]
  /** Seconds since the view opened, always advancing. Drives effect envelopes. */
  time: number
  focus: Focus
  ignitions: Ignition[]
  reducedMotion: boolean
  /** True while the entry sweep is running — labels are suppressed so it reads as motion. */
  sweeping: boolean
  /** Marked on the row, because "where am I now" is the first thing a student asks. */
  currentGrade: number
  /**
   * How far along the row illumination has been *allowed*, as a float index.
   *
   * The entry sweep needs grades to light in sequence even though every one of
   * them is already lit in the data. Gating brightness here rather than mutating
   * the map keeps the sweep a property of the view: the data is never briefly
   * wrong in order to make an animation work, which matters because the same map
   * object is what the HUD counts. `Infinity` outside the sweep.
   */
  revealThrough: number
  supportsFilter: boolean
}

export function drawFrame(frame: Frame): void {
  const { ctx, glow, width, height, camera, palette } = frame

  // The caller owns the transform: it installs a device-pixel-ratio scale so
  // everything here can be written in CSS pixels. Resetting it to identity — which
  // this did at first — draws the whole scene at half size on a retina display and
  // looks correct on every machine without one.
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  ctx.fillStyle = palette.sky
  ctx.fillRect(0, 0, width, height)

  glow.setTransform(1, 0, 0, 1, 0, 0)
  glow.globalCompositeOperation = 'source-over'
  glow.globalAlpha = 1
  glow.clearRect(0, 0, width * frame.glowScale, height * frame.glowScale)
  glow.globalCompositeOperation = 'lighter'

  drawSkyWash(frame)
  drawDust(frame)

  const viewport = { width, height }
  const subjectReveal = revealFor('galaxy', camera.zoom, viewport)
  const planetReveal = revealFor('system', camera.zoom, viewport)

  // Bodies first, then every label on top of every body, so a label is never
  // half-covered by the next galaxy's halo. The spec's "labels legible in the
  // unlit state" is a hard requirement, not a preference.
  const labels: (() => void)[] = []

  for (const galaxy of frame.scene.galaxies) {
    const screen = toScreen(frame, galaxy.x, galaxy.y)
    const radiusPx = galaxy.radius * camera.zoom
    if (screen.x + radiusPx * 1.8 < 0 || screen.x - radiusPx * 1.8 > width) continue

    const grade = frame.map.grades[galaxy.index]
    const gate = Math.min(1, Math.max(0, (frame.revealThrough - galaxy.index + 0.45) / 0.55))
    const brightness = (grade ? gradeBrightness(grade) : 0) * gate
    drawGalaxy(frame, galaxy, brightness, subjectReveal, planetReveal)

    if (!frame.sweeping) {
      labels.push(() => drawGalaxyLabel(frame, galaxy, brightness, subjectReveal, planetReveal))
    }

    if (subjectReveal <= 0.01) continue

    galaxy.stars.forEach((star, subjectIndex) => {
      const subject = grade?.subjects[subjectIndex]
      if (!subject) return
      const starBrightness = subjectBrightness(subject)
      const focused =
        frame.focus.galaxy === galaxy.index && frame.focus.star === subjectIndex
      drawStar(frame, star.x, star.y, star.radius, starBrightness, subjectReveal, focused)

      if (!frame.sweeping && subjectReveal > 0.45) {
        labels.push(() =>
          drawBodyLabel(
            frame,
            star.x,
            star.y - star.radius * 5,
            subject.name,
            subjectReveal * (focused ? 1 : 0.82) * (1 - planetReveal),
            focused ? 15 : 13,
          ),
        )
      }

      // Only the star being looked at draws its planets. A galaxy's other five
      // subjects are still on screen at this depth, and drawing their skills too
      // fills the edges of the frame with bodies belonging to a system the reader
      // is not in — which is both clutter and a click target for the wrong thing.
      if (planetReveal <= 0.01 || !focused) return

      for (const planet of star.planets) {
        const skill = subject.skills[planet.address.skill]
        if (!skill) continue
        const planetFocused =
          focused && frame.focus.planet === planet.address.skill
        drawOrbit(frame, planet.starX, planet.starY, planet.orbit, planetReveal)
        drawPlanet(
          frame,
          planet.x,
          planet.y,
          planet.radius,
          STATE_BRIGHTNESS[skill.masteryState],
          planetReveal,
          planetFocused,
        )
        if (planetFocused || planetReveal > 0.85) {
          // Fanned outward along the planet's own radius rather than stacked
          // straight up: straight up puts every label in a system into one column
          // the moment two planets share a vertical, which at eight planets is
          // always. Vertically it clears its own body — above when the planet sits
          // above its star, below when it sits below — so the name is never
          // written across the thing it names. That mattered less when planets
          // drifted and an overlap lasted a second; on a body that stays put, an
          // overlap stays put with it.
          const dx = planet.x - planet.starX
          const dy = planet.y - planet.starY
          const length = Math.hypot(dx, dy) || 1
          const size = planetFocused ? 14 : 12
          const push = planet.radius * (planetFocused ? 5 : 3.2)
          const clear = planet.radius * 1.9
          // The type is drawn at a fixed pixel size, so its height in world units
          // is that size divided by the zoom it will be seen at.
          const line = size / camera.zoom
          labels.push(() =>
            drawBodyLabel(
              frame,
              planet.x + (dx / length) * push,
              dy > 0 ? planet.y + clear + line : planet.y - clear,
              skill.name,
              planetReveal * (planetFocused ? 1 : 0.72),
              size,
            ),
          )
        }
      }
    })
  }

  drawIgnitions(frame)
  compositeBloom(frame)

  // Labels are painted after the bloom composite, on purpose: bloom is light
  // leaking off bright bodies, and text that bloomed would be text nobody could
  // read — which is the one thing this view is not allowed to trade away.
  for (const label of labels) label()

  drawScreenFlash(frame)
}

function toScreen(frame: Frame, x: number, y: number): { x: number; y: number } {
  return {
    x: (x - frame.camera.x) * frame.camera.zoom + frame.width / 2,
    y: (y - frame.camera.y) * frame.camera.zoom + frame.height / 2,
  }
}

/** Screen back to world. Used for hit-testing a click. */
export function toWorld(
  camera: Camera,
  width: number,
  height: number,
  x: number,
  y: number,
): { x: number; y: number } {
  return {
    x: (x - width / 2) / camera.zoom + camera.x,
    y: (y - height / 2) / camera.zoom + camera.y,
  }
}

function drawSkyWash(frame: Frame): void {
  const { ctx, width, height } = frame
  const gradient = ctx.createRadialGradient(
    width * 0.5,
    height * 0.42,
    0,
    width * 0.5,
    height * 0.42,
    Math.max(width, height) * 0.78,
  )
  gradient.addColorStop(0, 'rgba(96, 116, 190, 0.13)')
  gradient.addColorStop(1, 'rgba(6, 8, 13, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
}

function drawDust(frame: Frame): void {
  const { ctx, width, height, camera } = frame
  // Parallax: the far field moves at a third of camera speed, which is what makes
  // the entry sweep read as travel rather than as a scrolling image.
  const offsetX = ((-camera.x * camera.zoom * 0.3) % width + width) % width
  const offsetY = ((-camera.y * camera.zoom * 0.3) % height + height) % height

  ctx.fillStyle = 'rgba(233, 237, 246, 1)'
  for (const mote of frame.dust) {
    for (const tileX of [-1, 0]) {
      for (const tileY of [-1, 0]) {
        const x = mote.x * width + offsetX + tileX * width
        const y = mote.y * height + offsetY + tileY * height
        if (x < -2 || x > width + 2 || y < -2 || y > height + 2) continue
        ctx.globalAlpha = mote.alpha * 0.55
        ctx.fillRect(x, y, mote.size, mote.size)
      }
    }
  }
  ctx.globalAlpha = 1
}

function drawGalaxy(
  frame: Frame,
  galaxy: SceneGalaxy,
  brightness: number,
  subjectReveal: number,
  planetReveal: number,
): void {
  const { ctx, glow, camera, palette } = frame
  const screen = toScreen(frame, galaxy.x, galaxy.y)
  const size = galaxy.radius * 2 * camera.zoom
  const sprite = frame.sprites.get(galaxy.id)
  if (!sprite) return

  // The disc dims as the camera descends into it, so subject stars are read
  // against sky rather than against their own galaxy's dust — and it is gone
  // altogether by the star system, where a sprite baked at 320 pixels is being
  // stretched over three thousand and its dust motes have become squares.
  const discAlpha = (1 - subjectReveal * 0.7) * (1 - planetReveal)

  // A disc drawn at two per cent opacity costs a full-size composite of a scaled
  // sprite and shows nothing. Both sprites are skipped once they stop mattering,
  // which is most of the time the camera spends inside a galaxy.
  if (discAlpha > 0.02) {
    // Rotate, then flatten, then place: the disc turns in its own plane and is
    // seen at an angle, rather than an ellipse being spun around on the screen.
    // Two galaxies never turn at quite the same rate, so the row does not pulse
    // in unison — but they all turn the same way, because their arms all trail
    // the same way and one running backwards would read as a mistake.
    const spin = frame.reducedMotion
      ? 0
      : frame.time * GALAXY_SPIN * (0.72 + ((galaxy.index * 37) % 11) / 22)
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.translate(screen.x, screen.y)
    ctx.scale(1, DISC_TILT)
    ctx.rotate(spin)
    ctx.globalAlpha = discAlpha * (0.85 - brightness * 0.35)
    ctx.drawImage(sprite.cold, -size / 2, -size / 2, size, size)
    if (brightness > 0.02) {
      ctx.globalAlpha = discAlpha * brightness
      ctx.drawImage(sprite.hot, -size / 2, -size / 2, size, size)
    }
    ctx.restore()
  }

  // The outline. Present at every brightness, and the whole of what an unexplored
  // grade looks like: a place drawn with nothing in it yet, never an absence.
  ctx.save()
  ctx.globalAlpha = (0.34 - brightness * 0.14) * (1 - subjectReveal * 0.8)
  ctx.strokeStyle = palette.outline
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.ellipse(
    screen.x,
    screen.y,
    galaxy.radius * camera.zoom * 0.98,
    galaxy.radius * camera.zoom * DISC_TILT,
    0,
    0,
    Math.PI * 2,
  )
  ctx.stroke()
  ctx.restore()

  if (brightness > 0.01 && discAlpha > 0.02) {
    const g = frame.glowScale
    const radius = galaxy.radius * camera.zoom * (0.55 + brightness * 0.5) * g
    const gradient = glow.createRadialGradient(
      screen.x * g,
      screen.y * g,
      0,
      screen.x * g,
      screen.y * g,
      Math.max(1, radius),
    )
    gradient.addColorStop(0, rgba(palette.lit, 0.5 * brightness * discAlpha))
    gradient.addColorStop(0.5, rgba(palette.lit, 0.14 * brightness * discAlpha))
    gradient.addColorStop(1, rgba(palette.lit, 0))
    glow.fillStyle = gradient
    glow.beginPath()
    glow.arc(screen.x * g, screen.y * g, Math.max(1, radius), 0, Math.PI * 2)
    glow.fill()
  }
}

function drawGalaxyLabel(
  frame: Frame,
  galaxy: SceneGalaxy,
  brightness: number,
  subjectReveal: number,
  planetReveal: number,
): void {
  const { ctx, camera, palette, width, height } = frame
  const screen = toScreen(frame, galaxy.x, galaxy.y)
  const y = screen.y + galaxy.radius * camera.zoom * 0.72 + 26
  if (screen.x < -160 || screen.x > width + 160 || y < -40 || y > height + 40) return

  const focused = frame.focus.galaxy === galaxy.index
  // Close in, the short label would be a giant "8" over the subject stars. The
  // full label takes over as the row label fades.
  const rowAlpha = 1 - subjectReveal
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  if (rowAlpha > 0.02) {
    ctx.globalAlpha = rowAlpha
    ctx.font = `650 34px ${FONT}`
    ctx.fillStyle = focused ? rgba(palette.lit, 0.95) : palette.text
    ctx.fillText(galaxy.shortLabel, screen.x, y)
    ctx.globalAlpha = rowAlpha * 0.75
    ctx.font = `500 13px ${FONT}`
    ctx.fillStyle = palette.textMuted
    ctx.fillText(
      brightness > 0.001 ? `${Math.round(brightness * 100)}% lit` : 'unexplored',
      screen.x,
      y + 40,
    )

    // "You are here." A career map with no marker for the present is a map a
    // student has to count their way along.
    if (galaxy.index === frame.currentGrade) {
      ctx.globalAlpha = rowAlpha
      ctx.font = `600 11px ${FONT}`
      ctx.fillStyle = rgba(palette.lit, 0.85)
      ctx.textBaseline = 'bottom'
      ctx.fillText(
        'YOUR GRADE',
        screen.x,
        screen.y - galaxy.radius * camera.zoom * 0.66 - 14,
      )
      ctx.textBaseline = 'top'
    }
  }

  if (subjectReveal > 0.3) {
    // Above the galaxy once the camera is inside it: below, it lands on the
    // control bar at the bottom of the frame.
    ctx.globalAlpha = subjectReveal * (1 - planetReveal)
    ctx.font = `600 16px ${FONT}`
    ctx.fillStyle = palette.textMuted
    ctx.textBaseline = 'bottom'
    ctx.fillText(galaxy.label, screen.x, screen.y - galaxy.radius * camera.zoom * 0.62 - 12)
  }
  ctx.restore()
}

function drawBodyLabel(
  frame: Frame,
  worldX: number,
  worldY: number,
  text: string,
  alpha: number,
  size: number,
): void {
  const { ctx, palette, width, height } = frame
  const screen = toScreen(frame, worldX, worldY)
  if (screen.x < -200 || screen.x > width + 200 || screen.y < -30 || screen.y > height + 30) return

  ctx.save()
  ctx.globalAlpha = Math.min(1, alpha)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.font = `${size >= 13 ? 600 : 500} ${size}px ${FONT}`
  // A hairline of sky behind the type. Without it a label crossing a bright arm
  // becomes unreadable exactly where the map is most interesting.
  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(6, 8, 13, 0.75)'
  ctx.lineJoin = 'round'
  ctx.strokeText(text, screen.x, screen.y)
  ctx.fillStyle = alpha > 0.9 ? palette.text : palette.textMuted
  ctx.fillText(text, screen.x, screen.y)
  ctx.restore()
}

function drawStar(
  frame: Frame,
  worldX: number,
  worldY: number,
  worldRadius: number,
  brightness: number,
  reveal: number,
  focused: boolean,
): void {
  const { ctx, camera, palette } = frame
  const screen = toScreen(frame, worldX, worldY)
  const radius = Math.max(2, worldRadius * camera.zoom)
  if (screen.x < -radius * 8 || screen.x > frame.width + radius * 8) return

  const colour = mix(palette.unlit, palette.lit, brightness)

  ctx.save()
  ctx.globalAlpha = reveal
  // Outline first and always — the unlit state is an outline with nothing in it.
  ctx.strokeStyle = rgba(palette.lit, 0.18 + brightness * 0.5)
  ctx.lineWidth = Math.max(1, radius * 0.14)
  ctx.beginPath()
  ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = rgba(colour, 0.55 + brightness * 0.45)
  ctx.beginPath()
  ctx.arc(screen.x, screen.y, radius * (0.62 + brightness * 0.38), 0, Math.PI * 2)
  ctx.fill()

  // The focus ring marks which subject the keyboard is on. Dropped once the
  // camera is inside that subject's system, where the ring is answering a
  // question nobody is asking any more and the planets need the space.
  const systemReveal = revealFor('system', camera.zoom, {
    width: frame.width,
    height: frame.height,
  })
  if (focused && systemReveal < 0.5) {
    ctx.globalAlpha = reveal * (1 - systemReveal * 2)
    ctx.strokeStyle = rgba(palette.lit, 0.85)
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.arc(screen.x, screen.y, radius * 2.1, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
  }
  ctx.restore()

  if (brightness > 0.01) {
    // Damped a little once the planets are up, so a subject star stays the sun of
    // its system without drowning the skills orbiting it.
    const damp = 1 - systemReveal * 0.25
    emit(
      frame,
      screen.x,
      screen.y,
      Math.min(radius * (3 + brightness * 5), MAX_GLOW_PX) * damp,
      palette.lit,
      brightness * reveal * 0.9 * damp,
    )
  }
}

function drawOrbit(
  frame: Frame,
  starX: number,
  starY: number,
  orbit: number,
  reveal: number,
): void {
  const { ctx, camera, palette } = frame
  const screen = toScreen(frame, starX, starY)
  ctx.save()
  ctx.globalAlpha = reveal * 0.13
  ctx.strokeStyle = palette.outline
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.ellipse(screen.x, screen.y, orbit * camera.zoom, orbit * camera.zoom * ORBIT_TILT, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function drawPlanet(
  frame: Frame,
  worldX: number,
  worldY: number,
  worldRadius: number,
  brightness: number,
  reveal: number,
  focused: boolean,
): void {
  const { ctx, camera, palette } = frame
  const screen = toScreen(frame, worldX, worldY)
  const radius = Math.max(2, worldRadius * camera.zoom)
  if (screen.x < -60 || screen.x > frame.width + 60) return

  // Three states, three readings, and none of them is "missing": a lit planet is
  // gold, an emerging one is an ember at a third of the light, and an unlit one is
  // an outlined body with the sky showing through.
  const colour =
    brightness >= 0.99
      ? palette.lit
      : brightness > 0.01
        ? mix(palette.unlit, palette.ember, 0.8)
        : palette.unlit

  ctx.save()
  ctx.globalAlpha = reveal
  ctx.strokeStyle = rgba(palette.lit, 0.2 + brightness * 0.55)
  ctx.lineWidth = Math.max(1, radius * 0.22)
  ctx.beginPath()
  ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = rgba(colour, brightness > 0.01 ? 0.95 : 0.5)
  ctx.beginPath()
  ctx.arc(screen.x, screen.y, radius * 0.86, 0, Math.PI * 2)
  ctx.fill()

  if (focused) {
    ctx.strokeStyle = rgba(palette.lit, 0.9)
    ctx.lineWidth = 1.5
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.arc(screen.x, screen.y, radius * 2.6, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
  }
  ctx.restore()

  if (brightness > 0.01) {
    emit(
      frame,
      screen.x,
      screen.y,
      Math.min(radius * (3 + brightness * 4), MAX_GLOW_PX * 0.38),
      palette.lit,
      brightness * reveal * 0.9,
    )
  }
}

/**
 * The widest a single body's halo may be, in screen pixels.
 *
 * Glow radius is proportional to a body's on-screen size, which is right up to
 * the point where the camera is close enough that the proportion stops meaning
 * anything: at star-system zoom an uncapped planet threw a two-hundred-pixel
 * halo, the inner orbits merged into one white mass, and the subject star at the
 * centre of the frame disappeared inside its own children. A halo is light coming
 * off a body, not a light source of its own, so it gets a ceiling.
 */
const MAX_GLOW_PX = 120

/** Put light into the bloom buffer. Everything that glows goes through here. */
function emit(
  frame: Frame,
  screenX: number,
  screenY: number,
  radius: number,
  colour: RGB,
  intensity: number,
): void {
  const g = frame.glowScale
  const r = Math.max(1, radius * g)
  const x = screenX * g
  const y = screenY * g
  if (x < -r || x > frame.width * g + r || y < -r || y > frame.height * g + r) return

  const gradient = frame.glow.createRadialGradient(x, y, 0, x, y, r)
  gradient.addColorStop(0, rgba(colour, Math.min(1, intensity)))
  gradient.addColorStop(0.4, rgba(colour, Math.min(1, intensity) * 0.35))
  gradient.addColorStop(1, rgba(colour, 0))
  frame.glow.fillStyle = gradient
  frame.glow.beginPath()
  frame.glow.arc(x, y, r, 0, Math.PI * 2)
  frame.glow.fill()
}

function drawIgnitions(frame: Frame): void {
  const { ctx, palette, camera } = frame
  for (const ignition of frame.ignitions) {
    const age = (frame.time - ignition.start) / ignition.duration
    if (age < 0 || age > 1) continue
    const screen = toScreen(frame, ignition.x, ignition.y)
    const fade = (1 - age) ** 2

    // The core over-brightening: for a moment the body is far brighter than its
    // steady state, which is what a real fixture does and what makes the sound
    // land on something.
    emit(frame, screen.x, screen.y, (26 + 150 * age) * Math.max(0.6, camera.zoom / 3), palette.lit, fade * ignition.power)

    if (frame.reducedMotion) continue

    // The shockwave: the flood front crossing the room.
    const ring = 30 + 260 * easeOut(age)
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = fade * 0.5 * ignition.power
    ctx.strokeStyle = rgba(palette.lit, 1)
    ctx.lineWidth = Math.max(0.5, 3 * fade)
    ctx.beginPath()
    ctx.arc(screen.x, screen.y, ring, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()

    for (const spark of ignition.sparks) {
      const distance = spark.speed * easeOut(age) * 190
      const x = screen.x + Math.cos(spark.angle) * distance
      const y = screen.y + Math.sin(spark.angle) * distance * 0.72
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = fade * ignition.power
      ctx.fillStyle = rgba(palette.lit, 1)
      ctx.beginPath()
      ctx.arc(x, y, spark.size * fade, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      emit(frame, x, y, spark.size * 6, palette.lit, fade * 0.5)
    }
  }
}

/**
 * The room flooding.
 *
 * Kept for reduced motion, unlike the sparks and the shockwave: it is a change in
 * illumination rather than a thing travelling across the screen, and illumination
 * is precisely what the spec says to keep. It is halved and shortened there.
 */
function drawScreenFlash(frame: Frame): void {
  let strongest = 0
  for (const ignition of frame.ignitions) {
    const age = (frame.time - ignition.start) / ignition.duration
    if (age < 0 || age > 1) continue
    strongest = Math.max(strongest, (1 - age) ** 3 * ignition.power)
  }
  if (strongest <= 0.002) return

  const { ctx, palette, width, height } = frame
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = strongest * (frame.reducedMotion ? 0.07 : 0.16)
  ctx.fillStyle = rgba(palette.lit, 1)
  ctx.fillRect(0, 0, width, height)
  ctx.restore()
}

/**
 * Blur the emissive buffer and add it back.
 *
 * **Blur at the buffer's size, never at the canvas's.** The first version drew
 * the reduced buffer up to full size through `ctx.filter = 'blur(...)'`, which
 * asks the browser to blur every pixel of a 1600×900 canvas twice per frame. That
 * cost, by itself, took the view from 60fps to 18 — the rest of the frame, all
 * thirteen galaxies and their bodies and particles, was free by comparison.
 * Blurring the quarter-scale buffer instead is roughly six times less work for a
 * picture nobody can tell apart, because the result is about to be scaled up four
 * times anyway.
 *
 * Two radii, still: a tight one that puts a halo on the body and a wide one that
 * spills across the sky. One radius alone reads either as a sticker or as fog.
 */
function compositeBloom(frame: Frame): void {
  const { ctx, bloom, width, height } = frame
  const source = frame.glow.canvas
  const target = bloom.canvas

  if (frame.supportsFilter) {
    bloom.setTransform(1, 0, 0, 1, 0, 0)
    bloom.globalCompositeOperation = 'source-over'
    bloom.globalAlpha = 1
    bloom.clearRect(0, 0, target.width, target.height)
    bloom.globalCompositeOperation = 'lighter'
    // Radii are in buffer pixels, so they are the full-resolution radii scaled by
    // `glowScale` — 6px and 20px on the canvas.
    bloom.filter = `blur(${(6 * frame.glowScale).toFixed(2)}px)`
    bloom.globalAlpha = 0.95
    bloom.drawImage(source, 0, 0)
    bloom.filter = `blur(${(20 * frame.glowScale).toFixed(2)}px)`
    bloom.globalAlpha = 0.8
    bloom.drawImage(source, 0, 0)
    bloom.filter = 'none'
  }

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = 1
  // Upscaling with image smoothing on is itself a mild blur, which is why the
  // no-filter fallback (older Safari) still reads as a glow rather than as a
  // pixellated copy of the scene.
  ctx.drawImage(frame.supportsFilter ? target : source, 0, 0, width, height)
  ctx.restore()
}

export function easeOut(t: number): number {
  return 1 - (1 - t) ** 3
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

/** Reused by the camera and by the reveal bands, so nothing eases differently. */
export { smoothstep }
