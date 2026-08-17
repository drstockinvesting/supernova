/**
 * What an account may open, as a pure decision.
 *
 * Through Phase 2 permissions *shaped* views without enforcing them: a page
 * rendered only what the viewer's scope contained, but a typed address still
 * reached a student, a classroom, or a building outside it. This module is where
 * that closes. It holds no React, performs no fetch, and reads no route — it
 * takes an account, the concrete scope that account resolves to, and the thing
 * being asked for, and returns yes or no. That is deliberate: an authorization
 * rule that can only be exercised by clicking through a browser is a rule nobody
 * will check again.
 *
 * Two ideas do the work.
 *
 * **A role is a permission set; a scope is a set of ids.** Both have to agree.
 * A school board member holds `district` scope, so every id in the district is
 * inside their scope — and holds only `view_aggregate_mastery`, so no page that
 * names a student or a teacher is open to them. A nurse is the mirror image:
 * named students at their building, and no aggregate. Neither can be expressed
 * as a role check, which is why there isn't one anywhere in this file.
 *
 * **Containment is established, never assumed.** A teacher's scope is sections,
 * so whether a student is inside it is a question about that teacher's rosters —
 * answered in `scope.ts` by expanding the *viewer's* scope, never by reading the
 * record being asked for. When coordinates cannot be resolved at all, the answer
 * is no. An unknown id is not evidence of anything.
 */

import type { Permission, Session } from './roles'

/** The concrete ids an account's assignments expand to. See `scope.ts`. */
export interface ResolvedScope {
  /** District scope: every building, section, and student in the district. */
  district: boolean
  schoolIds: ReadonlySet<string>
  sectionIds: ReadonlySet<string>
  /**
   * Students reachable directly — a guardian's children, a student themselves,
   * a teacher's rosters. School-scoped accounts are not expanded student by
   * student; they are covered by `schoolIds` against the student's building.
   */
  studentIds: ReadonlySet<string>
}

export const EMPTY_SCOPE: ResolvedScope = {
  district: false,
  schoolIds: new Set(),
  sectionIds: new Set(),
  studentIds: new Set(),
}

/**
 * What is being asked for, with the coordinates needed to place it.
 *
 * `schoolId` is nullable because a route parameter can name something that does
 * not exist. That is a distinct case from "exists and is outside scope", and it
 * resolves the same way for the same reason: containment is not established.
 */
export type Target =
  | { kind: 'student'; studentId: string; schoolId: string | null }
  | { kind: 'section'; sectionId: string; schoolId: string | null }
  | { kind: 'school'; schoolId: string }
  | { kind: 'district' }
  /** A teacher's index of their own classrooms. */
  | { kind: 'classrooms' }
  /** A guardian's own children. */
  | { kind: 'family' }
  /** The public page. Open to everyone, including accounts that hold nothing. */
  | { kind: 'public' }

export type DenialReason =
  /** The account holds the permission but not the record. */
  | 'scope'
  /** The record is inside the account's scope, but the page needs a capability it lacks. */
  | 'permission'
  /** The page belongs to a kind of account this one is not. */
  | 'shape'

export type Decision = { allowed: true } | { allowed: false; reason: DenialReason }

const ALLOW: Decision = { allowed: true }
const deny = (reason: DenialReason): Decision => ({ allowed: false, reason })

/**
 * The permissions each page requires, named where they are decided rather than
 * inline, so the table can be read as a table.
 *
 * A classroom and a building both print staff and student names, so both require
 * `view_student_names` — that single requirement is what keeps a board member,
 * who has district scope over every id in the district, out of a page ranking
 * named teachers. The district view requires it for the same reason.
 */
const REQUIRED: Record<'student' | 'section' | 'school' | 'district', Permission[]> = {
  student: ['view_individual_students'],
  section: ['view_aggregate_mastery', 'view_student_names'],
  school: ['view_student_names'],
  district: ['view_student_names'],
}

function holdsAll(session: Session, permissions: Permission[]): boolean {
  return permissions.every((permission) => session.can(permission))
}

export function decide(session: Session, scope: ResolvedScope, target: Target): Decision {
  switch (target.kind) {
    // The public page is the one surface with no scope at all behind it. Every
    // account may read it, including the ones that may read nothing else.
    case 'public':
      return ALLOW

    // A family view is not a permission, it is a kind of account: it renders the
    // children of the guardian record backing the session. A school account with
    // far broader rights still has no children to show here.
    case 'family':
      return session.user.principalType === 'guardian' ? ALLOW : deny('shape')

    // Likewise the teacher's index, which is the account's own section list.
    case 'classrooms':
      return scope.sectionIds.size > 0 ? ALLOW : deny('shape')

    case 'district':
      if (!scope.district) return deny('scope')
      return holdsAll(session, REQUIRED.district) ? ALLOW : deny('permission')

    case 'school':
      if (!containsSchool(scope, target.schoolId)) return deny('scope')
      return holdsAll(session, REQUIRED.school) ? ALLOW : deny('permission')

    case 'section':
      if (!containsSection(scope, target)) return deny('scope')
      return holdsAll(session, REQUIRED.section) ? ALLOW : deny('permission')

    case 'student':
      if (!containsStudent(scope, target)) return deny('scope')
      return holdsAll(session, REQUIRED.student) ? ALLOW : deny('permission')

    default:
      return deny('scope')
  }
}

// --- Containment -------------------------------------------------------------

export function containsSchool(scope: ResolvedScope, schoolId: string | null): boolean {
  if (scope.district) return true
  return schoolId !== null && scope.schoolIds.has(schoolId)
}

/**
 * A section is in scope when the account teaches it, or when the account covers
 * the building it sits in. A teacher's own `schoolIds` is deliberately empty —
 * teaching four classes at Meridian is not scope over Meridian — so the second
 * clause only ever fires for building and district accounts.
 */
export function containsSection(
  scope: ResolvedScope,
  section: { sectionId: string; schoolId: string | null },
): boolean {
  if (scope.district) return true
  if (scope.sectionIds.has(section.sectionId)) return true
  return containsSchool(scope, section.schoolId)
}

/**
 * A student is in scope when the account is linked to them directly — their own
 * account, a guardian holding educational rights, a teacher whose roster they
 * are on — or when the account covers their building.
 */
export function containsStudent(
  scope: ResolvedScope,
  student: { studentId: string; schoolId: string | null },
): boolean {
  if (scope.district) return true
  if (scope.studentIds.has(student.studentId)) return true
  return containsSchool(scope, student.schoolId)
}

// --- What the viewer is told --------------------------------------------------

/**
 * The one line shown after a redirect.
 *
 * The addendum's integrity rule is that permission boundaries are invisible
 * rather than blocked: no page in Supernova offers a link out of the viewer's
 * scope, so this is never reached by clicking. It is reached by typing an
 * address, and a redirect with nothing said would be indistinguishable from a
 * broken link. So the account is put back on its own dashboard and told once,
 * without accusation, that the address was not part of its view. The rule that
 * survives is the one that matters — no affordance, no ranked list of what is
 * being withheld, no confirmation that the id existed.
 */
export function denialMessage(reason: DenialReason): string {
  switch (reason) {
    case 'permission':
      return 'That page needs a permission this account does not hold, so this is your view instead.'
    case 'shape':
      return 'That page belongs to a different kind of account, so this is your view instead.'
    case 'scope':
    default:
      return 'That page is outside what this account covers, so this is your view instead.'
  }
}
