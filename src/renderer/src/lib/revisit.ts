// Works out which topics the learner may want to revisit.

import type { Lesson } from '@shared/content'
import type { ProgressData } from '@shared/progress'
import { getLesson, labs, lessonsInOrder, type BaseLevel, type Lab, type Numbered } from '../content'
import { levelProgress } from './labProgress'

/** Unsolved levels with at least this many checks count as "struggling". */
const STRUGGLE_ATTEMPTS = 4
/** Quiz scores below this suggest re-reading the lesson. */
const LOW_QUIZ = 0.67

export interface LevelToRevisit {
  lab: Lab
  level: Numbered<BaseLevel>
  reason: string
}

export interface RevisitSummary {
  levels: LevelToRevisit[]
  /** Lessons suggested by the levels above, low quiz scores, or bookmarks. */
  lessons: { lesson: Lesson; reason: string }[]
}

export function topicsToRevisit(progress: ProgressData | null): RevisitSummary {
  const levels: LevelToRevisit[] = []
  for (const lab of labs) {
    for (const level of lab.levels) {
      const lp = levelProgress(progress, lab, level.id)
      if (lp.status === 'solved' && lp.stars === 1) levels.push({ lab, level, reason: 'You viewed the solution' })
      else if (lp.status === 'solved' && lp.stars === 2) levels.push({ lab, level, reason: 'You used hints' })
      else if (lp.status !== 'solved' && lp.attempts >= STRUGGLE_ATTEMPTS)
        levels.push({ lab, level, reason: `${lp.attempts} tries, not solved yet` })
    }
  }

  const lessons = new Map<string, { lesson: Lesson; reason: string }>()
  for (const id of progress?.bookmarks ?? []) {
    const lesson = getLesson(id)
    if (lesson) lessons.set(id, { lesson, reason: 'You saved it to revisit' })
  }
  for (const { lesson } of lessonsInOrder) {
    const score = progress?.lessons[lesson.id]?.quizScore
    if (score !== undefined && score < LOW_QUIZ && !lessons.has(lesson.id))
      lessons.set(lesson.id, { lesson, reason: `Quiz score ${Math.round(score * 100)}%` })
  }
  for (const { lab, level } of levels) {
    const lesson = level.lesson ? getLesson(level.lesson) : undefined
    if (lesson && !lessons.has(lesson.id)) lessons.set(lesson.id, { lesson, reason: `Covers ${lab.name} level ${level.number}` })
  }

  return { levels, lessons: [...lessons.values()] }
}

export function nextLesson(progress: ProgressData | null): Lesson | null {
  return lessonsInOrder.find((p) => !progress?.lessons[p.lesson.id]?.completedAt)?.lesson ?? null
}
