/**
 * Where every body sits. Geometry only — no mastery, no colour, no canvas.
 *
 * Kept apart from the renderer for the same reason `stars.ts` is kept apart from
 * `Constellation.tsx`: this is the part with arithmetic in it, and arithmetic that
 * fails quietly. A layout bug here does not throw, it just puts a fourth-grade
 * planet inside a third-grade star, and the only way to catch that before a
 * classroom does is to be able to assert on the numbers. `node --test` strips
 * types but will not transform JSX, so anything a test touches lives in a `.ts`.
 *
 * One world, one coordinate system, three zoom levels. There is no nested
 * transform stack and no per-level scene: a planet's position is absolute world
 * space, and "zooming into eighth grade" is the camera moving, not the scene
 * changing. That is what makes the three levels feel like one place rather than
 * three screens — and it is why the reveal thresholds below are expressed as
 * zoom, not as state.
 */

import type { GalaxyMap, SkillAddress } from './model'

/** Distance between adjacent grade galaxies, in world units. */
export const GALAXY_SPACING = 1200
/** The visible disc of a galaxy. Subject stars live well inside it. */
export const GALAXY_RADIUS = 320
/** Radius of the ring the subject stars sit on. */
export const SUBJECT_ORBIT = 250
export const SUBJECT_STAR_RADIUS = 8
/** The innermost planet orbit, and the gap between successive ones. */
export const PLANET_ORBIT_BASE = 34
export const PLANET_ORBIT_STEP = 11
export const PLANET_RADIUS = 3

export interface ScenePlanet {
  id: string
  name: string
  standardCode?: string
  address: SkillAddress
  /** Where on its orbit it starts. Motion is added by the renderer, per frame. */
  baseAngle: number
  angularSpeed: number
  orbit: number
  radius: number
  /** The star it belongs to, in world space — planet position is derived per frame. */
  starX: number
  starY: number
}

export interface SceneStar {
  id: string
  name: string
  gradeIndex: number
  subjectIndex: number
  x: number
  y: number
  radius: number
  planets: ScenePlanet[]
}

export interface SceneGalaxy {
  id: string
  index: number
  gradeLevel: number
  label: string
  shortLabel: string
  x: number
  y: number
  radius: number
  /** Fixed per galaxy, so the dust in its arms is the same dust on every reload. */
  seed: number
  /** How far its spiral is rotated. Two adjacent galaxies should not be twins. */
  rotation: number
  stars: SceneStar[]
}

export interface Scene {
  galaxies: SceneGalaxy[]
  minX: number
  maxX: number
}

/**
 * Build the scene from the map's *shape*.
 *
 * Deliberately blind to mastery state. Positions must not move when a skill
 * lights: a student who learns the map has learned where their things are, and a
 * layout that reflows on an update would take that away at exactly the moment the
 * view is asking them to look.
 */
export function buildScene(map: GalaxyMap): Scene {
  const galaxies = map.grades.map((grade, index) => {
    const x = index * GALAXY_SPACING
    // A gentle vertical drift so the row reads as a field rather than a ruler,
    // and so the eye has something to track during the entry sweep.
    const y = Math.sin(index * 0.9) * 74

    const stars: SceneStar[] = grade.subjects.map((subject, subjectIndex) => {
      const count = grade.subjects.length
      // Started a sixth of a turn off vertical so no star sits directly under the
      // galaxy's label.
      const angle = (subjectIndex / count) * Math.PI * 2 - Math.PI / 2 + 0.32
      const starX = x + Math.cos(angle) * SUBJECT_ORBIT
      const starY = y + Math.sin(angle) * SUBJECT_ORBIT

      const planets: ScenePlanet[] = subject.skills.map((skill, skillIndex) => ({
        id: skill.id,
        name: skill.name,
        standardCode: skill.standardCode,
        address: { grade: index, subject: subjectIndex, skill: skillIndex },
        // The golden angle, not an even division of the circle.
        //
        // Evenly spaced starting angles under differing orbital speeds converge:
        // the first pass spaced them evenly and gave the inner orbits a much
        // faster rate, and about ten seconds in the inner three planets bunched
        // into one corner with their labels stacked on top of each other. The
        // golden angle is the arrangement that resists exactly that, which is why
        // sunflowers use it.
        baseAngle: skillIndex * 2.39996 + subjectIndex,
        // Inner orbits still run faster — the one thing everybody already knows
        // about orbits, and so the thing that makes this read as a system rather
        // than a diagram — but by a gentler ratio, so the spread survives.
        angularSpeed: 0.22 / (1 + skillIndex * 0.18),
        orbit: PLANET_ORBIT_BASE + skillIndex * PLANET_ORBIT_STEP,
        radius: PLANET_RADIUS,
        starX,
        starY,
      }))

      return {
        id: subject.id,
        name: subject.name,
        gradeIndex: index,
        subjectIndex,
        x: starX,
        y: starY,
        radius: SUBJECT_STAR_RADIUS,
        planets,
      }
    })

    return {
      id: `grade-${grade.gradeLevel}`,
      index,
      gradeLevel: grade.gradeLevel,
      label: grade.label,
      shortLabel: grade.shortLabel,
      x,
      y,
      radius: GALAXY_RADIUS,
      seed: 1000 + grade.gradeLevel * 7919,
      rotation: index * 0.77,
      stars,
    }
  })

  return {
    galaxies,
    minX: 0 - GALAXY_RADIUS,
    maxX: (galaxies.length - 1) * GALAXY_SPACING + GALAXY_RADIUS,
  }
}

/** A planet's position at time `t` seconds. `t` of 0 freezes every orbit. */
export function planetPosition(planet: ScenePlanet, t: number): { x: number; y: number } {
  const angle = planet.baseAngle + t * planet.angularSpeed
  return {
    x: planet.starX + Math.cos(angle) * planet.orbit,
    // Orbits are drawn on a tilted plane so a star system reads as a system seen
    // at an angle rather than as a target with rings.
    y: planet.starY + Math.sin(angle) * planet.orbit * 0.46,
  }
}

export function findPlanet(scene: Scene, address: SkillAddress): ScenePlanet | undefined {
  return scene.galaxies[address.grade]?.stars[address.subject]?.planets[address.skill]
}

export function findStar(scene: Scene, gradeIndex: number, subjectIndex: number) {
  return scene.galaxies[gradeIndex]?.stars[subjectIndex]
}

/**
 * Smoothstep between two edges, clamped. The one shared easing primitive: fades,
 * reveals, and the flash falloff all run through it, so nothing in the view has a
 * hard edge that a softer neighbour makes look like a bug.
 */
export function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge1 === edge0) return value < edge0 ? 0 : 1
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

