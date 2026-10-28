// The learner's Academy XP and rank, worked out from progress with the rules in src/shared/academy.ts.

import { rankState, xpBreakdown, type RankState, type XpBreakdown } from '@shared/academy'
import type { ProgressData } from '@shared/progress'
import { cases, labs, lessonsInOrder } from '../content'
import { ACHIEVEMENTS } from './achievements'

export function academyXp(p: ProgressData | null): XpBreakdown {
  if (!p) return xpBreakdown({ levels: [], lessons: [], caseXp: [], achievements: 0 })
  return xpBreakdown({
    // Only levels, lessons and achievements that exist in this version of the app count.
    levels: labs.flatMap((lab) => lab.levels.map((l) => p[lab.progressKey][l.id]).filter((lp) => lp !== undefined)),
    lessons: lessonsInOrder.map((place) => p.lessons[place.lesson.id]).filter((lp) => lp !== undefined),
    caseXp: cases.map((c) => p.cases[c.id]?.best?.xp ?? 0),
    achievements: ACHIEVEMENTS.filter((a) => p.academy.achievements[a.id]).length
  })
}

export function academyRank(p: ProgressData | null): RankState {
  return rankState(
    academyXp(p).total,
    cases.map((c) => ({ title: `Case #${c.number}: ${c.title}`, rank: c.rank, grade: p?.cases[c.id]?.best?.grade }))
  )
}
