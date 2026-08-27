/**
 * The galaxy map: what the alternative student dashboard draws, and nothing about
 * how it is drawn.
 *
 * This is the shape the build spec's section 7 asks for, with one rule held
 * strictly: **the render layer never reads a data source.** It reads a
 * `GalaxyMap` handed to it, so the mock generator below can be replaced by a
 * fetch against real mastery evidence without a line changing in `scene.ts`,
 * `render.ts`, or the canvas component. That is the spec's last non-negotiable,
 * and the cheapest time to honour it is before there is any real data to swap in.
 *
 * The existing student profile is untouched and stays the product's dashboard.
 * This map is deliberately its own model rather than a projection of
 * `StudentProfile`: the profile is organised by school year and section, and this
 * view is organised by grade level and subject across a whole K-12 career. When
 * this is wired to real data (phase 3 in the spec) the adapter belongs here, in
 * one function, next to the mock it replaces.
 */

/**
 * Three states, per the spec's table, plus the fourth the spec marks [INFERRED]
 * and asks to confirm: `emerging`.
 *
 * It is carried here and rendered as a dim ember because a binary lit/unlit will
 * misrepresent most real gradebook data — a student is usually mid-progress on
 * many skills at once, and a binary map would draw all of that as failure. The
 * demo controls below do not produce it (they move a skill between `unlit` and
 * `lit`, one at a time, which is what a fill button is for); the seeded career
 * does, so the state is visible on screen and can be judged before it is
 * committed to.
 */
export type MasteryState = 'unlit' | 'emerging' | 'lit'

export interface GalaxySkill {
  id: string
  name: string
  standardCode?: string
  masteryState: MasteryState
  evidenceCount: number
  lastEvidenceAt: string | null
}

export interface GalaxySubject {
  id: string
  name: string
  skills: GalaxySkill[]
}

export interface GalaxyGrade {
  /** 0 for kindergarten, through 12. The spec's numbering. */
  gradeLevel: number
  /** "Kindergarten", "Grade 8". */
  label: string
  /** "K", "8". What fits under a galaxy at row zoom. */
  shortLabel: string
  subjects: GalaxySubject[]
}

export interface GalaxyStudent {
  id: string
  displayName: string
  currentGrade: number
  lastSessionAt: string
}

export interface GalaxyMap {
  student: GalaxyStudent
  grades: GalaxyGrade[]
}

/** Where one skill lives, as indices. The address the ignition queue carries. */
export interface SkillAddress {
  grade: number
  subject: number
  skill: number
}

// --- Brightness ---------------------------------------------------------------

/**
 * How lit each state is, from 0 to 1.
 *
 * `emerging` sits at 0.34 — inside the spec's suggested 25-40% band, and far
 * enough above zero that an ember is unmistakably *something* rather than a star
 * the renderer failed to light. The distinction matters more than the exact
 * value: unexplored and in-progress must not read the same.
 */
export const STATE_BRIGHTNESS: Record<MasteryState, number> = {
  unlit: 0,
  emerging: 0.34,
  lit: 1,
}

/**
 * A parent's glow is a function of its children's, which is the spec's rule in
 * section 3 and the same rule the rest of the app already draws by: brightness is
 * the share of mastery demonstrated inside a thing.
 *
 * Averaged over skills rather than over subjects, so a grade with a 20-skill
 * subject and a 5-skill subject is not half-lit by mastering the small one. And
 * absolute, never shaded against the neighbouring grades: relative shading would
 * turn a K-12 career into a league table against itself, which is the reading
 * this product spends its whole design arguing away from.
 */
export function subjectBrightness(subject: GalaxySubject): number {
  if (subject.skills.length === 0) return 0
  let total = 0
  for (const skill of subject.skills) total += STATE_BRIGHTNESS[skill.masteryState]
  return total / subject.skills.length
}

export function gradeBrightness(grade: GalaxyGrade): number {
  let total = 0
  let count = 0
  for (const subject of grade.subjects) {
    for (const skill of subject.skills) {
      total += STATE_BRIGHTNESS[skill.masteryState]
      count += 1
    }
  }
  return count === 0 ? 0 : total / count
}

export interface MapTally {
  lit: number
  emerging: number
  unlit: number
  total: number
}

export function tally(map: GalaxyMap): MapTally {
  const counts: MapTally = { lit: 0, emerging: 0, unlit: 0, total: 0 }
  for (const grade of map.grades) {
    for (const subject of grade.subjects) {
      for (const skill of subject.skills) {
        counts[skill.masteryState] += 1
        counts.total += 1
      }
    }
  }
  return counts
}

// --- Addressing ---------------------------------------------------------------

/**
 * Every skill in the map, in career order: kindergarten first, and within a grade
 * in the subject order the curriculum is written in.
 *
 * This ordering is what makes "master one more" mean something. A random pick
 * would light the map like static; walking it in career order lights it the way a
 * career is actually lived, earliest gap first.
 */
export function skillAddresses(map: GalaxyMap): SkillAddress[] {
  const out: SkillAddress[] = []
  map.grades.forEach((grade, g) => {
    grade.subjects.forEach((subject, s) => {
      subject.skills.forEach((_skill, k) => out.push({ grade: g, subject: s, skill: k }))
    })
  })
  return out
}

export function skillAt(map: GalaxyMap, address: SkillAddress): GalaxySkill | undefined {
  return map.grades[address.grade]?.subjects[address.subject]?.skills[address.skill]
}

export function sameAddress(a: SkillAddress | null, b: SkillAddress | null): boolean {
  if (!a || !b) return a === b
  return a.grade === b.grade && a.subject === b.subject && a.skill === b.skill
}

/** The earliest skill in the career that is not yet lit. */
export function nextUnlit(map: GalaxyMap): SkillAddress | null {
  for (const address of skillAddresses(map)) {
    if (skillAt(map, address)?.masteryState !== 'lit') return address
  }
  return null
}

/** The latest skill in the career that is lit — what "unmaster one" takes back. */
export function lastLit(map: GalaxyMap): SkillAddress | null {
  const all = skillAddresses(map)
  for (let i = all.length - 1; i >= 0; i -= 1) {
    if (skillAt(map, all[i])?.masteryState === 'lit') return all[i]
  }
  return null
}

// --- Transitions --------------------------------------------------------------

/**
 * Set one skill's state, returning a new map.
 *
 * Structurally shared along the path rather than deep-copied: the arrays that did
 * not change keep their identity, so a 600-skill map costs three array copies per
 * ignition instead of six hundred object clones. The view re-renders on identity,
 * and at one click per ignition that difference is invisible — but `Fill` walks
 * the whole map a grade at a time and the difference there is a dropped frame.
 */
export function withSkillState(
  map: GalaxyMap,
  address: SkillAddress,
  state: MasteryState,
  at: string | null = null,
): GalaxyMap {
  const grade = map.grades[address.grade]
  const subject = grade?.subjects[address.subject]
  const skill = subject?.skills[address.skill]
  if (!grade || !subject || !skill) return map
  if (skill.masteryState === state) return map

  const nextSkill: GalaxySkill = {
    ...skill,
    masteryState: state,
    evidenceCount: state === 'unlit' ? 0 : Math.max(skill.evidenceCount, state === 'lit' ? 3 : 1),
    lastEvidenceAt: state === 'unlit' ? null : (at ?? skill.lastEvidenceAt),
  }

  const skills = subject.skills.slice()
  skills[address.skill] = nextSkill
  const subjects = grade.subjects.slice()
  subjects[address.subject] = { ...subject, skills }
  const grades = map.grades.slice()
  grades[address.grade] = { ...grade, subjects }
  return { ...map, grades }
}

/** Every skill at once — what `Reset` and `Fill` are. */
export function withAllSkills(map: GalaxyMap, state: MasteryState, at: string | null): GalaxyMap {
  return {
    ...map,
    grades: map.grades.map((grade) => ({
      ...grade,
      subjects: grade.subjects.map((subject) => ({
        ...subject,
        skills: subject.skills.map((skill) => ({
          ...skill,
          masteryState: state,
          evidenceCount: state === 'unlit' ? 0 : Math.max(skill.evidenceCount, 3),
          lastEvidenceAt: state === 'unlit' ? null : (at ?? skill.lastEvidenceAt),
        })),
      })),
    })),
  }
}

/** One whole grade at once — the step `Fill` takes, one galaxy per pass. */
export function withGradeState(
  map: GalaxyMap,
  gradeIndex: number,
  state: MasteryState,
  at: string | null,
): GalaxyMap {
  const grade = map.grades[gradeIndex]
  if (!grade) return map
  const grades = map.grades.slice()
  grades[gradeIndex] = {
    ...grade,
    subjects: grade.subjects.map((subject) => ({
      ...subject,
      skills: subject.skills.map((skill) => ({
        ...skill,
        masteryState: state,
        evidenceCount: state === 'unlit' ? 0 : Math.max(skill.evidenceCount, 3),
        lastEvidenceAt: state === 'unlit' ? null : (at ?? skill.lastEvidenceAt),
      })),
    })),
  }
  return { ...map, grades }
}

/** Addresses of every skill in one grade, for the cascade `Fill` runs. */
export function addressesInGrade(map: GalaxyMap, gradeIndex: number): SkillAddress[] {
  const grade = map.grades[gradeIndex]
  if (!grade) return []
  const out: SkillAddress[] = []
  grade.subjects.forEach((subject, s) => {
    subject.skills.forEach((_skill, k) => out.push({ grade: gradeIndex, subject: s, skill: k }))
  })
  return out
}
