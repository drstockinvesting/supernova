/**
 * Who is looking.
 *
 * The dataset already carries real accounts — 2,101 of them, each with role
 * assignments, scopes, and an explicit permission list. This provider signs in as
 * one of them so views can ask "can this user see behaviour detail?" and get an
 * answer from the data rather than from a hard-coded role check.
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from '../types/supernova'
import { loadUsers } from '../data/client'
import { useAsync } from '../data/useAsync'
import { buildSession, type Session } from './roles'

interface SessionContextValue {
  session: Session | null
  users: User[]
  loading: boolean
  signInAs: (userId: string) => void
  signOut: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

const STORAGE_KEY = 'supernova.activeUserId'

/** Stable identity, so a pending load does not invalidate every memo each render. */
const NO_USERS: User[] = []

export function SessionProvider({ children }: { children: ReactNode }) {
  const usersState = useAsync(loadUsers, [])
  const [activeUserId, setActiveUserId] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY),
  )

  const users = usersState.value ?? NO_USERS

  // Land on a student account by default: the student profile is the base of the
  // fractal, and every other view is an aggregate of it.
  useEffect(() => {
    if (activeUserId || users.length === 0) return
    const fallback = users.find((user) => user.roleAssignments[0]?.role === 'student')
    if (fallback) setActiveUserId(fallback.id)
  }, [activeUserId, users])

  const value = useMemo<SessionContextValue>(() => {
    const user = users.find((entry) => entry.id === activeUserId) ?? null
    return {
      session: user ? buildSession(user) : null,
      users,
      loading: usersState.status === 'loading',
      signInAs: (userId: string) => {
        localStorage.setItem(STORAGE_KEY, userId)
        setActiveUserId(userId)
      },
      signOut: () => {
        localStorage.removeItem(STORAGE_KEY)
        setActiveUserId(null)
      },
    }
  }, [users, activeUserId, usersState.status])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext)
  if (!context) throw new Error('useSession must be used inside a SessionProvider')
  return context
}
