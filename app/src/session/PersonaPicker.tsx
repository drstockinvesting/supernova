/**
 * Sign in as any account in the district.
 *
 * A prototype affordance, not a product feature — there is no password here and
 * Phase 3 will replace it with real authentication. What it does buy is that every
 * view is exercised through an account the dataset actually contains, with that
 * account's real scope and permissions, rather than through a hard-coded "pretend
 * you are an admin" flag.
 */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from '../types/supernova'
import { useSession } from './session'
import { ROLE_LABELS, ROLE_ORDER, buildSession, homePathFor, type Role } from './roles'

function roleOf(user: User): Role | undefined {
  return user.roleAssignments[0]?.role
}

export function PersonaPicker() {
  const { session, users, signInAs } = useSession()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState<Role>('student')
  const [query, setQuery] = useState('')

  const byRole = useMemo(() => {
    const groups = new Map<Role, User[]>()
    for (const user of users) {
      const key = roleOf(user)
      if (!key) continue
      const bucket = groups.get(key)
      if (bucket) bucket.push(user)
      else groups.set(key, [user])
    }
    return groups
  }, [users])

  const candidates = useMemo(() => {
    const pool = byRole.get(role) ?? []
    const needle = query.trim().toLowerCase()
    const filtered = needle
      ? pool.filter(
          (user) =>
            user.displayName.toLowerCase().includes(needle) ||
            user.username.toLowerCase().includes(needle),
        )
      : pool
    return filtered.slice(0, 60)
  }, [byRole, role, query])

  if (!session) return null

  const choose = (user: User) => {
    signInAs(user.id)
    setOpen(false)
    setQuery('')
    // Navigate from the account being switched *to*, not from the one in context —
    // the provider has not re-rendered with the new user yet.
    navigate(homePathFor(buildSession(user)))
  }

  return (
    <div className="persona">
      <button
        type="button"
        className="button persona-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="persona-role">{ROLE_LABELS[session.role]}</span>
        <span className="persona-name">{session.user.displayName}</span>
      </button>

      {open ? (
        <div className="persona-panel card">
          <div className="eyebrow">Viewing as</div>
          <div className="persona-roles">
            {ROLE_ORDER.filter((entry) => (byRole.get(entry)?.length ?? 0) > 0).map((entry) => (
              <button
                key={entry}
                type="button"
                className="button"
                data-active={entry === role}
                onClick={() => setRole(entry)}
              >
                {ROLE_LABELS[entry]}
                <span className="subtle">{byRole.get(entry)?.length ?? 0}</span>
              </button>
            ))}
          </div>

          <input
            className="persona-search"
            type="search"
            placeholder={`Search ${ROLE_LABELS[role].toLowerCase()} accounts`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <ul className="persona-list">
            {candidates.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  className="persona-option"
                  data-active={user.id === session.user.id}
                  onClick={() => choose(user)}
                >
                  <span>{user.displayName}</span>
                  <span className="subtle mono">{user.username}</span>
                </button>
              </li>
            ))}
            {candidates.length === 0 ? <li className="subtle">No matching accounts.</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
