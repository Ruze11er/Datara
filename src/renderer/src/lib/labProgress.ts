// Progress rules shared by the SQL Lab and the Python Lab: stars, chapter
// unlocking, and "what's next".

import { emptyLevelProgress, type LevelProgress, type ProgressData, type Stars } from '@shared/progress'
import type { BaseLevel, Lab, Numbered } from '../content'

type AnyLab = Lab<BaseLevel>

export function levelProgress(progress: ProgressData | null, lab: AnyLab, id: string): LevelProgress {
  return { ...emptyLevelProgress(), ...progress?.[lab.progressKey][id] }
}

export const isSolved = (progress: ProgressData | null, lab: AnyLab, id: string): boolean =>
  progress?.[lab.progressKey][id]?.status === 'solved'

/** Returns progress with one level's record changed. */
export function withLevel(
  p: ProgressData,
  lab: AnyLab,
  id: string,
  change: (current: LevelProgress) => Partial<LevelProgress>
): ProgressData {
  const current = levelProgress(p, lab, id)
  return { ...p, [lab.progressKey]: { ...p[lab.progressKey], [id]: { ...current, ...change(current) } } }
}

/** Stars for solving now: 3 = no help, 2 = used hints, 1 = viewed the solution. */
export function starsForTry(p: LevelProgress): Stars {
  if (p.solutionViewed) return 1
  if (p.hintsUsed > 0) return 2
  return 3
}

/** Chapter 1 is always open. Each later chapter opens when every level before it is solved. */
export function isChapterUnlocked(progress: ProgressData | null, lab: AnyLab, chapterIndex: number): boolean {
  if (chapterIndex === 0) return true
  const previous = lab.chapters[chapterIndex - 1]
  return !!previous && previous.levels.every((id) => isSolved(progress, lab, id))
}

export function isLevelUnlocked(progress: ProgressData | null, lab: AnyLab, level: Numbered<BaseLevel>): boolean {
  return isChapterUnlocked(progress, lab, level.chapterIndex)
}

export function chapterStats(progress: ProgressData | null, lab: AnyLab, chapterIndex: number) {
  const ids = lab.chapters[chapterIndex]?.levels ?? []
  const solved = ids.filter((id) => isSolved(progress, lab, id)).length
  const stars = ids.reduce((sum, id) => sum + (progress?.[lab.progressKey][id]?.stars ?? 0), 0)
  return { solved, total: ids.length, stars, maxStars: ids.length * 3 }
}

export function overallStats(progress: ProgressData | null, lab: AnyLab) {
  const solved = lab.levels.filter((l) => isSolved(progress, lab, l.id)).length
  const stars = lab.levels.reduce((sum, l) => sum + (progress?.[lab.progressKey][l.id]?.stars ?? 0), 0)
  return { solved, total: lab.levels.length, stars, maxStars: lab.levels.length * 3 }
}

/** The first unsolved level the learner can play, or null when everything is done. */
export function nextLevel(progress: ProgressData | null, lab: AnyLab): Numbered<BaseLevel> | null {
  return lab.levels.find((l) => isLevelUnlocked(progress, lab, l) && !isSolved(progress, lab, l.id)) ?? null
}

/** The level after this one, if it is unlocked. */
export function followingLevel(progress: ProgressData | null, lab: AnyLab, level: Numbered<BaseLevel>): Numbered<BaseLevel> | null {
  const next = lab.levels[level.number] // numbers are 1-based, so this is the next level
  return next && isLevelUnlocked(progress, lab, next) ? next : null
}
