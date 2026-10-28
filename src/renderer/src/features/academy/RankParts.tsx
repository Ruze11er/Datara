// Rank, XP and achievement displays for the Academy page, the Dashboard and the debrief.

import { Award, CircleCheck, Circle, CircleHelp, LockKeyhole } from 'lucide-react'
import { RANKS, XP_RULES, type RankState, type XpBreakdown } from '@shared/academy'
import type { ProgressData } from '@shared/progress'
import { ACHIEVEMENTS } from '../../lib/achievements'
import { ProgressBar, Stamp } from './CaseParts'

const ROMAN = ['I', 'II', 'III', 'IV', 'V']

/** A badge with the rank number, like a detective's shield. */
export function RankBadge({ rank, size = 56 }: { rank: number; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full border-2 border-brand-500 bg-brand-50 font-mono font-bold text-brand-700"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      aria-hidden
    >
      {ROMAN[rank - 1]}
    </div>
  )
}

/** Current rank, XP, and what the next promotion needs. */
export function RankSummary({ state, compact = false }: { state: RankState; compact?: boolean }) {
  const { current, next, xp, needs } = state
  const fromXp = current.xp
  return (
    <div className="flex items-center gap-4">
      <RankBadge rank={current.rank} size={compact ? 44 : 56} />
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[11px] font-semibold tracking-widest text-slate-500 uppercase">
          Rank {ROMAN[current.rank - 1]} · {xp.toLocaleString()} XP
        </div>
        <div className={`font-semibold text-slate-900 ${compact ? 'text-base' : 'text-xl'}`}>{current.title}</div>
        {next && needs && (
          <div className="mt-2">
            <ProgressBar value={Math.min(xp, next.xp) - fromXp} max={next.xp - fromXp} label={`XP towards ${next.title}`} />
            <div className="mt-1 text-xs text-slate-500">
              {needs.xp > 0 ? `${needs.xp.toLocaleString()} XP to ${next.title}` : `Enough XP for ${next.title}`}
              {!compact &&
                (needs.noCaseYet
                  ? ' · The promotion case for this rank is still on its way.'
                  : needs.cases.some((c) => !c.done)
                    ? ` · Also close ${needs.cases.filter((c) => !c.done).map((c) => c.title).join(', ')} (Solid or better)`
                    : '')}
            </div>
          </div>
        )}
        {!next && <div className="mt-1 text-xs text-slate-500">The highest rank in the Academy.</div>}
      </div>
    </div>
  )
}

/** The ranks ladder with what each promotion needs. */
export function RankLadder({ state }: { state: RankState }) {
  return (
    <ol className="space-y-1.5">
      {RANKS.map((r) => {
        const reached = r.rank <= state.current.rank
        return (
          <li key={r.rank} className={`flex items-center gap-3 text-sm ${reached ? 'text-slate-800' : 'text-slate-500'}`}>
            {reached ? (
              <CircleCheck size={15} className="shrink-0 text-brand-600" aria-label="Reached" />
            ) : (
              <Circle size={15} className="shrink-0 text-slate-300" aria-label="Not yet" />
            )}
            <span className="w-6 font-mono text-xs">{ROMAN[r.rank - 1]}</span>
            <span className="flex-1 font-medium">{r.title}</span>
            <span className="text-xs">{r.xp ? `${r.xp.toLocaleString()} XP + a case` : 'Start'}</span>
          </li>
        )
      })}
    </ol>
  )
}

/** Where the XP comes from, and the rules (XP is transparent). */
export function XpRules({ xp }: { xp: XpBreakdown }) {
  const rows: [string, number, string][] = [
    ['SQL and Python levels', xp.labs, `${XP_RULES.levelSolved} per level solved + ${XP_RULES.perStar} per star`],
    ['Lessons', xp.lessons, `${XP_RULES.lessonCompleted} per lesson + up to ${XP_RULES.quizBonus} for the quiz`],
    [
      'Cases',
      xp.cases,
      `${XP_RULES.casePerPoint} per rating point, +${XP_RULES.caseChallenge} in Challenge mode, +${XP_RULES.caseUnassistedLead} per lead cracked without help (best run counts)`
    ],
    ['Achievements', xp.achievements, `${XP_RULES.achievement} each`]
  ]
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map(([label, value, rule]) => (
          <tr key={label} className="border-b border-slate-100 last:border-0">
            <td className="py-1.5 pr-3 font-medium text-slate-800">{label}</td>
            <td className="py-1.5 pr-3 text-right font-mono text-slate-700">{value.toLocaleString()}</td>
            <td className="py-1.5 text-xs text-slate-500">{rule}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Every achievement: earned ones with their date, others greyed (hidden ones as ???). */
export function AchievementGrid({ progress, highlight = [] }: { progress: ProgressData; highlight?: string[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {ACHIEVEMENTS.map((a) => {
        const at = progress.academy.achievements[a.id]
        const secret = a.hidden && !at
        return (
          <li
            key={a.id}
            className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${
              at ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-surface'
            }`}
          >
            {at ? (
              <Award size={20} className="mt-0.5 shrink-0 text-amber-500" aria-hidden />
            ) : secret ? (
              <CircleHelp size={20} className="mt-0.5 shrink-0 text-slate-300" aria-hidden />
            ) : (
              <LockKeyhole size={18} className="mt-0.5 shrink-0 text-slate-300" aria-hidden />
            )}
            <div className="min-w-0">
              <div className={`flex items-center gap-1.5 font-semibold ${at ? 'text-slate-900' : 'text-slate-500'}`}>
                {secret ? '???' : a.title}
                {highlight.includes(a.id) && <Stamp tone="alert">New</Stamp>}
              </div>
              <div className="text-xs text-slate-500">
                {secret ? 'Keep investigating.' : a.description}
                {at && ` · ${new Date(at).toLocaleDateString(undefined, { dateStyle: 'medium' })}`}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
