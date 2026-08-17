/**
 * Expanding an account's scope into the ids it actually covers.
 *
 * `RoleAssignment.scopeIds` is not a list of what an account can see; it is the
 * handle from which that list is derived, and the derivation differs per
 * `scopeType`. A guardian's student ids are already the answer. A teacher's
 * section ids are not: the question "may this teacher open this student" is a
 * question about rosters, and the rosters live in a different file.
 *
 * Which direction that resolution runs in is the whole point. The scope expanded
 * here is the **viewer's**, never the record's — a teacher's rosters are fetched
 * to find out who they teach, rather than a student's profile being read to find
 * out who teaches them. Reading the record to decide whether the record may be
 * read is how authorization checks quietly become no checks at all.
 *
 * Building and district accounts are expanded lazily by design. A district
 * administrator's scope is "everything", which is a flag rather than 1,102
 * student ids, and a building administrator's is answered by comparing the
 * target's `schoolId` against three. Only section scope needs real work, and a
 * teacher holds at most five sections.
 */

import type { RoleAssignment } from '../types/supernova'
import { loadSectionDetail } from '../data/client'
import type { ResolvedScope } from './access'
import type { Session } from './roles'

function idsOf(assignments: RoleAssignment[], scopeType: string): string[] {
  return assignments
    .filter((entry) => entry.scopeType === scopeType)
    .flatMap((entry) => entry.scopeIds)
}

export async function resolveScope(session: Session): Promise<ResolvedScope> {
  const assignments = session.user.roleAssignments

  const sectionIds = new Set(idsOf(assignments, 'section'))
  const studentIds = new Set(idsOf(assignments, 'student'))

  // `public` scope carries the district's school ids — it is the list of
  // buildings the community page aggregates, not a grant over them. Reading it
  // as school scope would hand every visitor three building dashboards.
  const schoolIds = new Set(idsOf(assignments, 'school'))

  const district = assignments.some((entry) => entry.scopeType === 'district')

  // A teacher's students are their rosters, and nothing else. Section details
  // are the same files the teacher's own classroom pages load, so this is warm
  // by the time it is used a second time.
  if (sectionIds.size > 0) {
    const rosters = await Promise.all(
      [...sectionIds].map((sectionId) =>
        loadSectionDetail(sectionId).then(
          (detail) => detail.roster.map((row) => row.studentId),
          // A section that cannot be loaded contributes no students. Failing
          // open here would grant exactly the access the file was meant to
          // establish; the classroom page reports the error on its own.
          () => [],
        ),
      ),
    )
    for (const roster of rosters) {
      for (const studentId of roster) studentIds.add(studentId)
    }
  }

  return { district, schoolIds, sectionIds, studentIds }
}
