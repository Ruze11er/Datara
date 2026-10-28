// Shape of the saved progress file. Shared by the main process (which stores
// it) and the renderer (which reads and updates it).
// Items are keyed by stable string IDs, never by level number, so lessons and
// levels can be reordered or inserted later without breaking saved progress.

export const PROGRESS_VERSION = 1

export type LevelStatus = 'unsolved' | 'solved'
export type Stars = 0 | 1 | 2 | 3

export interface LevelProgress {
  status: LevelStatus
  /** Best result so far: 3 = no hints, 2 = used hints, 1 = viewed the solution. */
  stars: Stars
  /** Number of times Check was pressed. */
  attempts: number
  /** Hints revealed in the current try. */
  hintsUsed: number
  /** Solution revealed in the current try. */
  solutionViewed: boolean
  /** Last code typed in the editor (autosaved). */
  lastCode?: string
  solvedAt?: string
  /** Spaced-review schedule. Missing for levels that never needed review (see renderer/src/lib/reviewQueue.ts). */
  review?: ReviewState
}

export interface ReviewState {
  /** How many reviews in a row went well. Decides the next interval. */
  step: number
  /** Next review date, local time, YYYY-MM-DD. */
  due: string
  /** Reviewed successfully enough times: no longer in the queue. */
  done?: boolean
}

/** Free-practice code from the Playground (autosaved). */
export interface PlaygroundState {
  sql?: string
  python?: string
}

export interface LessonProgress {
  completedAt?: string
  /** Best quiz score, 0–1 */
  quizScore?: number
}

export type ThemeChoice = 'system' | 'light' | 'dark'

export interface Settings {
  editorFontSize: number
  /** "system" follows the Windows light/dark setting. */
  theme: ThemeChoice
}

export interface ProgressData {
  version: number
  lessons: Record<string, LessonProgress>
  sqlLevels: Record<string, LevelProgress>
  pythonLevels: Record<string, LevelProgress>
  /** Bookmarked lesson IDs ("topics to revisit"). */
  bookmarks: string[]
  playground: PlaygroundState
  /** Learning actions per local day (YYYY-MM-DD → count): Checks pressed and quizzes finished. */
  activity: Record<string, number>
  settings: Settings
}

export function emptyProgress(): ProgressData {
  return {
    version: PROGRESS_VERSION,
    lessons: {},
    sqlLevels: {},
    pythonLevels: {},
    bookmarks: [],
    playground: {},
    activity: {},
    settings: { editorFontSize: 14, theme: 'system' }
  }
}

export function emptyLevelProgress(): LevelProgress {
  return { status: 'unsolved', stars: 0, attempts: 0, hintsUsed: 0, solutionViewed: false }
}
