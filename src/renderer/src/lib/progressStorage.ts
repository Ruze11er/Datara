import type { DataraDesktopApi } from '@shared/api'
import { emptyProgress, type ProgressData } from '@shared/progress'

// Where progress is saved. The rest of the interface only uses this module,
// so a future website version just needs a different storage here.

declare global {
  interface Window {
    /** Present only in the desktop app (added by the preload script). */
    datara?: DataraDesktopApi
    __dataraSelfTest?: () => Promise<unknown>
  }
}

export interface ProgressStorage {
  load(): Promise<unknown | null>
  save(data: ProgressData): Promise<void>
}

const BROWSER_KEY = 'datara.progress'

/** Used when the interface runs in a normal browser (no desktop app). */
const browserStorage: ProgressStorage = {
  async load() {
    try {
      const raw = localStorage.getItem(BROWSER_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },
  async save(data) {
    try {
      localStorage.setItem(BROWSER_KEY, JSON.stringify(data))
    } catch {
      // Storage can be unavailable (private mode, blocked); progress just won't persist.
    }
  }
}

export const progressStorage: ProgressStorage = window.datara?.progress ?? browserStorage

/** Fills in anything missing from older or partial save files. */
export function normalizeProgress(raw: unknown): ProgressData {
  const base = emptyProgress()
  if (typeof raw !== 'object' || raw === null) return base
  const data = raw as Partial<ProgressData>
  return {
    ...base,
    ...data,
    version: base.version,
    settings: { ...base.settings, ...data.settings }
  }
}
