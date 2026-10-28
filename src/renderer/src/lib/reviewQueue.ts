// The review queue: spaced repetition for levels the learner found hard.
//
// A level joins the queue when it's solved with help (hints or the solution) or after many tries.
// Its first review is the next day. Each review solved without help pushes the next one further
// out (1 → 3 → 7 → 21 days); after the 21-day review it counts as mastered and leaves the queue.
// A review that needs help starts the schedule again at 1 day.

import type { LevelProgress, ProgressData, ReviewState } from '@shared/progress'
import { labs, type BaseLevel, type Lab, type Numbered } from '../content'
import { levelProgress, starsForTry } from './labProgress'

/** Days until the next review, after 0, 1, 2, 3 good reviews in a row. One more good review = mastered. */
export const REVIEW_INTERVALS = [1, 3, 7, 21]
/** A level solved after at least this many checks also goes into the queue. */
export const STRUGGLE_ATTEMPTS = 4

/** Today's date in local time, as YYYY-MM-DD (the user's calendar day, not UTC). */
export function localDate(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number)
  return localDate(new Date(y!, m! - 1, d! + days))
}

/** Whole days from one YYYY-MM-DD date to another. */
export function daysBetween(from: string, to: string): number {
  const ms = (day: string) => {
    const [y, m, d] = day.split('-').map(Number)
    return Date.UTC(y!, m! - 1, d!)
  }
  return Math.round((ms(to) - ms(from)) / 86_400_000)
}

const needsReview = (lp: LevelProgress) => lp.stars < 3 || lp.attempts >= STRUGGLE_ATTEMPTS

/**
 * A level's review schedule. Levels solved before the queue existed have no saved schedule;
 * if they were hard (help used or many tries), they're due today.
 */
export function reviewState(lp: LevelProgress, today: string = localDate()): ReviewState | null {
  if (lp.review) return lp.review
  if (lp.status === 'solved' && needsReview(lp)) return { step: 0, due: today }
  return null
}

/**
 * The schedule after a successful Check. `before` is the level's progress before this solve,
 * `reviewing` is true when the learner opened the level from the review queue.
 * Returns undefined to leave the schedule as it was.
 */
export function scheduleAfterSolve(before: LevelProgress, reviewing: boolean, today: string = localDate()): ReviewState | undefined {
  const helped = starsForTry(before) < 3
  const current = reviewState(before, today)
  if (helped) return { step: 0, due: addDays(today, REVIEW_INTERVALS[0]!) }
  if (reviewing && current && !current.done) {
    const step = current.step + 1
    if (step >= REVIEW_INTERVALS.length) return { step, due: today, done: true }
    return { step, due: addDays(today, REVIEW_INTERVALS[step]!) }
  }
  // A normal solve: a level that took many tries joins the queue (unless it's already in it).
  if (before.attempts + 1 >= STRUGGLE_ATTEMPTS && (!current || current.done)) {
    return { step: 0, due: addDays(today, REVIEW_INTERVALS[0]!) }
  }
  return undefined
}

/** Days until the next review for a schedule, or null when mastered. */
export const daysUntilNext = (state: ReviewState, today: string = localDate()): number | null =>
  state.done ? null : daysBetween(today, state.due)

export interface ReviewItem {
  lab: Lab
  level: Numbered<BaseLevel>
  state: ReviewState
  /** Why it's in the queue, in plain words. */
  reason: string
}

export interface ReviewQueue {
  /** Due today or overdue, oldest first. */
  due: ReviewItem[]
  /** Scheduled for later, soonest first. */
  upcoming: ReviewItem[]
  mastered: ReviewItem[]
}

function reasonFor(lp: LevelProgress, state: ReviewState): string {
  if (state.step > 0) return `${state.step} good review${state.step === 1 ? '' : 's'} so far`
  if (lp.stars === 1) return 'You viewed the solution'
  if (lp.stars === 2) return 'You used hints'
  return 'It took several tries'
}

export function reviewQueue(progress: ProgressData | null, today: string = localDate()): ReviewQueue {
  const queue: ReviewQueue = { due: [], upcoming: [], mastered: [] }
  for (const lab of labs) {
    for (const level of lab.levels) {
      const lp = levelProgress(progress, lab, level.id)
      const state = reviewState(lp, today)
      if (!state) continue
      const item = { lab, level, state, reason: reasonFor(lp, state) }
      if (state.done) queue.mastered.push(item)
      else if (state.due <= today) queue.due.push(item)
      else queue.upcoming.push(item)
    }
  }
  const byDue = (a: ReviewItem, b: ReviewItem) => (a.state.due < b.state.due ? -1 : a.state.due > b.state.due ? 1 : 0)
  queue.due.sort(byDue)
  queue.upcoming.sort(byDue)
  return queue
}

/** Link that opens a level in review mode. */
export const reviewHref = (lab: Lab, level: BaseLevel): string => `${lab.path}/${level.id}?review=1`
