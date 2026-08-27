/**
 * The route boundary.
 *
 * Every route in `App.tsx` passes through here, which is the point: enforcement
 * that lives in the views is enforcement that is missing from whichever view was
 * written last. The decision itself is in `access.ts` and holds no React; this
 * component only resolves what the address is asking for, asks, and acts.
 *
 * A refused request is redirected to the account's own dashboard rather than
 * stopped on a wall. The addendum's rule — boundaries are invisible, not blocked
 * — is written about a UI that offers no link out of scope, and that remains
 * true; nothing here is reachable by clicking. What it did not cover is a typed
 * address, and a silent redirect there is indistinguishable from a bug. So the
 * viewer lands where they belong and is told once, in a line, without being told
 * what was on the other side.
 *
 * Told once, and only if they asked. The same redirect fires when the account
 * changes underneath a route the viewer is already on — the switcher re-renders
 * this guard under the new session before its own navigation lands — and there
 * the refusal is real but unrequested. A line that explains a refusal nobody
 * asked for spends the credibility of the one that explains a real one, so that
 * case redirects in silence. See `switching.ts`.
 */

import { useEffect, useRef, type ReactNode } from 'react'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { loadSectionContextIndex, loadStudentIndex } from '../data/client'
import { useAsync } from '../data/useAsync'
import { Loading, Notice } from '../ui/primitives'
import { decide, denialMessage, type DenialReason, type Target } from './access'
import { homePathFor } from './roles'
import { resolveScope } from './scope'
import { useSession } from './session'
import { isInheritedRefusal, type Landing } from './switching'

export type RouteKind = Target['kind']

/** Carried on the redirect so the landing page can say what happened, once. */
interface DeniedState {
  denied: DenialReason
}

export function Guard({ route, children }: { route: RouteKind; children: ReactNode }) {
  const { session, loading } = useSession()
  const params = useParams()
  const location = useLocation()

  // A refusal is explained only to the viewer who asked for it. Switching
  // accounts renders this route under the new session while the address is still
  // the old one, and the guard refuses it — correctly, and for a page the new
  // account never requested. `isInheritedRefusal` separates that from a typed
  // address, by comparing where this route last *acted* against where it stands
  // now.
  const here: Landing = { pathname: location.pathname, userId: session?.user.id ?? null }
  const settled = useRef<Landing>(here)
  const inherited = isInheritedRefusal(settled.current, here)

  // Who is asking for what, as one value. Both halves of the decision are
  // fetched, and a decision assembled from a resolved half and an unresolved one
  // is not a decision — so the whole check is keyed, and a result stamped with a
  // different key is discarded rather than used.
  //
  // This is not hypothetical tidiness. An async result held in state survives one
  // render past the change that invalidated it: switching accounts renders the
  // new session against the *previous* account's scope before the effect reruns.
  // Between a district administrator and a guardian that render allows a student
  // profile the guardian may not see, which is the exact failure this file
  // exists to prevent.
  const key = [
    route,
    params.studentId ?? '',
    params.sectionId ?? '',
    params.schoolId ?? '',
    session?.user.id ?? '',
  ].join('|')

  const checkState = useAsync(async () => {
    if (!session) return null
    const [scope, target] = await Promise.all([
      resolveScope(session),
      resolveTarget(route, params),
    ])
    return { key, decision: decide(session, scope, target) }
  }, [key])

  const check = checkState.value
  const decided = check?.key === key

  // Only a decision settles this route. Updating on every render would move the
  // mark during the loading pass that a switch itself causes — the ref would
  // already agree with the new account by the time the refusal arrived, and the
  // comparison above would have nothing left to notice.
  useEffect(() => {
    if (decided) settled.current = { pathname: location.pathname, userId: session?.user.id ?? null }
  }, [decided, location.pathname, session?.user.id])

  if (loading || !session || !check || !decided) {
    return (
      <div className="page">
        <Loading what="your view" />
      </div>
    )
  }

  const { decision } = check
  if (decision.allowed) return <>{children}</>

  // A role whose own dashboard is refused would redirect to itself forever. That
  // should be unreachable — every role's home is a page its own permissions
  // open — but "should be" is how loops happen, so the case is handled rather
  // than assumed away.
  const home = homePathFor(session)
  if (home === location.pathname) {
    return (
      <div className="page stack">
        <Notice tone="caution">
          <strong>This account has no dashboard it can open.</strong>{' '}
          {denialMessage(decision.reason)} That is a gap in how the account is configured, not a
          choice this page is making — its role and scope are recorded in the district's user
          directory.
        </Notice>
      </div>
    )
  }

  // The picker is already sending them here, so this redirect only agrees with
  // it; what it must not do is stamp the arrival with a refusal they never asked
  // for. Same destination either way.
  if (inherited) return <Navigate to={home} replace />

  return <Navigate to={home} replace state={{ denied: decision.reason } satisfies DeniedState} />
}

/**
 * Shown once on the page a refused request lands on. Route state lives on the
 * history entry, so it clears as soon as the viewer navigates anywhere — the
 * notice explains a redirect that just happened rather than becoming a banner
 * the account carries around.
 *
 * Phase 4 gave it a shape of its own, because a generic `Notice` was the wrong
 * one. It read as a note *about the page* — the same object as "no year-over-year
 * trend is shown" three sections down — when what it actually is is the system's
 * answer to something the viewer just did. So it sits tight under the header
 * rather than in the page's flow, and arrives with a short movement, which is the
 * only thing on screen that distinguishes "this happened just now" from "this was
 * always here". It stays deliberately quiet: no alarm colour, no icon shouting
 * refusal. Nothing went wrong, and nothing about the far side is disclosed.
 */
export function ScopeNotice() {
  const location = useLocation()
  const state = location.state as Partial<DeniedState> | null
  if (!state?.denied) return null

  return (
    <div className="scope-notice" role="status">
      <div className="scope-notice-inner">
        <span className="scope-notice-glyph" aria-hidden>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
            <circle cx="5" cy="8" r="2.4" fill="currentColor" opacity="0.75" />
            <path
              d="M10.5 2.5v11"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeDasharray="2 2"
              opacity="0.6"
            />
          </svg>
        </span>
        <p>{denialMessage(state.denied)}</p>
      </div>
    </div>
  )
}

/**
 * Where the address points, in the coordinates `decide` reasons about.
 *
 * Both lookups are indexes the view behind the guard loads anyway, so a
 * permitted request pays nothing for having been checked. An id absent from the
 * index resolves to a null building, which is refused for anyone without
 * district scope — the same answer as out-of-scope, and deliberately so, since
 * distinguishing the two would confirm which ids exist.
 */
async function resolveTarget(
  route: RouteKind,
  params: Readonly<Record<string, string | undefined>>,
): Promise<Target> {
  switch (route) {
    case 'student': {
      const studentId = params.studentId ?? ''
      const students = await loadStudentIndex()
      return { kind: 'student', studentId, schoolId: students.get(studentId)?.schoolId ?? null }
    }
    case 'section': {
      const sectionId = params.sectionId ?? ''
      const sections = await loadSectionContextIndex()
      return { kind: 'section', sectionId, schoolId: sections.get(sectionId)?.schoolId ?? null }
    }
    case 'school':
      return { kind: 'school', schoolId: params.schoolId ?? '' }
    case 'caseload':
      return { kind: 'caseload', schoolId: params.schoolId ?? '' }
    default:
      return { kind: route }
  }
}
