// Rules for SQL Lab progress: stars, chapter unlocking, and "what's next".

import { emptyLevelProgress, type LevelProgress, type ProgressData, type Stars } from '@shared/progress'
import { sqlChapters, sqlLevels, type NumberedLevel } from '../content'

export function levelProgress(progress: ProgressData | null, id: string): LevelProgress {
  return { ...emptyLevelProgress(), ...progress?.sqlLevels[id] }
}

export const isSolved = (progress: ProgressData | null, id: string): boolean =>
  progress?.sqlLevels[id]?.status === 'solved'

/** Stars for solving now: 3 = no help, 2 = used hints, 1 = viewed the solution. */
export function starsForTry(p: LevelProgress): Stars {
  if (p.solutionViewed) return 1
  if (p.hintsUsed > 0) return 2
  return 3
}

/** Chapter 1 is always open. Each later chapter opens when every level before it is solved. */
export function isChapterUnlocked(progress: ProgressData | null, chapterIndex: number): boolean {
  if (chapterIndex === 0) return true
  const previous = sqlChapters[chapterIndex - 1]
  return !!previous && previous.levels.every((id) => isSolved(progress, id))
}

export function isLevelUnlocked(progress: ProgressData | null, level: NumberedLevel): boolean {
  return isChapterUnlocked(progress, level.chapterIndex)
}

export function chapterStats(progress: ProgressData | null, chapterIndex: number) {
  const ids = sqlChapters[chapterIndex]?.levels ?? []
  const solved = ids.filter((id) => isSolved(progress, id)).length
  const stars = ids.reduce((sum, id) => sum + (progress?.sqlLevels[id]?.stars ?? 0), 0)
  return { solved, total: ids.length, stars, maxStars: ids.length * 3 }
}

export function overallSqlStats(progress: ProgressData | null) {
  const solved = sqlLevels.filter((l) => isSolved(progress, l.id)).length
  const stars = sqlLevels.reduce((sum, l) => sum + (progress?.sqlLevels[l.id]?.stars ?? 0), 0)
  return { solved, total: sqlLevels.length, stars, maxStars: sqlLevels.length * 3 }
}

/** The first unsolved level the learner can play, or null when everything is done. */
export function nextSqlLevel(progress: ProgressData | null): NumberedLevel | null {
  return sqlLevels.find((l) => isLevelUnlocked(progress, l) && !isSolved(progress, l.id)) ?? null
}

/** The level after this one, if it is unlocked. */
export function followingLevel(progress: ProgressData | null, level: NumberedLevel): NumberedLevel | null {
  const next = sqlLevels[level.number] // numbers are 1-based, so this is the next level
  return next && isLevelUnlocked(progress, next) ? next : null
}
