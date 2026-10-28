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
  /** Returns false if the user cancelled. */
  exportBackup(data: ProgressData): Promise<boolean>
  /** Returns null if the user cancelled. */
  importBackup(): Promise<unknown | null>
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
  },
  async exportBackup(data) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `datara-progress-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    return true
  },
  importBackup() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'application/json,.json'
      input.onchange = async () => {
        const file = input.files?.[0]
        if (!file) return resolve(null)
        try {
          resolve(JSON.parse(await file.text()))
        } catch {
          reject(new Error('That file is not a Datara backup (it is not valid JSON).'))
        }
      }
      input.click()
    })
  }
}

export const progressStorage: ProgressStorage = window.datara?.progress ?? browserStorage

/** True if the data looks like a Datara progress file. */
export function isProgressData(raw: unknown): boolean {
  return typeof raw === 'object' && raw !== null && typeof (raw as { version?: unknown }).version === 'number'
}

/** Fills in anything missing from older or partial save files. */
export function normalizeProgress(raw: unknown): ProgressData {
  const base = emptyProgress()
  if (!isProgressData(raw)) return base
  const data = raw as Partial<ProgressData>
  const obj = (v: unknown) => (typeof v === 'object' && v !== null && !Array.isArray(v) ? v : {})
  return {
    version: base.version,
    lessons: obj(data.lessons) as ProgressData['lessons'],
    sqlLevels: obj(data.sqlLevels) as ProgressData['sqlLevels'],
    pythonLevels: obj(data.pythonLevels) as ProgressData['pythonLevels'],
    bookmarks: Array.isArray(data.bookmarks) ? data.bookmarks.filter((b) => typeof b === 'string') : [],
    playground: obj(data.playground) as ProgressData['playground'],
    activity: obj(data.activity) as ProgressData['activity'],
    settings: { ...base.settings, ...obj(data.settings) }
  }
}
