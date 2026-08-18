/**
 * The access rules, exercised against the ten roles the district actually issues.
 *
 * These matter for the same reason the disclosure tests do: a broken rule here
 * is invisible on screen. A guard that wrongly allows shows a page that looks
 * exactly like a page the viewer was entitled to, and the only way to notice is
 * to sign in as the wrong person and try — once, by hand, for one of 2,101
 * accounts. The interesting cases are also the rare ones. Two roles hold scope
 * over a record they may not open, and one holds a permission over a record
 * outside its scope; neither appears on any screen anyone visits by habit.
 *
 * The permission sets below are copied from `generator/entities/access.py`, which
 * is the source of the ones in the dataset. If those drift, these tests are
 * asserting about a district that no longer exists — so `holds every permission
 * the generator issues` checks the vocabulary itself.
 *
 * Scope *expansion* — turning a teacher's four section ids into the roster of
 * students they cover — is `scope.ts` and fetches files, so it is not tested
 * here; these take the expanded scope as given and check what is decided from it.
 *
 * Run with `npm --prefix app test`.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { RoleAssignment, User } from '../types/supernova.ts'
import { buildSession, type Session } from './roles.ts'
import { EMPTY_SCOPE, decide, type ResolvedScope, type Target } from './access.ts'

type Permission = RoleAssignment['permissions'][number]
type Role = RoleAssignment['role']
type ScopeType = RoleAssignment['scopeType']

// --- Accounts, as the generator writes them ----------------------------------

const PERMISSIONS: Record<string, Permission[]> = {
  teacher: [
    'view_aggregate_mastery',
    'view_individual_students',
    'view_student_names',
    'view_attendance_detail',
    'view_behavior_detail',
    'view_evidence_artifacts',
    'record_mastery',
    'log_interruptions',
    'add_intervention_notes',
  ],
  building_administrator: [
    'view_aggregate_mastery',
    'view_individual_students',
    'view_student_names',
    'view_attendance_detail',
    'view_behavior_detail',
    'view_health_detail',
    'view_special_services_detail',
    'view_evidence_artifacts',
    'log_interruptions',
    'add_intervention_notes',
  ],
  district_administrator: [
    'view_aggregate_mastery',
    'view_individual_students',
    'view_student_names',
    'view_attendance_detail',
    'view_behavior_detail',
    'view_health_detail',
    'view_special_services_detail',
    'view_evidence_artifacts',
    'log_interruptions',
    'add_intervention_notes',
  ],
  nurse: [
    'view_individual_students',
    'view_student_names',
    'view_attendance_detail',
    'view_health_detail',
  ],
  counselor: [
    'view_aggregate_mastery',
    'view_individual_students',
    'view_student_names',
    'view_attendance_detail',
    'view_behavior_detail',
    'view_health_detail',
    'view_special_services_detail',
    'add_intervention_notes',
  ],
  // Scoped to a *building*, not to sections — the one thing about this role that
  // is easy to assume wrong, and the reason it had no dashboard until Phase 6.
  special_education_teacher: [
    'view_aggregate_mastery',
    'view_individual_students',
    'view_student_names',
    'view_attendance_detail',
    'view_behavior_detail',
    'view_special_services_detail',
    'view_evidence_artifacts',
    'record_mastery',
    'add_intervention_notes',
  ],
  school_board_member: ['view_aggregate_mastery'],
  community_member: ['view_aggregate_mastery'],
  guardian: [
    'view_individual_students',
    'view_student_names',
    'view_attendance_detail',
    'view_evidence_artifacts',
  ],
  // Phase 3 added view_attendance_detail: a student's scope is themselves, so
  // this is the right to read one's own attendance.
  student: ['view_individual_students', 'view_attendance_detail', 'view_evidence_artifacts'],
}

function account(
  role: Role,
  scopeType: ScopeType,
  scopeIds: string[],
  principalType: User['principalType'] = 'staff',
): Session {
  return buildSession({
    id: `usr-${role}`,
    username: role,
    displayName: role,
    principalType,
    principalId: `${role}-1`,
    accountStatus: 'active',
    roleAssignments: [
      {
        id: `ra-${role}`,
        userId: `usr-${role}`,
        role,
        scopeType,
        scopeIds,
        permissions: PERMISSIONS[role],
      },
    ],
  })
}

function scope(partial: Partial<Record<'schoolIds' | 'sectionIds' | 'studentIds', string[]>> & {
  district?: boolean
}): ResolvedScope {
  return {
    district: partial.district ?? false,
    schoolIds: new Set(partial.schoolIds ?? []),
    sectionIds: new Set(partial.sectionIds ?? []),
    studentIds: new Set(partial.studentIds ?? []),
  }
}

const student = (studentId: string, schoolId: string | null): Target => ({
  kind: 'student',
  studentId,
  schoolId,
})
const section = (sectionId: string, schoolId: string | null): Target => ({
  kind: 'section',
  sectionId,
  schoolId,
})
const school = (schoolId: string): Target => ({ kind: 'school', schoolId })
const caseload = (schoolId: string): Target => ({ kind: 'caseload', schoolId })

function allows(session: Session, resolved: ResolvedScope, target: Target): boolean {
  return decide(session, resolved, target).allowed
}

function refusalReason(session: Session, resolved: ResolvedScope, target: Target): string {
  const decision = decide(session, resolved, target)
  assert.equal(decision.allowed, false, 'expected this request to be refused')
  return decision.allowed ? '' : decision.reason
}

// --- Guardians and students: scope is a list of children ---------------------

test('a guardian opens the child they hold rights over, and not the one they do not', () => {
  const session = account('guardian', 'student', ['stu-a'], 'guardian')
  const resolved = scope({ studentIds: ['stu-a'] })

  assert.equal(allows(session, resolved, student('stu-a', 'nova-elementary')), true)
  assert.equal(allows(session, resolved, student('stu-b', 'nova-elementary')), false)
})

test("a guardian cannot reach their child's classroom, building, or district", () => {
  const session = account('guardian', 'student', ['stu-a'], 'guardian')
  const resolved = scope({ studentIds: ['stu-a'] })

  // The roster would name other people's children, and the building rankings
  // name staff. Sharing a building with a child is not scope over it.
  assert.equal(allows(session, resolved, section('sec-1', 'nova-elementary')), false)
  assert.equal(allows(session, resolved, school('nova-elementary')), false)
  assert.equal(allows(session, resolved, { kind: 'district' }), false)
})

test('a guardian holding rights over nobody still reaches the family view', () => {
  // 60 of the district's guardians are linked without educational rights. The
  // page tells them so; refusing the route would leave them nowhere to land.
  const session = account('guardian', 'student', [], 'guardian')
  assert.equal(allows(session, EMPTY_SCOPE, { kind: 'family' }), true)
  assert.equal(allows(session, EMPTY_SCOPE, student('stu-a', 'nova-elementary')), false)
})

test('a student opens their own profile and no classmate', () => {
  const session = account('student', 'student', ['stu-a'], 'student')
  const resolved = scope({ studentIds: ['stu-a'] })

  assert.equal(allows(session, resolved, student('stu-a', 'meridian-middle')), true)
  assert.equal(allows(session, resolved, student('stu-b', 'meridian-middle')), false)
})

test('the family view is a kind of account, not a permission', () => {
  // A district administrator outranks a guardian everywhere and still has no
  // children to show, so the refusal is about shape rather than about scope.
  const admin = account('district_administrator', 'district', ['district-1'])
  assert.equal(refusalReason(admin, scope({ district: true }), { kind: 'family' }), 'shape')
})

// --- Teachers: scope is sections, and students come from rosters -------------

test('a teacher opens a student on their roster and not one in the next classroom', () => {
  const session = account('teacher', 'section', ['sec-1', 'sec-2'])
  // As `resolveScope` expands it: the teacher's own sections, and the union of
  // their rosters.
  const resolved = scope({ sectionIds: ['sec-1', 'sec-2'], studentIds: ['stu-a', 'stu-b'] })

  assert.equal(allows(session, resolved, student('stu-a', 'meridian-middle')), true)
  assert.equal(allows(session, resolved, student('stu-c', 'meridian-middle')), false)
})

test("a teacher opens their own classrooms and not a colleague's", () => {
  const session = account('teacher', 'section', ['sec-1'])
  const resolved = scope({ sectionIds: ['sec-1'], studentIds: ['stu-a'] })

  assert.equal(allows(session, resolved, section('sec-1', 'meridian-middle')), true)
  assert.equal(allows(session, resolved, section('sec-9', 'meridian-middle')), false)
})

test('teaching in a building is not scope over the building', () => {
  // The building page ranks every teacher in it by their students' mastery.
  // Nothing in a teacher's assignment grants that, and a section scope that
  // widened to its own school would grant it to all 72 of them.
  const session = account('teacher', 'section', ['sec-1'])
  const resolved = scope({ sectionIds: ['sec-1'], studentIds: ['stu-a'] })

  assert.equal(refusalReason(session, resolved, school('meridian-middle')), 'scope')
  assert.equal(refusalReason(session, resolved, { kind: 'district' }), 'scope')
})

test('an account with no sections has no classroom index', () => {
  const nurse = account('nurse', 'school', ['nova-elementary'])
  assert.equal(refusalReason(nurse, scope({ schoolIds: ['nova-elementary'] }), { kind: 'classrooms' }), 'shape')
})

// --- Building accounts: scope is a building, and students come with it -------

test('a building administrator opens any student in their building and none outside it', () => {
  const session = account('building_administrator', 'school', ['nova-elementary'])
  const resolved = scope({ schoolIds: ['nova-elementary'] })

  // Students are never expanded one by one for a building account; the target's
  // own school is what places it.
  assert.equal(allows(session, resolved, student('stu-a', 'nova-elementary')), true)
  assert.equal(allows(session, resolved, student('stu-b', 'meridian-middle')), false)
  assert.equal(allows(session, resolved, section('sec-1', 'nova-elementary')), true)
  assert.equal(allows(session, resolved, section('sec-9', 'constellation-high')), false)
  assert.equal(allows(session, resolved, school('nova-elementary')), true)
  assert.equal(allows(session, resolved, school('constellation-high')), false)
})

test('a building administrator cannot open the district above them', () => {
  const session = account('building_administrator', 'school', ['nova-elementary'])
  assert.equal(
    refusalReason(session, scope({ schoolIds: ['nova-elementary'] }), { kind: 'district' }),
    'scope',
  )
})

test('a nurse holds their building but not what the building page is made of', () => {
  // The mirror image of the board member below: scope without the capability.
  // A nurse has named students, attendance, and health at their school, and no
  // aggregate mastery — so the classroom analytics page is refused on the
  // permission, not on the scope.
  const session = account('nurse', 'school', ['nova-elementary'])
  const resolved = scope({ schoolIds: ['nova-elementary'] })

  assert.equal(allows(session, resolved, student('stu-a', 'nova-elementary')), true)
  assert.equal(refusalReason(session, resolved, section('sec-1', 'nova-elementary')), 'permission')
})

// --- District scope without the permissions ----------------------------------

test('a board member has every id in scope and may open nothing but the public page', () => {
  // This is the case Phase 2 left open and the reason enforcement cannot be a
  // scope check alone: a board member's scope is the district, so every id in
  // it is inside their scope. Only the permission set keeps them out, and every
  // refusal here is therefore a permission refusal.
  const session = account('school_board_member', 'district', ['district-1'])
  const resolved = scope({ district: true })

  assert.equal(allows(session, resolved, { kind: 'public' }), true)
  assert.equal(refusalReason(session, resolved, student('stu-a', 'nova-elementary')), 'permission')
  assert.equal(refusalReason(session, resolved, section('sec-1', 'nova-elementary')), 'permission')
  assert.equal(refusalReason(session, resolved, school('nova-elementary')), 'permission')
  assert.equal(refusalReason(session, resolved, { kind: 'district' }), 'permission')
})

test('a community member reaches the public page and nothing else', () => {
  // `public` scope carries the district's three school ids. They are the
  // buildings the page aggregates, not a grant over them.
  const session = account('community_member', 'public', [
    'nova-elementary',
    'meridian-middle',
    'constellation-high',
  ], 'community_member')

  assert.equal(allows(session, EMPTY_SCOPE, { kind: 'public' }), true)
  assert.equal(refusalReason(session, EMPTY_SCOPE, school('nova-elementary')), 'scope')
  assert.equal(refusalReason(session, EMPTY_SCOPE, student('stu-a', 'nova-elementary')), 'scope')
})

test('a district administrator opens every layer', () => {
  const session = account('district_administrator', 'district', ['district-1'])
  const resolved = scope({ district: true })

  assert.equal(allows(session, resolved, student('stu-a', 'constellation-high')), true)
  assert.equal(allows(session, resolved, section('sec-9', 'constellation-high')), true)
  assert.equal(allows(session, resolved, school('constellation-high')), true)
  assert.equal(allows(session, resolved, { kind: 'district' }), true)
  assert.equal(allows(session, resolved, { kind: 'public' }), true)
})

// --- Ids that resolve to nothing ---------------------------------------------

test('an id that resolves to no building is refused rather than assumed harmless', () => {
  // A typed id that is not in the index has no coordinates, so containment
  // cannot be established. Refusing is also what stops the boundary from
  // answering "does this id exist?" differently from "is it yours?".
  const session = account('building_administrator', 'school', ['nova-elementary'])
  const resolved = scope({ schoolIds: ['nova-elementary'] })

  assert.equal(allows(session, resolved, student('stu-nonexistent', null)), false)
  assert.equal(allows(session, resolved, section('sec-nonexistent', null)), false)
  assert.equal(allows(session, resolved, school('no-such-school')), false)
})

test('district scope covers an unresolved id, and the view reports it missing', () => {
  // Nothing is out of a district account's scope, including a mistyped id, so
  // the refusal would be false. The page behind the guard says it cannot find
  // it, which is the accurate answer rather than a redirect home.
  const session = account('district_administrator', 'district', ['district-1'])
  assert.equal(allows(session, scope({ district: true }), student('stu-nonexistent', null)), true)
})

// --- The public page ----------------------------------------------------------

test('every account reaches the public page, including one holding nothing', () => {
  const empty = buildSession({
    id: 'usr-empty',
    username: 'empty',
    displayName: 'empty',
    principalType: 'community_member',
    accountStatus: 'active',
    roleAssignments: [
      { id: 'ra-empty', userId: 'usr-empty', role: 'community_member', scopeType: 'public', scopeIds: [], permissions: [] },
    ],
  })
  assert.equal(allows(empty, EMPTY_SCOPE, { kind: 'public' }), true)
})

// --- The caseload: the same scope, the opposite permissions --------------------

test('a nurse opens their building\'s caseload, and the building page differently', () => {
  const session = account('nurse', 'school', ['nova-elementary'])
  const resolved = scope({ schoolIds: ['nova-elementary'] })

  assert.equal(allows(session, resolved, caseload('nova-elementary')), true)

  // The building route is open to them as well, and that is not an oversight:
  // it requires `view_student_names`, which a nurse holds. What they lack is
  // `view_aggregate_mastery` — every rollup, comparison, and classroom card on
  // that page — which is what the page is *made of* rather than what the route
  // asks for, so `SchoolView` renders it as an unlit sky. The caseload is the
  // opposite arrangement: nothing on it needs the permission they do not hold.
  assert.equal(allows(session, resolved, school('nova-elementary')), true)
  assert.equal(session.can('view_aggregate_mastery'), false)
  assert.equal(session.can('view_individual_students'), true)
})

test('a nurse cannot open another building\'s caseload', () => {
  const session = account('nurse', 'school', ['nova-elementary'])
  const resolved = scope({ schoolIds: ['nova-elementary'] })

  assert.equal(refusalReason(session, resolved, caseload('meridian-middle')), 'scope')
  assert.equal(refusalReason(session, resolved, caseload('')), 'scope')
})

test('a counselor and a special education teacher reach the caseload of their building', () => {
  for (const role of ['counselor', 'special_education_teacher'] as const) {
    const session = account(role, 'school', ['meridian-middle'])
    const resolved = scope({ schoolIds: ['meridian-middle'] })
    assert.equal(allows(session, resolved, caseload('meridian-middle')), true, role)
    assert.equal(allows(session, resolved, caseload('nova-elementary')), false, role)
  }
})

test('a board member holds every id in the district and no caseload', () => {
  // The mirror of the nurse, and the reason the caseload requires two permissions
  // rather than trusting scope: district scope contains every building.
  const session = account('school_board_member', 'district', ['district-1'])
  const resolved = scope({ district: true })

  assert.equal(refusalReason(session, resolved, caseload('nova-elementary')), 'permission')
})

test('a teacher teaching in a building has no caseload there', () => {
  // A teacher holds sections, and four classes at Meridian is not scope over
  // Meridian. They hold the permissions the caseload asks for and fail on scope,
  // which is the third combination and the one a role check would get wrong.
  const session = account('teacher', 'section', ['sec-1', 'sec-2'])
  const resolved = scope({ sectionIds: ['sec-1', 'sec-2'], studentIds: ['stu-a'] })

  assert.equal(refusalReason(session, resolved, caseload('meridian-middle')), 'scope')
})

test('a guardian and a student reach no caseload at all', () => {
  const guardian = account('guardian', 'student', ['stu-a'], 'guardian')
  const learner = account('student', 'student', ['stu-a'], 'student')
  const resolved = scope({ studentIds: ['stu-a'] })

  assert.equal(allows(guardian, resolved, caseload('nova-elementary')), false)
  assert.equal(allows(learner, resolved, caseload('nova-elementary')), false)
})

// --- The permission vocabulary -------------------------------------------------

test('the fixtures name only permissions the schema issues', () => {
  // Guards against a rule written against a permission that does not exist,
  // which would deny silently and forever: `can` on a misspelling is always
  // false, and no view would look any different.
  const vocabulary = new Set<string>([
    'view_aggregate_mastery',
    'view_individual_students',
    'view_student_names',
    'view_attendance_detail',
    'view_behavior_detail',
    'view_health_detail',
    'view_special_services_detail',
    'view_evidence_artifacts',
    'record_mastery',
    'log_interruptions',
    'add_intervention_notes',
  ])
  for (const [role, permissions] of Object.entries(PERMISSIONS)) {
    for (const permission of permissions) {
      assert.equal(vocabulary.has(permission), true, `${role} names an unknown permission: ${permission}`)
    }
  }
})
