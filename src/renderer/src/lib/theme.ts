// Light and dark mode. Dark mode is the `dark` class on <html>; styles.css redefines the colours for it.

import { useEffect } from 'react'
import type { ThemeChoice } from '@shared/progress'

/** A copy of the choice in localStorage, so the right theme is applied before the progress file has loaded. */
const STORAGE_KEY = 'datara-theme'
const darkQuery = (): MediaQueryList => window.matchMedia('(prefers-color-scheme: dark)')

function apply(choice: ThemeChoice): void {
  const dark = choice === 'dark' || (choice === 'system' && darkQuery().matches)
  document.documentElement.classList.toggle('dark', dark)
}

const isChoice = (v: unknown): v is ThemeChoice => v === 'system' || v === 'light' || v === 'dark'

/** Called once at startup, before the first render, to avoid a flash of the wrong theme. */
export function applySavedTheme(): void {
  let saved: unknown = null
  try {
    saved = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    // Storage unavailable: fall back to the system setting.
  }
  apply(isChoice(saved) ? saved : 'system')
}

/** Keeps the page in sync with the chosen theme, including Windows switching between light and dark. */
export function useTheme(choice: ThemeChoice | undefined): void {
  useEffect(() => {
    const current = isChoice(choice) ? choice : 'system'
    apply(current)
    try {
      window.localStorage.setItem(STORAGE_KEY, current)
    } catch {
      // Not critical: the progress file still has the choice.
    }
    if (current !== 'system') return
    const query = darkQuery()
    const onChange = () => apply('system')
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [choice])
}
