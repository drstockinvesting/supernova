/**
 * The alternative dashboard's arithmetic, tested for the reason the rest of this
 * project tests things: these failures do not look like failures.
 *
 * A galaxy map that lights the wrong star is still a galaxy map. A zoom level
 * whose reveal threshold has drifted still renders — it just renders a level that
 * is either always visible or never reachable, and the only symptom is that the
 * view feels wrong in a room full of children. Three things are worth pinning
 * down, and none of them is visible in a screenshot:
 *
 *   1. **Brightness is derived, and derived the same way at every level.** A
 *      grade's glow is the share of skills lit inside it, averaged over skills
 *      rather than over subjects, and absolute rather than relative to its
 *      neighbours. That is the same rule `stars.ts` holds for the existing views,
 *      and if the two ever disagree the product's central claim is quietly false.
 *   2. **The zoom levels and the reveal bands agree.** Subject stars must be
 *      invisible at row zoom and solid at galaxy zoom; planets invisible at
 *      galaxy zoom and solid at system zoom. These are two constants in two files
 *      and nothing but this test connects them.
 *   3. **The demo controls walk the career in order.** "Master one more" means
 *      the earliest unmastered skill, not an arbitrary one.
 *
 * Run with `npm --prefix app test`.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { zoomFor, cameraFor, clampRowX, nearestGalaxy, revealFor, tweenCamera } from './camera.ts'
import { mockGalaxyMap } from './mock.ts'
import {
  gradeBrightness,
  lastLit,
  nextUnlit,
  skillAddresses,
  skillAt,
  subjectBrightness,
  tally,
  withAllSkills,
  withGradeState,
  withSkillState,
} from './model.ts'
import type { GalaxyMap } from './model.ts'
import {
  GALAXY_SPACING,
  PLANET_ORBIT_BASE,
  PLANET_ORBIT_STEP,
  SUBJECT_ORBIT,
  buildScene,
  findPlanet,
  planetPosition,
} from './scene.ts'

const VIEWPORT = { width: 1440, height: 760 }

function empty(): GalaxyMap {
  return mockGalaxyMap({ empty: true })
}

// --- Brightness ---------------------------------------------------------------

test('a subject is as bright as the share of its skills that are lit', () => {
  const map = withGradeState(empty(), 0, 'lit', '2025-02-10')
  assert.equal(subjectBrightness(map.grades[0].subjects[0]), 1)
  assert.equal(subjectBrightness(map.grades[1].subjects[0]), 0)
})

test('an emerging skill is an ember, not a lit star and not an empty one', () => {
  const base = empty()
  const address = { grade: 0, subject: 0, skill: 0 }
  const emerging = subjectBrightness(
    withSkillState(base, address, 'emerging', '2025-02-10').grades[0].subjects[0],
  )
  const lit = subjectBrightness(
    withSkillState(base, address, 'lit', '2025-02-10').grades[0].subjects[0],
  )
  assert.ok(emerging > 0, 'an ember is not darkness')
  assert.ok(emerging < lit, 'an ember is not mastery')
})

test('a grade averages over its skills, not over its subjects', () => {
  // A subject with many skills must not be outweighed by a subject with few.
  // Lighting one whole subject out of six should move the grade by that
  // subject's share of the grade's skills, which is not one sixth.
  const base = empty()
  const grade = base.grades[3]
  const total = grade.subjects.reduce((sum, subject) => sum + subject.skills.length, 0)
  const first = grade.subjects[0]
  let lit = base
  first.skills.forEach((_skill, index) => {
    lit = withSkillState(lit, { grade: 3, subject: 0, skill: index }, 'lit', '2025-02-10')
  })
  assert.ok(
    Math.abs(gradeBrightness(lit.grades[3]) - first.skills.length / total) < 1e-9,
    'grade brightness is the share of the grade’s skills that are lit',
  )
})

test('brightness is absolute — lighting one grade does not dim another', () => {
  const one = withGradeState(empty(), 5, 'lit', '2025-02-10')
  const two = withGradeState(one, 6, 'lit', '2025-02-10')
  assert.equal(gradeBrightness(one.grades[5]), gradeBrightness(two.grades[5]))
})

// --- The demo controls --------------------------------------------------------

test('mastering one more takes the earliest skill in the career that is not lit', () => {
  let map = empty()
  const order = skillAddresses(map)
  for (let step = 0; step < 12; step += 1) {
    const address = nextUnlit(map)
    assert.deepEqual(address, order[step], `step ${step} takes the next skill in career order`)
    map = withSkillState(map, address!, 'lit', '2025-02-10')
  }
  assert.equal(tally(map).lit, 12)
})

test('unmastering takes the latest lit skill back, so the pair is reversible', () => {
  const order = skillAddresses(empty())
  let map = empty()
  for (let step = 0; step < 6; step += 1) map = withSkillState(map, order[step], 'lit', '2025-02-10')
  const before = tally(map).lit

  const address = lastLit(map)
  assert.deepEqual(address, order[5])
  map = withSkillState(map, address!, 'unlit', null)
  assert.equal(tally(map).lit, before - 1)
  assert.deepEqual(nextUnlit(map), order[5], 'the skill just taken back is the next one offered')
})

test('mastering an emerging skill lights it rather than skipping past it', () => {
  // The seeded career has emergers in it. "Next unlit" must mean "next not lit",
  // or a demo of Master would step over every partially evidenced skill and the
  // fill would never complete.
  const seeded = mockGalaxyMap()
  const address = nextUnlit(seeded)
  assert.ok(address, 'a seeded career has somewhere left to go')
  const lit = withSkillState(seeded, address!, 'lit', '2025-02-10')
  assert.equal(skillAt(lit, address!)?.masteryState, 'lit')
  assert.equal(tally(lit).lit, tally(seeded).lit + 1)
})

test('reset empties the map and fill lights all of it', () => {
  const map = mockGalaxyMap()
  const counts = tally(map)
  assert.ok(counts.lit > 0 && counts.unlit > 0, 'the seeded career is partly lived')

  const cleared = tally(withAllSkills(map, 'unlit', null))
  assert.equal(cleared.lit, 0)
  assert.equal(cleared.emerging, 0)
  assert.equal(cleared.unlit, cleared.total)

  const filled = tally(withAllSkills(map, 'lit', '2025-02-10'))
  assert.equal(filled.lit, filled.total)
  assert.equal(filled.unlit, 0)
})

test('fill lights one grade at a time and leaves the others alone', () => {
  const map = withGradeState(empty(), 4, 'lit', '2025-02-10')
  assert.equal(gradeBrightness(map.grades[4]), 1)
  assert.equal(gradeBrightness(map.grades[3]), 0)
  assert.equal(gradeBrightness(map.grades[5]), 0)
})

test('a transition returns a new map and leaves the old one untouched', () => {
  // The render loop reads the map through a ref every frame. If a transition
  // mutated in place, the count in the HUD and the light on the canvas could
  // disagree for a frame and nobody would ever reproduce it.
  const before = empty()
  const after = withSkillState(before, { grade: 2, subject: 1, skill: 0 }, 'lit', '2025-02-10')
  assert.notEqual(before, after)
  assert.equal(tally(before).lit, 0)
  assert.equal(tally(after).lit, 1)
  assert.equal(
    before.grades[3],
    after.grades[3],
    'grades that did not change keep their identity, so the diff stays cheap',
  )
})

// --- Layout -------------------------------------------------------------------

test('the galaxy row runs left to right in grade order', () => {
  const scene = buildScene(empty())
  assert.equal(scene.galaxies.length, 13)
  for (let index = 1; index < scene.galaxies.length; index += 1) {
    assert.ok(scene.galaxies[index].x > scene.galaxies[index - 1].x)
    assert.equal(scene.galaxies[index].gradeLevel, index)
  }
  assert.equal(scene.galaxies[0].shortLabel, 'K')
})

test('a star system fits between its neighbours', () => {
  // The outermost orbit a subject can have must not reach the next subject star,
  // or two subjects' skills overlap and a click lands on the wrong one.
  const scene = buildScene(empty())
  const stars = scene.galaxies[0].stars
  const outermost = PLANET_ORBIT_BASE + PLANET_ORBIT_STEP * 8
  let closest = Infinity
  for (let i = 0; i < stars.length; i += 1) {
    for (let j = i + 1; j < stars.length; j += 1) {
      closest = Math.min(closest, Math.hypot(stars[i].x - stars[j].x, stars[i].y - stars[j].y))
    }
  }
  assert.ok(closest > outermost * 2, `subject stars are ${closest.toFixed(0)} apart, orbits reach ${outermost}`)
})

test('subject stars stay inside their own galaxy', () => {
  const scene = buildScene(empty())
  for (const galaxy of scene.galaxies) {
    for (const star of galaxy.stars) {
      const distance = Math.hypot(star.x - galaxy.x, star.y - galaxy.y)
      assert.ok(distance <= SUBJECT_ORBIT + 0.001)
      assert.ok(distance < GALAXY_SPACING / 2, 'and well clear of the next galaxy')
    }
  }
})

test('a planet orbits its own star and can be found from its address', () => {
  const map = empty()
  const scene = buildScene(map)
  const address = { grade: 7, subject: 2, skill: 1 }
  const planet = findPlanet(scene, address)
  assert.ok(planet)
  assert.deepEqual(planet!.address, address)

  const star = scene.galaxies[7].stars[2]
  for (const t of [0, 1.7, 9.3]) {
    const position = planetPosition(planet!, t)
    const distance = Math.hypot(position.x - star.x, position.y - star.y)
    assert.ok(distance <= planet!.orbit + 0.001, 'never further out than its own orbit')
  }
})

test('the layout does not move when a skill lights', () => {
  const dark = buildScene(empty())
  const bright = buildScene(withAllSkills(empty(), 'lit', '2025-02-10'))
  assert.deepEqual(
    dark.galaxies.map((galaxy) => [galaxy.x, galaxy.y]),
    bright.galaxies.map((galaxy) => [galaxy.x, galaxy.y]),
  )
})

// --- Camera and reveal --------------------------------------------------------

test('the three zoom levels are ordered and distinct', () => {
  const row = zoomFor('row', VIEWPORT)
  const galaxy = zoomFor('galaxy', VIEWPORT)
  const system = zoomFor('system', VIEWPORT)
  assert.ok(row < galaxy, 'a galaxy is closer than the row')
  assert.ok(galaxy < system, 'a star system is closer than a galaxy')
  assert.ok(galaxy / row > 2, 'and each step is a step, not a nudge')
  assert.ok(system / galaxy > 2)
})

test('each level reveals exactly the level it is meant to', () => {
  // The failure this catches: someone widens a fade band or reframes a zoom, and
  // planets become visible from the row — at which point the third level of the
  // zoom has nothing left to reveal and the whole structure collapses to two.
  for (const viewport of [VIEWPORT, { width: 900, height: 520 }, { width: 1920, height: 1080 }]) {
    const row = zoomFor('row', viewport)
    const galaxy = zoomFor('galaxy', viewport)
    const system = zoomFor('system', viewport)

    assert.equal(revealFor('galaxy', row, viewport), 0, 'no subject stars from the row')
    assert.equal(revealFor('system', row, viewport), 0, 'and certainly no planets')
    assert.equal(revealFor('galaxy', galaxy, viewport), 1, 'subjects are solid inside a galaxy')
    assert.ok(revealFor('system', galaxy, viewport) < 0.5, 'planets are only a hint there')
    assert.equal(revealFor('system', system, viewport), 1, 'and solid in the star system')
  }
})

test('the camera frames what the view names', () => {
  const scene = buildScene(empty())
  const row = cameraFor(scene, { level: 'row', galaxy: 8, star: 0, planet: 0 }, VIEWPORT)
  assert.equal(row.x, scene.galaxies[8].x)
  assert.equal(row.y, 0, 'the row is framed flat')

  const galaxy = cameraFor(scene, { level: 'galaxy', galaxy: 8, star: 3, planet: 0 }, VIEWPORT)
  assert.equal(galaxy.x, scene.galaxies[8].x)
  assert.equal(galaxy.y, scene.galaxies[8].y)

  const system = cameraFor(scene, { level: 'system', galaxy: 8, star: 3, planet: 0 }, VIEWPORT)
  assert.equal(system.x, scene.galaxies[8].stars[3].x)
  assert.equal(system.y, scene.galaxies[8].stars[3].y)
})

test('an out-of-range focus is clamped rather than framing empty space', () => {
  const scene = buildScene(empty())
  const camera = cameraFor(scene, { level: 'row', galaxy: 99, star: 99, planet: 99 }, VIEWPORT)
  assert.equal(camera.x, scene.galaxies[12].x)
})

test('the row cannot be dragged off the end of the career', () => {
  const scene = buildScene(empty())
  const left = clampRowX(-99999, scene, VIEWPORT)
  const right = clampRowX(99999, scene, VIEWPORT)
  assert.ok(left < right)
  assert.ok(left >= scene.minX - 1)
  assert.ok(right <= scene.maxX + 1)
  assert.equal(clampRowX(scene.galaxies[6].x, scene, VIEWPORT), scene.galaxies[6].x)
})

test('releasing a drag snaps to the nearest grade', () => {
  const scene = buildScene(empty())
  assert.equal(nearestGalaxy(scene, scene.galaxies[4].x + 10), 4)
  assert.equal(nearestGalaxy(scene, scene.galaxies[4].x + GALAXY_SPACING * 0.6), 5)
  assert.equal(nearestGalaxy(scene, -99999), 0)
})

test('a camera move ends where it was told to end', () => {
  const from = { x: 0, y: 0, zoom: 0.25 }
  const to = { x: 1200, y: 40, zoom: 6 }
  assert.deepEqual(tweenCamera(from, to, 0), from)
  const landed = tweenCamera(from, to, 1)
  assert.ok(Math.abs(landed.x - to.x) < 1e-6)
  assert.ok(Math.abs(landed.zoom - to.zoom) < 1e-6)
  // Monotonic in zoom, so the move never backs away from its target on the way.
  let previous = from.zoom
  for (let step = 1; step <= 10; step += 1) {
    const zoom = tweenCamera(from, to, step / 10).zoom
    assert.ok(zoom > previous)
    previous = zoom
  }
})

// --- The seeded career --------------------------------------------------------

test('the seeded career reads as a career: lit behind, partial now, dark ahead', () => {
  const map = mockGalaxyMap({ currentGrade: 8 })
  const behind = gradeBrightness(map.grades[3])
  const now = gradeBrightness(map.grades[8])
  const ahead = gradeBrightness(map.grades[11])
  assert.ok(behind > 0.5, 'a finished grade is mostly lit')
  assert.ok(now > 0 && now < behind, 'the current grade is under way')
  assert.equal(ahead, 0, 'and a grade not yet taught is dark — unexplored, not failed')
})

test('the same seed produces the same career', () => {
  assert.deepEqual(mockGalaxyMap({ seed: 7 }), mockGalaxyMap({ seed: 7 }))
  assert.notDeepEqual(mockGalaxyMap({ seed: 7 }), mockGalaxyMap({ seed: 8 }))
})

test('an empty career has somewhere to go and nothing to take back', () => {
  const map = empty()
  assert.equal(tally(map).lit, 0)
  assert.ok(nextUnlit(map))
  assert.equal(lastLit(map), null)

  const full = withAllSkills(map, 'lit', '2025-02-10')
  assert.equal(nextUnlit(full), null, 'a full map offers nothing more to master')
  assert.ok(lastLit(full))
})
