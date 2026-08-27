/**
 * Which refusals get explained.
 *
 * The bug this guards against is not a wrong decision — the guard was refusing
 * `/teacher` to a district administrator correctly. It was a wrong *account* of
 * that decision: the viewer had picked their own name from the switcher, and the
 * page they landed on told them a page they never asked for belonged to a
 * different kind of account. A refusal line that fires when nothing was refused
 * to the viewer is worse than no line, because the line's whole value is that it
 * means something the one time it appears.
 *
 * Run with `npm --prefix app test`.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isInheritedRefusal, type Landing } from './switching.ts'

const at = (pathname: string, userId: string | null): Landing => ({ pathname, userId })

test('an account switch under a stationary address is inherited', () => {
  // The case from the report: a teacher on their classroom index picks a
  // district administrator, and that route re-renders under the new account
  // before the picker's navigation lands.
  assert.equal(isInheritedRefusal(at('/teacher', 'usr-teacher'), at('/teacher', 'usr-admin')), true)
})

test('a typed address under one account is not inherited', () => {
  // A student typing another student's URL. Nothing moved but the address, and
  // this is exactly the refusal the notice exists to explain.
  assert.equal(
    isInheritedRefusal(at('/student/stu-a', 'usr-student'), at('/student/stu-b', 'usr-student')),
    false,
  )
})

test('standing still as the same account is not inherited', () => {
  assert.equal(isInheritedRefusal(at('/district', 'usr-admin'), at('/district', 'usr-admin')), false)
})

test('an address the new account navigated to is not inherited', () => {
  // Both halves moved, so the new account asked for this one and may be told.
  assert.equal(isInheritedRefusal(at('/teacher', 'usr-teacher'), at('/district', 'usr-admin')), false)
})

test('signing in on first load is not a switch, so a cold-load refusal is narrated', () => {
  // The opposite of a switch, and the case that matters most. On a cold load the
  // guard renders once with no account at all, and the address it is standing on
  // is the one the viewer typed. Reading `null -> someone` as a switch would go
  // silent on exactly the refusal the notice exists for.
  assert.equal(isInheritedRefusal(at('/district', null), at('/district', 'usr-student')), false)
})

test('signing out is not a switch either', () => {
  assert.equal(isInheritedRefusal(at('/district', 'usr-admin'), at('/district', null)), false)
})

test('the comparison is on identity, not on role or shape of the path', () => {
  // Two accounts of the same role are still a switch; one account is still one
  // account however the path is spelled.
  assert.equal(isInheritedRefusal(at('/school/a', 'usr-admin-1'), at('/school/a', 'usr-admin-2')), true)
  assert.equal(isInheritedRefusal(at('/school/a', 'usr-admin'), at('/school/A', 'usr-admin')), false)
})
