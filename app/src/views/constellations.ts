/**
 * The same picture, at the four zoom levels above a single student.
 *
 * `ui/Constellation` knows how to draw a sky. These functions decide what a star
 * *is* at each level, and they are pure so that the decision can be tested — the
 * one thing that would quietly break the fractal is two levels disagreeing about
 * what brightness means, and that is invisible on screen.
 *
 * The rule, stated once:
 *
 *   A star is the smallest thing this viewer is allowed to see at this level, and
 *   its brightness is the share of mastery demonstrated inside it.
 *
 * Which gives:
 *
 *   student    star = one standard          brightness = evidence behind the judgement
 *   classroom  star = one student's unit    brightness = standards mastered in it
 *   building   star = one classroom         brightness = the classroom's mastery rate
 *   district   star = one classroom         brightness = the classroom's mastery rate
 *   public     star = one grade             brightness = the grade's rate in that subject
 *
 * The public level stops at a grade for the same reason the route boundary stops
 * there: a classroom is a teacher and twenty named children, and the community
 * dashboard is forbidden classroom and teacher identifiers. The sky gets coarser
 * as the viewer's entitlement narrows, which is the honest version of the vision
 * document's promise that permission boundaries are invisible — the picture is
 * always whole, it is just made of larger pieces.
 *
 * One thing these deliberately do *not* do is rank. A star's brightness is
 * measured against the same absolute thresholds everywhere, never against its
 * neighbours in the same sky. Relative shading would turn a district that is
 * evenly mid-year into a league table, and the district view spends a paragraph
 * arguing that ranking three buildings a point apart is reading noise.
 */

import type {
  AggregateCell,
  SectionContext,
  SectionRosterRow,
  SectionUnit,
} from '../types/profile'
// Explicit extensions on every runtime import: this module is imported by a test,
// and `node --test` resolves ESM specifiers literally rather than the way a bundler
// does. `allowImportingTsExtensions` is already on, so TypeScript is content and
// Vite resolves them unchanged.
import { intensityOfRate, type Star, type StarGroup } from '../ui/stars.ts'
import { bySubjectOrder, gradeLabel } from '../lib/dataset.ts'
import { discloseCells } from './community/disclosure.ts'

/** A rate over a denominator of zero is not a rate. Nothing taught yet is dark. */
function starOf(
  id: string,
  label: string,
  taught: number,
  rate: number | null,
  to?: string,
): Star {
  if (taught <= 0) {
    return { id, state: 'not_taught', brightness: 'none', label: `${label} — not yet taught` }
  }
  return { id, state: 'lit', brightness: 'none', intensity: intensityOfRate(rate), label, to }
}

function percentLabel(rate: number | null | undefined): string {
  return rate === null || rate === undefined ? '—' : `${rate.toFixed(1)}%`
}

// --- Classroom ---------------------------------------------------------------

/**
 * Subject, then unit, then one star per student.
 *
 * This is the student profile transposed. On a student the grid runs standards
 * across one learner; here it runs learners across one unit — and because the
 * roster is sorted once and reused for every cluster, a student holds the same
 * position in every unit's field. Reading the same position across the units
 * follows one child through the year, which is the single most useful thing this
 * view can show a teacher, and it is why the sort happens once up here rather
 * than per cluster.
 */
export function classroomSky(
  units: SectionUnit[],
  roster: SectionRosterRow[],
  { canOpenStudents }: { canOpenStudents: boolean },
): StarGroup[] {
  const students = [...roster].sort(
    (a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName),
  )

  const bySubject = new Map<string, SectionUnit[]>()
  for (const unit of units) {
    const entry = bySubject.get(unit.subject) ?? []
    entry.push(unit)
    bySubject.set(unit.subject, entry)
  }

  return [...bySubject.entries()]
    .sort((a, b) => bySubjectOrder(a[0], b[0]))
    .map(([subject, subjectUnits]) => {
      const ordered = [...subjectUnits].sort((a, b) => a.sequence - b.sequence)
      const mastered = ordered.reduce((sum, unit) => sum + unit.standardsMastered, 0)
      const taught = ordered.reduce((sum, unit) => sum + unit.standardsTaughtToDate, 0)

      return {
        id: subject,
        label: subject,
        meta: `${mastered} of ${taught} demonstrations`,
        clusters: ordered.map((unit) => ({
          id: unit.unitId,
          label: unit.name,
          stars: students.map((student) => {
            const cell = student.masteryByUnit[unit.unitId]
            const name = `${student.firstName} ${student.lastName}`
            const id = `${unit.unitId}-${student.studentId}`

            if (unit.status === 'not_started' || !cell || cell.taught === 0) {
              return {
                id,
                state: 'not_taught' as const,
                brightness: 'none' as const,
                label: `${name} — ${unit.name} not yet taught`,
              }
            }

            const rate = (100 * cell.mastered) / cell.taught
            return starOf(
              id,
              `${name} — ${cell.mastered} of ${cell.taught} standards in ${unit.name}`,
              cell.taught,
              rate,
              canOpenStudents ? `/student/${student.studentId}` : undefined,
            )
          }),
        })),
      }
    })
}

// --- Building and district ---------------------------------------------------

/** Grade, then subject, then one star per classroom. */
export function buildingSky(sections: SectionContext[]): StarGroup[] {
  const byGrade = new Map<string, SectionContext[]>()
  for (const section of sections) {
    const entry = byGrade.get(section.gradeLevel) ?? []
    entry.push(section)
    byGrade.set(section.gradeLevel, entry)
  }

  return [...byGrade.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
    .map(([grade, gradeSections]) => ({
      id: grade,
      label: gradeLabel(grade),
      meta: `${gradeSections.length} ${gradeSections.length === 1 ? 'classroom' : 'classrooms'}`,
      clusters: clusterBySubject(gradeSections),
    }))
}

/** Building, then grade, then one star per classroom. */
export function districtSky(
  sections: SectionContext[],
  schools: { schoolId: string; label: string }[],
): StarGroup[] {
  return schools
    .map((school) => {
      const own = sections.filter((section) => section.schoolId === school.schoolId)
      const byGrade = new Map<string, SectionContext[]>()
      for (const section of own) {
        const entry = byGrade.get(section.gradeLevel) ?? []
        entry.push(section)
        byGrade.set(section.gradeLevel, entry)
      }

      return {
        id: school.schoolId,
        label: school.label,
        meta: `${own.length} classrooms`,
        clusters: [...byGrade.entries()]
          .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
          .map(([grade, gradeSections]) => ({
            id: `${school.schoolId}-${grade}`,
            label: gradeLabel(grade),
            stars: sectionStars(gradeSections),
          })),
      }
    })
    .filter((group) => group.clusters.length > 0)
}

/**
 * A self-contained elementary class carries every subject, so it has no single
 * subject to cluster under. Grouping it as "All subjects" is truthful about what
 * the star actually measures — a whole day, not a period.
 */
function clusterBySubject(sections: SectionContext[]) {
  const bySubject = new Map<string, SectionContext[]>()
  for (const section of sections) {
    const key = section.subject === 'all' ? 'All subjects' : section.subject
    const entry = bySubject.get(key) ?? []
    entry.push(section)
    bySubject.set(key, entry)
  }

  return [...bySubject.entries()]
    .sort((a, b) => bySubjectOrder(a[0], b[0]))
    .map(([subject, subjectSections]) => ({
      id: subject,
      label: subject,
      stars: sectionStars(subjectSections),
    }))
}

function sectionStars(sections: SectionContext[]): Star[] {
  return [...sections]
    .sort((a, b) => a.sectionName.localeCompare(b.sectionName))
    .map((section) =>
      starOf(
        section.sectionId,
        `${section.sectionName} — ${percentLabel(section.masteryRate)} of ${section.standardsTaughtToDate} demonstrations`,
        section.standardsTaughtToDate,
        section.masteryRate,
        `/section/${section.sectionId}`,
      ),
    )
}

// --- Public ------------------------------------------------------------------

export interface PublicGradeCell extends AggregateCell {
  schoolId: string
  gradeLevel: string
}

/**
 * Subject, then building, then one star per grade.
 *
 * No classroom appears here and none is linkable, because neither audience on the
 * community route holds `view_student_names` and a classroom is a named teacher
 * with twenty named children behind it. What the coarser sky buys is the one
 * question the two ranked tables on that page cannot answer on their own — which
 * grades are strong in which subjects — because a table by grade and a table by
 * subject are two projections of a matrix, and this is the matrix.
 *
 * Suppressed cells are drawn, not dropped. A grade that vanishes from a row of
 * six is more identifying than a grade marked as withheld, and a reader who can
 * count is owed the acknowledgement that something is being withheld from them.
 */
export function publicSky(grades: PublicGradeCell[], schools: { schoolId: string; label: string }[]): StarGroup[] {
  const disclosed = discloseCells(grades, { totalIsPublished: true })
  const suppression = new Map(
    disclosed.map((entry) => [`${entry.cell.schoolId}-${entry.cell.gradeLevel}`, entry.suppressed]),
  )

  const subjects = new Set<string>()
  for (const grade of grades) for (const subject of Object.keys(grade.masteryBySubject)) subjects.add(subject)

  return [...subjects]
    .sort(bySubjectOrder)
    .map((subject) => ({
      id: subject,
      label: subject,
      meta: districtSubjectMeta(grades, subject),
      clusters: schools
        .map((school) => ({
          id: `${subject}-${school.schoolId}`,
          label: school.label,
          stars: grades
            .filter((grade) => grade.schoolId === school.schoolId)
            .sort((a, b) => a.gradeLevel.localeCompare(b.gradeLevel, undefined, { numeric: true }))
            .map((grade) => {
              const key = `${grade.schoolId}-${grade.gradeLevel}`
              const cell = grade.masteryBySubject[subject]
              const id = `${subject}-${key}`

              if (suppression.get(key)) {
                return {
                  id,
                  state: 'withheld' as const,
                  brightness: 'none' as const,
                  label: `${gradeLabel(grade.gradeLevel)} — withheld, too few students to publish`,
                }
              }

              return starOf(
                id,
                `${gradeLabel(grade.gradeLevel)} ${subject} — ${percentLabel(cell?.masteryRate ?? null)}`,
                cell?.standardsTaughtToDate ?? 0,
                cell?.masteryRate ?? null,
              )
            }),
        }))
        .filter((cluster) => cluster.stars.length > 0),
    }))
}

function districtSubjectMeta(grades: PublicGradeCell[], subject: string): string {
  let mastered = 0
  let taught = 0
  for (const grade of grades) {
    const cell = grade.masteryBySubject[subject]
    if (!cell) continue
    mastered += cell.standardsMastered
    taught += cell.standardsTaughtToDate
  }
  if (taught === 0) return 'not yet taught'
  return `${percentLabel((100 * mastered) / taught)} district-wide`
}
