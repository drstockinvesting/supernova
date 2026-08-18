/**
 * Roles, permissions, and where each role's own dashboard lives.
 *
 * Kept apart from the provider so these can be imported without pulling a React
 * component along — and so editing a label does not force a full reload.
 */

import type { RoleAssignment, User } from '../types/supernova'

export type Role = RoleAssignment['role']
export type Permission = RoleAssignment['permissions'][number]

/** Ordered as the fractal is: innermost outward. The picker follows this order. */
export const ROLE_ORDER: Role[] = [
  'student',
  'guardian',
  'teacher',
  'special_education_teacher',
  'counselor',
  'nurse',
  'building_administrator',
  'district_administrator',
  'school_board_member',
  'community_member',
]

export const ROLE_LABELS: Record<Role, string> = {
  student: 'Student',
  guardian: 'Parent or guardian',
  teacher: 'Teacher',
  special_education_teacher: 'Special education teacher',
  counselor: 'Counselor',
  nurse: 'Nurse',
  building_administrator: 'Building administrator',
  district_administrator: 'District administrator',
  school_board_member: 'School board member',
  community_member: 'Community member',
}

export interface Session {
  user: User
  role: Role
  assignment: RoleAssignment
  can: (permission: Permission) => boolean
}

/**
 * A user can hold more than one assignment. The primary one is whichever appears
 * first, which is how the generator writes it.
 *
 * Phase 2 carried a `withinScope` predicate here, matching a candidate id against
 * `scopeIds` by `scopeType`. Phase 3 removed it rather than called it, because it
 * could not answer the question enforcement actually asks. A teacher's scope is
 * sections, so "is this student mine?" is a question about rosters — and a
 * synchronous predicate over `scopeIds` can only answer it by declaring every
 * student out of scope, which would have locked teachers out of their own
 * classes. Scope is resolved against the data in `scope.ts`, and the decision is
 * made in `access.ts`; `can` stays here because a permission list needs nothing
 * beyond the account itself.
 */
export function buildSession(user: User): Session {
  const assignment = user.roleAssignments[0]
  const permissions = new Set<string>(
    user.roleAssignments.flatMap((entry) => entry.permissions as string[]),
  )

  return {
    user,
    role: assignment.role,
    assignment,
    can: (permission) => permissions.has(permission),
  }
}

/** Where a role's own dashboard lives. */
export function homePathFor(session: Session): string {
  const { role, assignment } = session
  switch (role) {
    case 'student':
      return `/student/${assignment.scopeIds[0] ?? ''}`
    case 'guardian':
      return '/family'
    // Most teachers hold four or five sections. Landing on the first one would
    // silently drop the rest, so the teacher's home is the index over all of them.
    case 'teacher':
      return '/teacher'
    // A nurse, a counselor, and a special education teacher are all scoped to a
    // building and all hold named students, and their home is that list rather
    // than the building's rollups.
    //
    // For two of them this replaces a page they could not read. A nurse holds no
    // `view_aggregate_mastery`, so the building page was an unlit frame and an
    // explanation of what was missing. A special education teacher was worse off
    // and it did not show: their scope is a *building*, not sections, so the
    // teacher's classroom index refused them for holding no sections, redirected
    // them to their own home, and landed on the one branch in `Guard` that exists
    // to stop a redirect loop — an account with no dashboard it can open. That
    // was the honest report of a real gap. This is the gap being closed.
    case 'special_education_teacher':
    case 'counselor':
    case 'nurse':
      return assignment.scopeIds[0] ? `/caseload/${assignment.scopeIds[0]}` : '/district'
    case 'building_administrator':
      return assignment.scopeIds[0] ? `/school/${assignment.scopeIds[0]}` : '/district'
    case 'district_administrator':
      return '/district'
    case 'school_board_member':
    case 'community_member':
      return '/community'
    default:
      return '/community'
  }
}
