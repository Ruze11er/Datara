// Shape of the saved progress file. Shared by the main process (which stores
// it) and the renderer (which reads and updates it).
// Items are keyed by stable string IDs, never by level number, so lessons and
// levels can be reordered or inserted later without breaking saved progress.

import type { BoardState, VerdictAnswers } from './cases/types'

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

export interface Note {
  text: string
  /** ISO timestamp of the last edit. */
  updatedAt: string
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

// ---------- Data Detective Academy ----------

export type CaseMode = 'guided' | 'challenge'

export interface CaseLeadProgress {
  /** ISO time the lead was cracked. */
  cracked?: string
  /** Which of the lead's solutions the learner's result matched. */
  solution?: number
  /** Times "Check lead" was pressed. */
  attempts: number
  hintsUsed: number
  solutionViewed: boolean
  /** Cracked with SQL or with Python. */
  tool?: CaseTool
}

export type CaseTool = 'sql' | 'python'

export type CaseGrade = 'distinguished' | 'solid' | 'provisional' | 'reopened'

/** A note the learner pins to the detective board (not graded). */
export interface CaseNote {
  id: string
  text: string
  at: string
}

/** The learner's verdict: their answers plus the written summary (self-checked, not graded). */
export type CaseVerdict = VerdictAnswers & { summary: string }

/** A query result saved with an evidence card (the learner's own finding), capped to keep the file small. */
export interface EvidenceSnapshot {
  columns: string[]
  rows: (string | number | null)[][]
  /** Rows in the full result (more than `rows` when it was cut). */
  totalRows: number
}

export interface CaseEvidenceRecord {
  /** ISO time it was found. */
  at: string
  /** The lead that produced it. */
  lead: string
  snapshot?: EvidenceSnapshot
}

/** One case, keyed in ProgressData.cases by the case id. Leads, evidence and documents by their stable ids. */
export interface CaseProgress {
  /** The case file version this run started on (content/cases/<id>/case.yaml `version`). */
  caseVersion: number
  mode: CaseMode
  startedAt: string
  leads: Record<string, CaseLeadProgress>
  /** Facts found so far (claims are always available). */
  evidence: Record<string, CaseEvidenceRecord>
  /** Investigation Lab editor text (autosaved): SQL, and Python. */
  draft?: string
  pythonDraft?: string
  /** The language the Investigation Lab is set to. */
  tool?: CaseTool
  /** Lead selected in the Investigation Lab. */
  focusLead?: string
  /** Ids of documents and evidence the learner has looked at (anything else shows as new). */
  seen: string[]
  /** The detective board: each hypothesis's status and evidence links. */
  board: BoardState
  notes: CaseNote[]
  /** The verdict being written (autosaved), then the one presented. */
  verdict?: CaseVerdict
  /** investigating → pushback (verdict presented, answering challenges) → closed. */
  stage: 'investigating' | 'pushback' | 'closed'
  closedAt?: string
  /** Summary checklist items the learner ticked when comparing with the model answer. */
  summaryChecks: number[]
  /**
   * Best result over all runs of this case (kept when the case is replayed): the best rating, and separately the
   * best XP (src/shared/academy.ts caseRunXp), since a lower-rated Challenge run can earn more XP.
   */
  best?: { total: number; grade: CaseGrade; closedAt: string; xp?: number }
  /** Runs started, including this one. */
  runs: number
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
  /** The learner's own notes, keyed "lesson:<id>", "sql:<id>" or "python:<id>". Empty notes are removed. */
  notes: Record<string, Note>
  /** Data Detective Academy runs, keyed by case id. */
  cases: Record<string, CaseProgress>
  academy: AcademyState
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
    notes: {},
    cases: {},
    academy: { achievements: {} },
    settings: { editorFontSize: 14, theme: 'system' }
  }
}

export function emptyLevelProgress(): LevelProgress {
  return { status: 'unsolved', stars: 0, attempts: 0, hintsUsed: 0, solutionViewed: false }
}

/** Data Detective Academy rewards. XP itself is worked out from progress (src/shared/academy.ts), never stored. */
export interface AcademyState {
  /** Achievement id -> ISO time it was earned. Stored so each one is celebrated only once. */
  achievements: Record<string, string>
  /** The rank last shown to the learner, so a promotion is announced once. */
  rankSeen?: number
}
