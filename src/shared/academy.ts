// Data Detective Academy XP and ranks. XP is never stored as a running total: it is worked out from progress
// (lab levels, lessons, closed cases, achievements), so it counts earlier work, can't drift, and the rules can be
// tuned later. Pure functions, shared by the app and scripts/verify-cases.ts (which tests them).

export const XP_RULES = {
  /** A solved SQL or Python Lab level, plus a bonus per star (3 stars = no help). */
  levelSolved: 10,
  perStar: 5,
  /** A completed lesson, plus up to this much for the best quiz score. */
  lessonCompleted: 15,
  quizBonus: 10,
  /** A closed case: per rating point (0–100), for Challenge mode, and per lead cracked without hints or the solution. */
  casePerPoint: 3,
  caseChallenge: 50,
  caseUnassistedLead: 5,
  achievement: 25
} as const

export interface Rank {
  rank: number
  title: string
  /** XP needed to be promoted to this rank. */
  xp: number
}

/** Promotion needs the XP and a closed case of the rank below (rated Solid or better). */
export const RANKS: Rank[] = [
  { rank: 1, title: 'Rookie Investigator', xp: 0 },
  { rank: 2, title: 'Junior Data Detective', xp: 500 },
  { rank: 3, title: 'Data Analyst', xp: 1500 },
  { rank: 4, title: 'Senior Investigator', xp: 3000 },
  { rank: 5, title: 'Lead Analytics Consultant', xp: 5000 }
]

/** Grades that count for a promotion. */
export const PROMOTION_GRADES = ['solid', 'distinguished']

export interface XpInput {
  levels: { status: string; stars: number }[]
  lessons: { completedAt?: string; quizScore?: number }[]
  /** Best XP of each closed case (from closeCase). */
  caseXp: number[]
  achievements: number
}

export interface XpBreakdown {
  labs: number
  lessons: number
  cases: number
  achievements: number
  total: number
}

export function xpBreakdown(input: XpInput): XpBreakdown {
  const labs = input.levels
    .filter((l) => l.status === 'solved')
    .reduce((s, l) => s + XP_RULES.levelSolved + XP_RULES.perStar * Math.max(0, Math.min(3, l.stars)), 0)
  const lessons = input.lessons
    .filter((l) => l.completedAt)
    .reduce((s, l) => s + XP_RULES.lessonCompleted + Math.round(XP_RULES.quizBonus * Math.max(0, Math.min(1, l.quizScore ?? 0))), 0)
  const cases = input.caseXp.reduce((s, x) => s + x, 0)
  const achievements = input.achievements * XP_RULES.achievement
  return { labs, lessons, cases, achievements, total: labs + lessons + cases + achievements }
}

/** XP for one closed run of a case. A case counts its best run. */
export function caseRunXp(run: { total: number; challenge: boolean; unassistedLeads: number }): number {
  return (
    XP_RULES.casePerPoint * Math.max(0, Math.min(100, run.total)) +
    (run.challenge ? XP_RULES.caseChallenge : 0) +
    XP_RULES.caseUnassistedLead * run.unassistedLeads
  )
}

export interface RankCase {
  title: string
  /** The rank the case is meant for. */
  rank: number
  /** Best grade, if closed. */
  grade?: string
}

export interface RankState {
  current: Rank
  next: Rank | null
  xp: number
  /** What the promotion to `next` still needs (empty when promoted or at the top). */
  needs: { xp: number; cases: { title: string; done: boolean }[]; noCaseYet: boolean } | null
}

/** The highest rank whose XP and promotion cases are both done, and what the next one needs. */
export function rankState(xp: number, cases: RankCase[]): RankState {
  let current = RANKS[0]!
  for (const r of RANKS.slice(1)) {
    const required = cases.filter((c) => c.rank === r.rank - 1)
    const casesDone = required.length > 0 && required.every((c) => c.grade && PROMOTION_GRADES.includes(c.grade))
    if (xp >= r.xp && casesDone) current = r
    else break
  }
  const next = RANKS.find((r) => r.rank === current.rank + 1) ?? null
  if (!next) return { current, next, xp, needs: null }
  const required = cases.filter((c) => c.rank === current.rank)
  return {
    current,
    next,
    xp,
    needs: {
      xp: Math.max(0, next.xp - xp),
      cases: required.map((c) => ({ title: c.title, done: !!c.grade && PROMOTION_GRADES.includes(c.grade) })),
      noCaseYet: required.length === 0
    }
  }
}
