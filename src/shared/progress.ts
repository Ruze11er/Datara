// Shape of the saved progress file. Shared by the main process (which stores
// it) and the renderer (which reads and updates it).
// Items are keyed by stable string IDs, never by level number, so lessons and
// levels can be reordered or inserted later without breaking saved progress.

export const PROGRESS_VERSION = 1

export type LevelStatus = 'unsolved' | 'solved'

export interface LevelProgress {
  status: LevelStatus
  /** 3 = no hints, 2 = used hints, 1 = viewed the solution */
  stars: 0 | 1 | 2 | 3
  attempts: number
  hintsUsed: number
  /** Last code typed in the editor (autosaved) */
  lastCode?: string
  solvedAt?: string
}

export interface LessonProgress {
  completedAt?: string
  /** 0–1 */
  quizScore?: number
}

export interface Settings {
  editorFontSize: number
}

export interface ProgressData {
  version: number
  lessons: Record<string, LessonProgress>
  sqlLevels: Record<string, LevelProgress>
  pythonLevels: Record<string, LevelProgress>
  bookmarks: string[]
  settings: Settings
}

export function emptyProgress(): ProgressData {
  return {
    version: PROGRESS_VERSION,
    lessons: {},
    sqlLevels: {},
    pythonLevels: {},
    bookmarks: [],
    settings: { editorFontSize: 14 }
  }
}
