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
  withinScope: (candidate: { studentId?: string; schoolId?: string; sectionId?: string }) => boolean
}

/**
 * A user can hold more than one assignment. The primary one is whichever appears
 * first, which is how the generator writes it.
 *
 * `withinScope` is not enforcement yet — Phase 2 uses it to shape views, and a
 * typed URL still reaches a student outside the viewer's scope. It is written here,
 * against the account's real `scopeIds`, so Phase 3 closes that gap in one place
 * rather than in every view.
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
    withinScope: ({ studentId, schoolId, sectionId }) =>
      user.roleAssignments.some((entry) => {
        switch (entry.scopeType) {
          case 'district':
            return true
          case 'public':
            return false
          case 'school':
            return schoolId !== undefined && entry.scopeIds.includes(schoolId)
          case 'section':
            return sectionId !== undefined && entry.scopeIds.includes(sectionId)
          case 'student':
            return studentId !== undefined && entry.scopeIds.includes(studentId)
          default:
            return false
        }
      }),
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
    case 'teacher':
    case 'special_education_teacher':
      return assignment.scopeIds[0] ? `/section/${assignment.scopeIds[0]}` : '/district'
    case 'counselor':
    case 'nurse':
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
