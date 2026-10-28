import { useCallback, useEffect, useRef } from 'react'
import type { BaseLevel, Lab, Numbered } from '../../content'
import { useProgress } from '../../lib/ProgressContext'
import { isChapterUnlocked, levelProgress, starsForTry, withLevel } from '../../lib/labProgress'
import { withActivity } from '../../lib/activity'
import { daysUntilNext, scheduleAfterSolve } from '../../lib/reviewQueue'

const AUTOSAVE_MS = 700

export interface AttemptResult {
  /** Stars earned by this try (0 if it failed). */
  stars: number
  /** Chapter number (1-based) that this solve unlocked, if any. */
  unlockedChapter: number | null
  /**
   * Set when this solve changed the level's review schedule: days until the next review,
   * or null when the level is now mastered.
   */
  nextReview?: { days: number | null }
}

/**
 * Everything a level screen needs to track the learner's work: autosaved code,
 * hints, the solution, retries, and recording each Check.
 * With `reviewing` (opened from the review queue), the level starts as a fresh try.
 */
export function useLevelSession(lab: Lab, level: Numbered<BaseLevel>, starter: string, reviewing = false) {
  const { progress, update } = useProgress()
  const lp = levelProgress(progress, lab, level.id)
  const code = useRef(reviewing ? starter : (lp.lastCode ?? starter))
  const saveTimer = useRef<number | null>(null)

  // A review is a fresh try: blank starter code, no hints or solution shown.
  useEffect(() => {
    if (reviewing) update((p) => withLevel(p, lab, level.id, () => ({ hintsUsed: 0, solutionViewed: false, lastCode: starter })))
  }, [reviewing, update, lab, level.id, starter])

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
      let nextReview: AttemptResult['nextReview']
      update((p) => {
        const nextChapterWasLocked = !isChapterUnlocked(p, lab, level.chapterIndex + 1)
        const next = withLevel(withActivity(p), lab, level.id, (cur) => {
          const base = { attempts: cur.attempts + 1, lastCode: code.current }
          if (!passed) return base
          stars = starsForTry(cur)
          const review = scheduleAfterSolve(cur, reviewing)
          if (review) nextReview = { days: daysUntilNext(review) }
          return {
            ...base,
            status: 'solved',
            stars: Math.max(cur.stars, stars) as 0 | 1 | 2 | 3,
            solvedAt: cur.solvedAt ?? new Date().toISOString(),
            ...(review ? { review } : {})
          }
        })
        if (passed && nextChapterWasLocked && level.chapterIndex + 1 < lab.chapters.length && isChapterUnlocked(next, lab, level.chapterIndex + 1)) {
          unlockedChapter = level.chapterIndex + 2
        }
        return next
      })
      return { stars, unlockedChapter, nextReview }
    },
    [update, lab, level, reviewing]
  )

  return { progress, lp, code, onChange, revealHint, revealSolution, resetTry, recordAttempt }
}
