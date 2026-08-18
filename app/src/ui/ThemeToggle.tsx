/**
 * Theme, and the mark.
 *
 * Three states rather than two, and the third one is the point: "system" is the
 * default, so a reader who has told their machine they want light gets light here
 * without asking twice.
 *
 * The preference is resolved to a concrete `dark` or `light` here rather than in
 * CSS, and the attribute is always present. That is what lets theme.css carry one
 * light block instead of two — a `[data-theme]` rule and a `prefers-color-scheme`
 * rule that have to be kept character-for-character identical by hand. Resolving
 * in JS means the media query is consulted in exactly one place, and it is this
 * one.
 */

import { useCallback, useEffect, useState } from 'react'

export type ThemePreference = 'system' | 'dark' | 'light'
export type ResolvedTheme = 'dark' | 'light'

const STORAGE_KEY = 'supernova.theme'
const LIGHT_QUERY = '(prefers-color-scheme: light)'

function readStored(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'dark' || stored === 'light' ? stored : 'system'
}

function resolve(preference: ThemePreference): ResolvedTheme {
  if (preference !== 'system') return preference
  return window.matchMedia(LIGHT_QUERY).matches ? 'light' : 'dark'
}

/**
 * Not exported. Only `ThemeToggle` needs it, and a module that exports both a hook
 * and a component breaks React Fast Refresh — the lint rule that says so is the
 * one this project holds at a fixed count.
 */
function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(readStored)
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolve(readStored()))

  useEffect(() => {
    const media = window.matchMedia(LIGHT_QUERY)
    const sync = () => setResolved(resolve(preference))
    sync()
    // Only "system" cares what the device is doing, but subscribing unconditionally
    // keeps the listener's lifetime tied to the effect rather than to the branch.
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [preference])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved)
  }, [resolved])

  const choose = useCallback((next: ThemePreference) => {
    if (next === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, next)
    setPreference(next)
  }, [])

  return { preference, resolved, choose }
}

const OPTIONS: { value: ThemePreference; label: string; hint: string }[] = [
  { value: 'system', label: 'Auto', hint: 'Follow this device' },
  { value: 'dark', label: 'Sky', hint: 'Dark — the default reading surface' },
  { value: 'light', label: 'Paper', hint: 'Light — for print and bright rooms' },
]

export function ThemeToggle() {
  const { preference, choose } = useTheme()

  return (
    <div className="theme-toggle" role="group" aria-label="Colour theme">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className="theme-option"
          data-active={preference === option.value}
          aria-pressed={preference === option.value}
          title={option.hint}
          onClick={() => choose(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/**
 * The mark: a star at the moment it goes off. The core is the lit gold the mastery
 * ramp tops out at, so the logo and the brightest star in a student's map are
 * literally the same colour — the wordmark is a claim about what the product does,
 * not decoration beside it.
 */
export function SupernovaMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      className="mark"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle className="mark-halo" cx="12" cy="12" r="9.5" />
      <g className="mark-rays">
        <path d="M12 1.5V6M12 18v4.5M1.5 12H6M18 12h4.5" />
        <path d="M4.6 4.6l3.2 3.2M16.2 16.2l3.2 3.2M19.4 4.6l-3.2 3.2M7.8 16.2l-3.2 3.2" />
      </g>
      <circle className="mark-core" cx="12" cy="12" r="3.6" />
    </svg>
  )
}
