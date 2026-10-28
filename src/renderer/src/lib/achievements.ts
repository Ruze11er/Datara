// Data Detective Academy achievements. Each rewards an analytical habit (never speed). Whether one is earned is
// worked out from a case run; the time it was first earned is stored in ProgressData.academy.achievements, so it
// is celebrated once and stays earned after a replay.

import type { CaseDef } from '@shared/cases/types'
import type { CaseProgress, ProgressData } from '@shared/progress'
import { cases } from '../content'
import { isCracked, leadProgress, verdictOf } from './caseProgress'

export interface Achievement {
  id: string
  title: string
  /** What earns it (shown once earned, or always unless hidden). */
  description: string
  /** Shown as "???" until earned. */
  hidden: boolean
  /** True if this run of this case earns it. */
  check: (c: CaseDef, cp: CaseProgress) => boolean
}

const closed = (cp: CaseProgress) => cp.stage === 'closed'

/** Leads whose evidence contradicts the stakeholder's theory (the one the verdict asks about). */
const theoryTests = (c: CaseDef) =>
  c.leads.filter((l) => c.evidence.find((e) => e.id === l.evidence)?.relations[c.verdict.theory.hypothesis] === 'contradicts')

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'case-closed',
    title: 'Case Closed',
    description: 'Close your first case.',
    hidden: false,
    check: (_c, cp) => closed(cp)
  },
  {
    id: 'root-cause',
    title: 'Root Cause',
    description: 'Name the real cause in your verdict.',
    hidden: false,
    check: (c, cp) => closed(cp) && c.hypotheses.find((h) => h.id === verdictOf(cp).cause)?.truth === 'cause'
  },
  {
    id: 'skeptic',
    title: 'Skeptic',
    description: "Check the data for problems before testing anyone's theory.",
    hidden: false,
    check: (c, cp) => {
      const dq = c.scoring.dataQualityLeads.map((id) => leadProgress(cp, id).cracked)
      if (dq.length === 0 || dq.some((t) => !t)) return false
      const lastCheck = dq.sort().at(-1)!
      const firstTest = theoryTests(c)
        .map((l) => leadProgress(cp, l.id).cracked)
        .filter((t): t is string => !!t)
        .sort()[0]
      return !firstTest || lastCheck < firstTest
    }
  },
  {
    id: 'control-group',
    title: 'Control Group',
    description: "Follow every lead that could disprove the stakeholder's theory.",
    hidden: false,
    check: (c, cp) => {
      const tests = theoryTests(c)
      return tests.length > 0 && tests.every((l) => isCracked(cp, l.id))
    }
  },
  {
    id: 'myth-buster',
    title: 'Myth Buster',
    description: "Rule out the stakeholder's theory on the board and say why in your verdict.",
    hidden: false,
    check: (c, cp) => {
      const t = c.verdict.theory
      const best = Math.max(...t.options.map((o) => o.score))
      return closed(cp) && cp.board[t.hypothesis]?.status === 'ruled-out' && t.options.find((o) => o.id === verdictOf(cp).theory)?.score === best
    }
  },
  {
    id: 'by-the-book',
    title: 'By the Book',
    description: 'Close a case without viewing any solution.',
    hidden: false,
    check: (c, cp) => closed(cp) && c.leads.every((l) => !leadProgress(cp, l.id).solutionViewed)
  },
  {
    id: 'unassisted',
    title: 'Unassisted',
    description: 'Close a case without a single hint.',
    hidden: false,
    check: (c, cp) => closed(cp) && c.leads.every((l) => leadProgress(cp, l.id).hintsUsed === 0 && !leadProgress(cp, l.id).solutionViewed)
  },
  {
    id: 'challenger',
    title: 'Challenger',
    description: 'Close a case in Challenge mode, rated Solid or better.',
    hidden: false,
    check: (_c, cp) => closed(cp) && cp.mode === 'challenge' && (cp.best?.grade === 'solid' || cp.best?.grade === 'distinguished')
  },
  {
    id: 'distinguished',
    title: 'Distinguished',
    description: 'Earn the top rating on a case.',
    hidden: false,
    check: (_c, cp) => closed(cp) && cp.best?.grade === 'distinguished'
  },
  {
    id: 'second-opinion',
    title: 'Second Opinion',
    description: 'Crack a lead with Python.',
    hidden: true,
    check: (c, cp) => c.leads.some((l) => leadProgress(cp, l.id).tool === 'python' && isCracked(cp, l.id))
  },
  {
    id: 'loose-thread',
    title: 'Loose Thread',
    description: 'Find a hidden lead nobody asked you to follow.',
    hidden: true,
    check: (c, cp) => c.leads.some((l) => l.secret && isCracked(cp, l.id))
  }
]

/** Achievements earned in this run of this case. */
export const earnedIn = (c: CaseDef, cp: CaseProgress): Achievement[] => ACHIEVEMENTS.filter((a) => a.check(c, cp))

/** Achievements earned in some case but not stored yet (to celebrate and store). */
export function newAchievements(p: ProgressData): Achievement[] {
  return ACHIEVEMENTS.filter(
    (a) => !p.academy.achievements[a.id] && cases.some((c) => (p.cases[c.id] ? a.check(c, p.cases[c.id]!) : false))
  )
}
