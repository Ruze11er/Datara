// The debrief, shown once a case is closed: the rating and what earned it, what really happened, the theories,
// the learner's summary next to the model answer (self-checked), other ways to crack each lead, what to practise
// next, and how this applies on the job.

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Award, BookOpen, CircleCheck, CircleDot, RotateCcw, TriangleAlert } from 'lucide-react'
import { GRADES } from '@shared/cases/scoring'
import type { CaseDef, HypothesisTruth } from '@shared/cases/types'
import type { CaseProgress } from '@shared/progress'
import { Card } from '../../components/Page'
import { Markdown } from '../../components/Markdown'
import { getLesson } from '../../content'
import { useProgress } from '../../lib/ProgressContext'
import { academyRank } from '../../lib/academyXp'
import { earnedIn } from '../../lib/achievements'
import { isCracked, leadProgress, runXpOf, scoreOf, startCase, verdictOf, withCase } from '../../lib/caseProgress'
import { FileLabel, ProgressBar, Stamp, type StampTone } from './CaseParts'
import { RankSummary } from './RankParts'

const TRUTH: Record<HypothesisTruth, { label: string; tone: StampTone }> = {
  cause: { label: 'The cause', tone: 'solved' },
  contributor: { label: 'Made it worse', tone: 'open' },
  'ruled-out': { label: 'Ruled out', tone: 'neutral' }
}
const STATUS_WORDS = { open: 'left open', supported: 'supported', 'ruled-out': 'ruled out' }

export function CaseClosed({ c, cp }: { c: CaseDef; cp: CaseProgress }) {
  const { update } = useProgress()
  const navigate = useNavigate()
  const score = scoreOf(c, cp)
  const grade = GRADES.find((g) => g.grade === score.grade)!
  const verdict = verdictOf(cp)
  const closedOn = cp.closedAt ? new Date(cp.closedAt).toLocaleDateString(undefined, { dateStyle: 'long' }) : ''

  // Leads to practise: not cracked, or cracked with hints or the solution.
  const practise = c.leads.filter((l) => {
    const lp = leadProgress(cp, l.id)
    return !l.secret && (!lp.cracked || lp.hintsUsed > 0 || lp.solutionViewed)
  })
  const lessons = [...new Set(practise.map((l) => l.lesson).filter((id): id is string => !!id))]
    .map((id) => getLesson(id))
    .filter((l) => l !== undefined)

  const replay = () => {
    if (!window.confirm('Replay this case from the start? Your best rating is kept.')) return
    update((p) => startCase(p, c, cp.mode))
    navigate(`/academy/${c.id}/lab`)
  }

  return (
    <div className="space-y-6">
      <Card className="text-center">
        <FileLabel>Case closed</FileLabel>
        <div className="mt-2 inline-block -rotate-2 rounded-lg border-4 border-current px-6 py-2 font-mono text-2xl font-bold tracking-widest uppercase">
          <span className={score.grade === 'reopened' ? 'text-amber-600' : 'text-brand-700'}>{grade.label}</span>
        </div>
        <p className="mt-4 text-4xl font-semibold text-slate-900">
          {score.total}
          <span className="text-xl text-slate-400"> / 100</span>
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Closed {closedOn}
          {cp.best && cp.best.total !== score.total && ` · Your best: ${cp.best.total} (${GRADES.find((g) => g.grade === cp.best!.grade)?.label})`}
        </p>
        {score.capped && (
          <p className="mx-auto mt-3 flex max-w-xl items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-left text-sm text-amber-900">
            <TriangleAlert size={16} className="mt-0.5 shrink-0 text-amber-600" aria-hidden /> {score.capped}
          </p>
        )}
        <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500">
          The rating measures the investigation only. Hints, failed checks and time never lower it.
        </p>
      </Card>

      <Rewards c={c} cp={cp} total={score.total} />

      <section>
        <FileLabel>How the rating adds up</FileLabel>
        <div className="space-y-3">
          {score.dimensions.map((d) => (
            <Card key={d.id}>
              <div className="flex items-center gap-4">
                <h3 className="w-40 shrink-0 font-semibold text-slate-900">{d.label}</h3>
                <div className="min-w-0 flex-1">
                  <ProgressBar value={d.score} max={d.max} label={`${d.label} score`} />
                </div>
                <span className="w-16 shrink-0 text-right font-mono text-sm text-slate-600">
                  {Math.round(d.score)}/{d.max}
                </span>
              </div>
              {(d.good.length > 0 || d.missed.length > 0) && (
                <ul className="mt-3 space-y-1 text-sm">
                  {d.good.map((g) => (
                    <li key={`g-${g}`} className="flex items-start gap-2 text-slate-700">
                      <CircleCheck size={15} className="mt-0.5 shrink-0 text-brand-600" aria-label="Done well" /> {g}
                    </li>
                  ))}
                  {d.missed.map((m) => (
                    <li key={`m-${m}`} className="flex items-start gap-2 text-slate-700">
                      <CircleDot size={15} className="mt-0.5 shrink-0 text-amber-600" aria-label="Missed" /> {m}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      </section>

      <Card>
        <FileLabel>What really happened</FileLabel>
        <Markdown text={c.debrief.story} className="prose-lesson" />
      </Card>

      <section>
        <FileLabel>The theories</FileLabel>
        <div className="grid gap-3 md:grid-cols-2">
          {c.hypotheses.map((h) => {
            const t = TRUTH[h.truth]
            const yours = cp.board[h.id]?.status ?? 'open'
            return (
              <Card key={h.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <Stamp tone={t.tone}>{t.label}</Stamp>
                  <h3 className="font-semibold text-slate-900">{h.title}</h3>
                </div>
                <p className="mt-1.5 text-sm text-slate-700">{h.explanation}</p>
                <p className="mt-1.5 text-xs text-slate-500">On your board: {STATUS_WORDS[yours]}</p>
              </Card>
            )
          })}
        </div>
      </section>

      <section>
        <FileLabel>Your summary and the Chief's</FileLabel>
        <div className="grid gap-3 md:grid-cols-2">
          <Card>
            <h3 className="text-sm font-semibold text-slate-500">Yours</h3>
            <p className="mt-2 text-[15px] whitespace-pre-wrap text-slate-800">{verdict.summary || '(no summary)'}</p>
          </Card>
          <Card>
            <h3 className="text-sm font-semibold text-slate-500">The Chief's</h3>
            <Markdown text={c.verdict.modelSummary} className="mt-2 text-[15px]" />
          </Card>
        </div>
        <Card className="mt-3">
          <h3 className="font-semibold text-slate-900">Check your summary</h3>
          <p className="mt-0.5 text-sm text-slate-500">Tick what yours does. Be honest: this is for you, it isn't graded.</p>
          <ul className="mt-3 space-y-1.5">
            {c.verdict.summaryChecklist.map((item, i) => {
              const checked = cp.summaryChecks.includes(i)
              return (
                <li key={item}>
                  <label className="flex items-start gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        update((p) =>
                          withCase(p, c.id, (cur) => ({
                            summaryChecks: checked ? cur.summaryChecks.filter((x) => x !== i) : [...cur.summaryChecks, i]
                          }))
                        )
                      }
                      className="mt-0.5 accent-brand-600"
                    />
                    {item}
                  </label>
                </li>
              )
            })}
          </ul>
        </Card>
      </section>

      <section>
        <FileLabel>Other ways to crack the leads</FileLabel>
        <div className="space-y-2">
          {c.leads.map((l) => {
            const lp = leadProgress(cp, l.id)
            return (
              <details key={l.id} className="rounded-xl border border-slate-200 bg-surface px-4 py-3">
                <summary className="cursor-pointer font-medium text-slate-800">
                  {l.title}
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    {isCracked(cp, l.id) ? `cracked with ${lp.tool === 'python' ? 'Python' : 'SQL'}` : 'not cracked'}
                  </span>
                </summary>
                <div className="mt-3 space-y-3">
                  {l.sql.solutions.map((s, i) => (
                    <div key={i}>
                      {s.note && <p className="mb-1 text-sm text-slate-600">{s.note}</p>}
                      <pre className="overflow-x-auto rounded-lg bg-code px-3 py-2 font-mono text-[13px] text-code-fg">{s.query.trim()}</pre>
                    </div>
                  ))}
                  {l.python && (
                    <div>
                      <p className="mb-1 text-sm text-slate-600">In Python (pandas):</p>
                      <pre className="overflow-x-auto rounded-lg bg-code px-3 py-2 font-mono text-[13px] text-code-fg">{l.python.solution.trim()}</pre>
                    </div>
                  )}
                  <Markdown text={l.sql.explanation} className="prose-compact text-slate-700" />
                </div>
              </details>
            )
          })}
        </div>
      </section>

      <Card>
        <FileLabel>What to practise next</FileLabel>
        {lessons.length > 0 ? (
          <>
            <p className="text-sm text-slate-600">Based on the leads you skipped or needed help with:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {lessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  to={`/learn/${lesson.id}`}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-sm text-slate-600 hover:border-brand-500"
                >
                  <BookOpen size={13} className="text-brand-600" aria-hidden /> {lesson.title}
                </Link>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-600">
            You cracked every lead without help.{' '}
            {cp.mode === 'guided' ? 'Next time, try the case in Challenge mode.' : 'Clean work.'}
          </p>
        )}
      </Card>

      <Card>
        <FileLabel>On the job</FileLabel>
        <Markdown text={c.debrief.career} />
      </Card>

      <div className="flex flex-wrap justify-center gap-3 pb-4">
        <button
          type="button"
          onClick={replay}
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
        >
          <RotateCcw size={16} aria-hidden /> Replay the case
        </button>
        <Link to="/academy" className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700">
          Back to the Academy
        </Link>
      </div>
    </div>
  )
}

/** Counts up to `value` once (instantly when the system asks for reduced motion). */
function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? value : 0
  )
  useEffect(() => {
    if (shown === value) return
    const start = performance.now()
    let frame = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 900)
      setShown(Math.round(value * (1 - (1 - t) ** 3)))
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [value])
  return <>{shown.toLocaleString()}</>
}

/** XP this run earned, the rank it moves you towards, and the achievements it earned. */
function Rewards({ c, cp, total }: { c: CaseDef; cp: CaseProgress; total: number }) {
  const { progress } = useProgress()
  if (!progress) return null
  const runXp = runXpOf(c, cp, total)
  const bestXp = cp.best?.xp ?? runXp
  const achievements = earnedIn(c, cp)
  const isNew = (id: string) => {
    const at = progress.academy.achievements[id]
    return !!at && !!cp.closedAt && at >= cp.closedAt.slice(0, 16)
  }
  return (
    <Card>
      <FileLabel>Rewards</FileLabel>
      <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
        <div className="text-center md:pr-6">
          <div className="font-mono text-4xl font-bold text-brand-700">
            +<CountUp value={runXp} />
          </div>
          <div className="text-sm text-slate-500">XP for this run</div>
        </div>
        <RankSummary state={academyRank(progress)} />
      </div>
      {bestXp > runXp && (
        <p className="mt-3 text-sm text-slate-500">
          Your best run of this case earned {bestXp.toLocaleString()} XP. A case counts its best run, so your XP stays.
        </p>
      )}
      {achievements.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {achievements.map((a) => (
            <li key={a.id} className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-sm text-slate-800">
              <Award size={15} className="text-amber-500" aria-hidden /> {a.title}
              {isNew(a.id) && <Stamp tone="alert">New</Stamp>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
