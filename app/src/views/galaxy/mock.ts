/**
 * The mock career, and the seam a real source plugs into.
 *
 * The spec's phase 3 is "wire to an actual source". This file is the whole of
 * what phase 3 has to replace: one function returning a `GalaxyMap`. Nothing
 * downstream of it knows a generator exists.
 *
 * Deterministic, from a fixed seed, for two reasons. A demo that looks different
 * every reload cannot be discussed — "the fourth grade science star" has to mean
 * the same star tomorrow. And the entry sweep is only truthful if the career it
 * sweeps across is stable: a student who left off in the middle of eighth grade
 * should find the map the way they left it.
 */

import type { GalaxyGrade, GalaxyMap, GalaxySkill, GalaxySubject, MasteryState } from './model'

/** mulberry32. Small, fast, and good enough for placing dust and picking topics. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Subject order matches `SUBJECT_ORDER` in `lib/dataset.ts` — the curriculum order
 * the rest of the app sorts by — rather than alphabetical, so a reader moving
 * between this view and the student profile finds subjects in the same places.
 */
const SUBJECTS: { name: string; code: string; topics: string[] }[] = [
  {
    name: 'Math',
    code: 'MA',
    topics: [
      'Counting and cardinality',
      'Place value',
      'Addition within 100',
      'Subtraction with regrouping',
      'Multiplication facts',
      'Division and remainders',
      'Fractions on a number line',
      'Decimal operations',
      'Ratio and proportion',
      'Linear equations',
      'The coordinate plane',
      'Functions and slope',
      'Systems of equations',
      'Quadratic reasoning',
      'Exponential growth',
      'Trigonometric ratios',
    ],
  },
  {
    name: 'ELA',
    code: 'LA',
    topics: [
      'Letter sounds',
      'Blending and decoding',
      'Reading fluency',
      'Main idea and detail',
      'Context clues',
      'Summarising a text',
      'Narrative writing',
      'Citing textual evidence',
      'Author’s purpose',
      'Argument and claim',
      'Comparing sources',
      'Figurative language',
      'Research and citation',
      'Rhetorical analysis',
      'Editing for clarity',
      'Voice and audience',
    ],
  },
  {
    name: 'Science',
    code: 'SC',
    topics: [
      'Weather and seasons',
      'Living and non-living',
      'Life cycles',
      'Forces and motion',
      'States of matter',
      'Ecosystems and food webs',
      'The water cycle',
      'Energy transfer',
      'Earth’s systems',
      'Cells and heredity',
      'Chemical reactions',
      'Waves and light',
      'Newton’s laws',
      'Conservation of energy',
      'Climate and carbon',
      'Experimental design',
    ],
  },
  {
    name: 'Social Studies',
    code: 'SS',
    topics: [
      'Community helpers',
      'Maps and globes',
      'Needs and wants',
      'Local government',
      'State history',
      'Westward expansion',
      'The Constitution',
      'Civil rights',
      'Ancient civilisations',
      'World geography',
      'Economics and trade',
      'Primary sources',
      'Industrialisation',
      'Twentieth-century conflict',
      'Civic participation',
      'Global interdependence',
    ],
  },
  {
    name: 'Arts',
    code: 'AR',
    topics: [
      'Colour and shape',
      'Line and pattern',
      'Rhythm and beat',
      'Singing in a group',
      'Drawing from observation',
      'Music notation',
      'Composition and balance',
      'Improvisation',
      'Printmaking',
      'Ensemble performance',
      'Digital media',
      'Art history',
      'Critique and revision',
      'Portfolio development',
      'Stagecraft',
      'Original composition',
    ],
  },
  {
    name: 'Physical Education',
    code: 'PE',
    topics: [
      'Locomotor movement',
      'Throwing and catching',
      'Balance and coordination',
      'Cooperative games',
      'Striking and fielding',
      'Team invasion games',
      'Fitness components',
      'Pacing and endurance',
      'Net and wall games',
      'Personal fitness planning',
      'Nutrition and recovery',
      'Lifetime activities',
      'Officiating and rules',
      'Goal setting',
      'Strength fundamentals',
      'Sportsmanship',
    ],
  },
]

function gradeLabels(gradeLevel: number): { label: string; shortLabel: string } {
  if (gradeLevel === 0) return { label: 'Kindergarten', shortLabel: 'K' }
  return { label: `Grade ${gradeLevel}`, shortLabel: String(gradeLevel) }
}

export interface MockOptions {
  seed?: number
  currentGrade?: number
  displayName?: string
  /**
   * Start every skill unlit. The demo controls can build the whole career from
   * nothing, and starting dark is the honest way to show what "Fill" does — but
   * it is not the default, because an entry sweep across a career that was never
   * lived is a sweep across nothing.
   */
  empty?: boolean
}

/**
 * A career, seeded to look like one.
 *
 * The shape of it is the point: grades behind the student are mostly lit with a
 * scattering of gaps, the current grade is partly lit and thins out toward the
 * end of the year, and grades ahead are dark because they have not been taught.
 * Dark-because-unexplored is the majority of any real map, which is exactly why
 * the spec insists it must never read as punishment.
 */
export function mockGalaxyMap(options: MockOptions = {}): GalaxyMap {
  const { seed = 20250210, currentGrade = 8, displayName = 'Ana Reyes', empty = false } = options
  const random = seededRandom(seed)

  const grades: GalaxyGrade[] = []
  for (let gradeLevel = 0; gradeLevel <= 12; gradeLevel += 1) {
    const { label, shortLabel } = gradeLabels(gradeLevel)

    // How much of this grade has been lived through. Behind the student: all of
    // it. The current grade: partway, matching a dataset dated mid-February.
    // Ahead: none.
    const taughtShare =
      gradeLevel < currentGrade ? 1 : gradeLevel === currentGrade ? 0.55 : 0

    const subjects: GalaxySubject[] = SUBJECTS.map((subject, subjectIndex) => {
      const skillCount = 5 + Math.floor(random() * 4)
      const skills: GalaxySkill[] = []
      for (let index = 0; index < skillCount; index += 1) {
        const topic = subject.topics[(gradeLevel * 2 + index) % subject.topics.length]
        const taught = index / skillCount < taughtShare

        let masteryState: MasteryState = 'unlit'
        if (!empty && taught) {
          // A mastery rate that drifts a little by subject and grade, so the row
          // reads as a trajectory rather than a flat wash. Nothing here is a
          // claim about real students; it is enough variation to prove the
          // parent-brightness rule shows something.
          const roll = random()
          const strength = 0.62 + (gradeLevel < currentGrade ? 0.14 : -0.1) - subjectIndex * 0.015
          masteryState = roll < strength ? 'lit' : roll < strength + 0.22 ? 'emerging' : 'unlit'
        }

        skills.push({
          id: `g${gradeLevel}-${subject.code}-${index}`,
          name: topic,
          standardCode: `${subject.code}.${shortLabel}.${index + 1}`,
          masteryState,
          evidenceCount: masteryState === 'lit' ? 3 + Math.floor(random() * 5) : masteryState === 'emerging' ? 1 + Math.floor(random() * 2) : 0,
          lastEvidenceAt: masteryState === 'unlit' ? null : '2025-02-04',
        })
      }
      return { id: `g${gradeLevel}-${subject.code}`, name: subject.name, skills }
    })

    grades.push({ gradeLevel, label, shortLabel, subjects })
  }

  return {
    student: {
      id: 'demo-student',
      displayName,
      currentGrade,
      lastSessionAt: '2025-02-03T18:20:00Z',
    },
    grades,
  }
}
