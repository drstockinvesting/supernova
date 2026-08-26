/**
 * Telling a refusal the viewer asked for from one they inherited.
 *
 * `Guard` redirects a refused address to the viewer's own dashboard and stamps
 * the redirect so the landing page can explain it. That explanation is only
 * honest when the viewer actually asked for the address. Switching accounts is
 * the case where they did not: the route the viewer is leaving re-renders under
 * the new session before the picker's own navigation lands, and the guard
 * refuses it correctly — a district administrator holds no sections, so
 * `/teacher` is genuinely not theirs — but nobody requested that page as that
 * account. Picking your own name from the switcher is not a request for the page
 * you happened to be standing on.
 *
 * So the two are distinguished by what moved. A refusal is narrated when the
 * address and the account arrived together, and passed over in silence when the
 * account changed underneath an address that stayed put.
 *
 * Kept out of `Guard.tsx` because it holds no React and the file it serves is the
 * one place in the app where a wrong answer is invisible on screen — the same
 * reason `access.ts` is a separate module from the component that calls it.
 */

/** The address and the account current when a route last settled. */
export interface Landing {
  pathname: string
  userId: string | null
}

/**
 * Whether a refusal is a consequence of the account changing beneath a
 * stationary address, rather than of the address having been asked for.
 *
 * Every clause is load-bearing. The address must not have moved, or the new
 * account navigated here itself and may be told why it bounced. Both accounts
 * must be real: `null -> someone` is the app signing in on first load, and the
 * address it lands on is the one the viewer typed, so a refusal there is theirs
 * and must be explained — this is the cold-load case, and reading it as a switch
 * would silence the exact refusal the notice was built for. And the two must
 * actually differ, or nothing changed at all.
 */
export function isInheritedRefusal(before: Landing, now: Landing): boolean {
  return (
    before.pathname === now.pathname &&
    before.userId !== null &&
    now.userId !== null &&
    before.userId !== now.userId
  )
}
