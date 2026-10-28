import { useCallback, useEffect, useRef } from 'react'
import type { BaseLevel, Lab, Numbered } from '../../content'
import { useProgress } from '../../lib/ProgressContext'
import { isChapterUnlocked, levelProgress, starsForTry, withLevel } from '../../lib/labProgress'

const AUTOSAVE_MS = 700

export interface AttemptResult {
  /** Stars earned by this try (0 if it failed). */
  stars: number
  /** Chapter number (1-based) that this solve unlocked, if any. */
  unlockedChapter: number | null
}

/**
 * Everything a level screen needs to track the learner's work: autosaved code,
 * hints, the solution, retries, and recording each Check.
 */
export function useLevelSession(lab: Lab, level: Numbered<BaseLevel>, starter: string) {
  const { progress, update } = useProgress()
  const lp = levelProgress(progress, lab, level.id)
  const code = useRef(lp.lastCode ?? starter)
  const saveTimer = useRef<number | null>(null)

  const saveCode = useCallback(() => {
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current)
    saveTimer.current = null
    const text = code.current
    update((p) =>
      levelProgress(p, lab, level.id).lastCode === text ? p : withLevel(p, lab, level.id, () => ({ lastCode: text }))
    )
  }, [update, lab, level.id])

  const onChange = useCallback(
    (text: string) => {
      code.current = text
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(saveCode, AUTOSAVE_MS)
    },
    [saveCode]
  )

  // Save any pending edit when leaving the level.
  useEffect(
    () => () => {
      if (saveTimer.current !== null) saveCode()
    },
    [saveCode]
  )

  const revealHint = useCallback(
    () => update((p) => withLevel(p, lab, level.id, (cur) => ({ hintsUsed: Math.min(cur.hintsUsed + 1, level.hints.length) }))),
    [update, lab, level]
  )

  const revealSolution = useCallback(() => {
    const ok = window.confirm('Viewing the solution means this try can earn at most 1 star. Show it?')
    if (ok) update((p) => withLevel(p, lab, level.id, () => ({ solutionViewed: true })))
  }, [update, lab, level.id])

  /** Starts a fresh try (for earning more stars). */
  const resetTry = useCallback(() => {
    code.current = starter
    update((p) => withLevel(p, lab, level.id, () => ({ hintsUsed: 0, solutionViewed: false, lastCode: starter })))
  }, [update, lab, level.id, starter])

  /** Records one press of Check. */
  const recordAttempt = useCallback(
    (passed: boolean): AttemptResult => {
      let stars = 0
      let unlockedChapter: number | null = null
      update((p) => {
        const nextChapterWasLocked = !isChapterUnlocked(p, lab, level.chapterIndex + 1)
        const next = withLevel(p, lab, level.id, (cur) => {
          const base = { attempts: cur.attempts + 1, lastCode: code.current }
          if (!passed) return base
          stars = starsForTry(cur)
          return {
            ...base,
            status: 'solved',
            stars: Math.max(cur.stars, stars) as 0 | 1 | 2 | 3,
            solvedAt: cur.solvedAt ?? new Date().toISOString()
          }
        })
        if (passed && nextChapterWasLocked && level.chapterIndex + 1 < lab.chapters.length && isChapterUnlocked(next, lab, level.chapterIndex + 1)) {
          unlockedChapter = level.chapterIndex + 2
        }
        return next
      })
      return { stars, unlockedChapter }
    },
    [update, lab, level]
  )

  return { progress, lp, code, onChange, revealHint, revealSolution, resetTry, recordAttempt }
}
