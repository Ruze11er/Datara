// Practice activity: what the learner did on which day, for streaks and the activity calendar.

import type { ProgressData } from '@shared/progress'
import { labs, lessonsInOrder } from '../content'
import { addDays, localDate } from './dates'

/** Returns progress with `count` learning actions added to today (or `day`). */
export function withActivity(p: ProgressData, count = 1, day: string = localDate()): ProgressData {
  return { ...p, activity: { ...p.activity, [day]: (p.activity[day] ?? 0) + count } }
}

/**
 * Actions per day. Days recorded before activity tracking existed are filled in from the dates
 * levels were solved and lessons completed (one action each), so streaks include earlier practice.
 */
export function activityByDay(progress: ProgressData | null): Map<string, number> {
  const days = new Map<string, number>(Object.entries(progress?.activity ?? {}))
  const backfill = new Map<string, number>()
  const add = (iso: string | undefined) => {
    if (!iso) return
    const day = localDate(new Date(iso))
    if (!days.has(day)) backfill.set(day, (backfill.get(day) ?? 0) + 1)
  }
  for (const lab of labs) for (const lp of Object.values(progress?.[lab.progressKey] ?? {})) add(lp.solvedAt)
  for (const lp of Object.values(progress?.lessons ?? {})) add(lp.completedAt)
  for (const [day, n] of backfill) days.set(day, n)
  return days
}

export interface Streaks {
  /** Days in a row with practice, ending today, or yesterday if today has no practice yet. */
  current: number
  best: number
  activeDays: number
}

export function streaks(days: Map<string, number>, today: string = localDate()): Streaks {
  const active = [...days].filter(([, n]) => n > 0).map(([day]) => day)
  const set = new Set(active)

  let best = 0
  for (const day of active) {
    if (set.has(addDays(day, -1))) continue // not the start of a run
    let length = 1
    while (set.has(addDays(day, length))) length++
    best = Math.max(best, length)
  }

  let start = set.has(today) ? today : addDays(today, -1)
  let current = 0
  while (set.has(start)) {
    current++
    start = addDays(start, -1)
  }
  return { current, best, activeDays: active.length }
}

export interface RecentItem {
  kind: 'level' | 'lesson'
  title: string
  href: string
  /** ISO timestamp */
  at: string
}

/** The most recently solved levels and completed lessons, newest first. */
export function recentlyCompleted(progress: ProgressData | null, limit = 8): RecentItem[] {
  const items: RecentItem[] = []
  for (const lab of labs) {
    for (const level of lab.levels) {
      const at = progress?.[lab.progressKey][level.id]?.solvedAt
      if (at) items.push({ kind: 'level', title: `${lab.name} ${level.number}: ${level.title}`, href: `${lab.path}/${level.id}`, at })
    }
  }
  for (const { lesson } of lessonsInOrder) {
    const at = progress?.lessons[lesson.id]?.completedAt
    if (at) items.push({ kind: 'lesson', title: lesson.title, href: `/learn/${lesson.id}`, at })
  }
  return items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)).slice(0, limit)
}
