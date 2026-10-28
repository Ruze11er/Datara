// The Verdict tab: write the verdict (cause, evidence, recommendations, limitations, summary), face the
// stakeholders' pushback, then close the case. Once closed, the tab shows the debrief (CaseClosed.tsx).

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Gavel, LockKeyhole, MessageSquareQuote, SearchCheck } from 'lucide-react'
import type { CaseDef } from '@shared/cases/types'
import type { CaseProgress, CaseVerdict } from '@shared/progress'
import { Card } from '../../components/Page'
import { Markdown } from '../../components/Markdown'
import { withActivity } from '../../lib/activity'
import { useProgress } from '../../lib/ProgressContext'
import { caseStats, closeCase, heldEvidence, isVerdictOpen, verdictGaps, verdictOf, withCase, withVerdict } from '../../lib/caseProgress'
import { CaseClosed } from './CaseClosed'
import { castMember, FileLabel, Stamp } from './CaseParts'

export function VerdictTab({ c, cp }: { c: CaseDef; cp: CaseProgress }) {
  if (cp.stage === 'closed') return <CaseClosed c={c} cp={cp} />
  if (!isVerdictOpen(c, cp)) {
    const s = caseStats(c, cp)
    return (
      <Card className="mx-auto max-w-xl text-center">
        <LockKeyhole size={28} className="mx-auto text-slate-400" aria-hidden />
        <h2 className="mt-3 text-lg font-semibold text-slate-900">Not enough evidence for a verdict yet</h2>
        <p className="mt-2 text-slate-600">
          The Chief won't sign off on a hunch. Crack at least {c.scoring.verdictMinLeads} core leads first: you have{' '}
          {s.coreCracked} of {s.coreTotal}.
        </p>
        <Link
          to={`/academy/${c.id}/lab`}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          <SearchCheck size={15} aria-hidden /> Back to the investigation
        </Link>
      </Card>
    )
  }
  return cp.stage === 'pushback' ? <Pushback c={c} cp={cp} /> : <VerdictForm c={c} cp={cp} />
}

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <Card>
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-sm font-semibold text-slate-400">{String(n).padStart(2, '0')}</span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          {hint && <p className="mt-0.5 text-sm text-slate-500">{hint}</p>}
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </Card>
  )
}

/** A selectable option (radio or checkbox style). */
function Choice({
  selected,
  disabled = false,
  onClick,
  multi = false,
  children
}: {
  selected: boolean
  disabled?: boolean
  onClick: () => void
  multi?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role={multi ? 'checkbox' : 'radio'}
      aria-checked={selected}
      disabled={disabled && !selected}
      onClick={onClick}
      className={`flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left text-sm disabled:opacity-50 ${
        selected ? 'border-brand-500 bg-brand-50 text-slate-900' : 'border-slate-200 text-slate-700 hover:border-slate-300'
      }`}
    >
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border ${multi ? 'rounded' : 'rounded-full'} ${
          selected ? 'border-brand-600 bg-brand-600' : 'border-slate-300'
        }`}
        aria-hidden
      >
        {selected && <span className={`h-1.5 w-1.5 bg-white ${multi ? 'rounded-sm' : 'rounded-full'}`} />}
      </span>
      <span className="min-w-0">{children}</span>
    </button>
  )
}

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

function VerdictForm({ c, cp }: { c: CaseDef; cp: CaseProgress }) {
  const { update } = useProgress()
  const v = verdictOf(cp)
  const set = (change: (v: CaseVerdict) => Partial<CaseVerdict>) => update((p) => withVerdict(p, c.id, change))
  const evidence = heldEvidence(c, cp)
  const facts = evidence.filter((e) => e.kind === 'fact')
  const claims = evidence.filter((e) => e.kind === 'claim')
  const { citations, recommendations: recs, limitations: lims, theory } = c.verdict

  // The summary is saved shortly after typing stops, and when leaving the page.
  const [summary, setSummary] = useState(v.summary)
  const summaryRef = useRef(summary)
  const timer = useRef<number | null>(null)
  const saveSummary = () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
    const text = summaryRef.current
    update((p) => (verdictOf(p.cases[c.id]).summary === text ? p : withVerdict(p, c.id, () => ({ summary: text }))))
  }
  useEffect(
    () => () => {
      if (timer.current !== null) saveSummary()
    },
    []
  )
  const gaps = verdictGaps(c, { ...v, summary })
  const stats = caseStats(c, cp)
  const openCore = stats.coreTotal - stats.coreCracked

  return (
    <div className="space-y-4">
      <p className="text-slate-600">
        Time to tell the CEO what happened. Everything you choose here is saved as you go. When you present it, two people
        will push back, so make sure your evidence holds.
      </p>
      {openCore > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          You still have {openCore} open core lead{openCore === 1 ? '' : 's'}. You can present now, but your rating counts
          only the evidence you gathered.{' '}
          <Link to={`/academy/${c.id}/lab`} className="font-medium underline-offset-2 hover:underline">
            Keep investigating
          </Link>
        </p>
      )}

      <Step n={1} title="What caused the drop?" hint="Choose the main cause.">
        <div className="space-y-1.5" role="radiogroup">
          {c.hypotheses.map((h) => (
            <Choice key={h.id} selected={v.cause === h.id} onClick={() => set((cur) => ({ cause: h.id, contributors: cur.contributors.filter((x) => x !== h.id) }))}>
              {h.title}
            </Choice>
          ))}
        </div>
      </Step>

      <Step n={2} title="Did anything else make it look worse?" hint="Optional. Choose any that apply.">
        <div className="space-y-1.5">
          {c.hypotheses
            .filter((h) => h.id !== v.cause)
            .map((h) => (
              <Choice key={h.id} multi selected={v.contributors.includes(h.id)} onClick={() => set((cur) => ({ contributors: toggle(cur.contributors, h.id) }))}>
                {h.title}
              </Choice>
            ))}
        </div>
      </Step>

      <Step n={3} title={theory.question}>
        <div className="space-y-1.5" role="radiogroup">
          {theory.options.map((o) => (
            <Choice key={o.id} selected={v.theory === o.id} onClick={() => set(() => ({ theory: o.id }))}>
              {o.text}
            </Choice>
          ))}
        </div>
      </Step>

      <Step
        n={4}
        title="Which evidence proves it?"
        hint={`Cite ${citations.min} to ${citations.max} pieces of evidence (${v.citations.length} chosen). Facts prove things; claims don't.`}
      >
        <div className="space-y-1.5">
          {[...facts, ...claims].map((e) => (
            <Choice
              key={e.id}
              multi
              selected={v.citations.includes(e.id)}
              disabled={v.citations.length >= citations.max}
              onClick={() => set((cur) => ({ citations: toggle(cur.citations, e.id) }))}
            >
              <span className="flex flex-wrap items-center gap-1.5">
                <Stamp tone={e.kind === 'fact' ? 'solved' : 'alert'}>{e.kind}</Stamp>
                <span className="font-medium">{e.title}</span>
              </span>
              <Markdown text={e.summary} className="prose-compact mt-0.5 text-slate-500" />
            </Choice>
          ))}
        </div>
      </Step>

      <Step n={5} title={recs.question} hint={`${v.recommendations.length} of ${recs.pick} chosen.`}>
        <div className="space-y-1.5">
          {recs.options.map((o) => (
            <Choice
              key={o.id}
              multi
              selected={v.recommendations.includes(o.id)}
              disabled={v.recommendations.length >= recs.pick}
              onClick={() => set((cur) => ({ recommendations: toggle(cur.recommendations, o.id) }))}
            >
              {o.text}
            </Choice>
          ))}
        </div>
      </Step>

      <Step n={6} title={lims.question}>
        <div className="space-y-1.5">
          {lims.options.map((o) => (
            <Choice key={o.id} multi selected={v.limitations.includes(o.id)} onClick={() => set((cur) => ({ limitations: toggle(cur.limitations, o.id) }))}>
              {o.text}
            </Choice>
          ))}
        </div>
      </Step>

      <Step
        n={7}
        title="Your summary for the CEO"
        hint="A few sentences: what really happened, how you know, and what to do. You'll compare it with the Chief's version afterwards; it isn't graded."
      >
        <textarea
          value={summary}
          onChange={(e) => {
            setSummary(e.target.value)
            summaryRef.current = e.target.value
            if (timer.current !== null) window.clearTimeout(timer.current)
            timer.current = window.setTimeout(saveSummary, 600)
          }}
          onBlur={saveSummary}
          rows={6}
          className="w-full rounded-lg border border-slate-200 bg-surface px-3 py-2 text-[15px] text-slate-800"
          aria-label="Your summary for the CEO"
        />
      </Step>

      <Card className="flex flex-wrap items-center gap-4">
        {gaps.length > 0 ? (
          <ul className="min-w-0 flex-1 list-disc space-y-0.5 pl-5 text-sm text-slate-500">
            {gaps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        ) : (
          <p className="min-w-0 flex-1 text-sm text-slate-600">Your verdict is ready. You can still come back and change it until you close the case.</p>
        )}
        <button
          type="button"
          disabled={gaps.length > 0}
          onClick={() => {
            saveSummary()
            update((p) => withCase(p, c.id, () => ({ stage: 'pushback' })))
          }}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          <Gavel size={17} aria-hidden /> Present your findings
        </button>
      </Card>
    </div>
  )
}

function Pushback({ c, cp }: { c: CaseDef; cp: CaseProgress }) {
  const { update } = useProgress()
  const v = verdictOf(cp)
  const answered = c.verdict.pushback.filter((pb) => v.pushback[pb.id]).length
  const current = c.verdict.pushback.find((pb) => !v.pushback[pb.id])
  const [choice, setChoice] = useState<string | null>(null)

  const close = () =>
    update((p) => {
      const { progress } = closeCase(withActivity(p), c)
      return progress
    })

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <button
        type="button"
        onClick={() => update((p) => withCase(p, c.id, () => ({ stage: 'investigating' })))}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={15} aria-hidden /> Back to your verdict
      </button>
      <Card>
        <FileLabel>
          The pushback · {Math.min(answered + 1, c.verdict.pushback.length)} of {c.verdict.pushback.length}
        </FileLabel>
        {current ? (
          <>
            <div className="flex items-start gap-3">
              <MessageSquareQuote size={22} className="mt-1 shrink-0 text-amber-600" aria-hidden />
              <div>
                <p className="text-lg text-slate-900">{current.challenge}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {castMember(c, current.from)?.name}, {castMember(c, current.from)?.role}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-1.5" role="radiogroup" aria-label="Your answer">
              {current.options.map((o) => (
                <Choice key={o.id} selected={choice === o.id} onClick={() => setChoice(o.id)}>
                  {o.text}
                </Choice>
              ))}
            </div>
            <button
              type="button"
              disabled={!choice}
              onClick={() => {
                const picked = choice!
                setChoice(null)
                update((p) => withVerdict(p, c.id, (cur) => ({ pushback: { ...cur.pushback, [current.id]: picked } })))
              }}
              className="mt-4 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Answer
            </button>
          </>
        ) : (
          <div className="text-center">
            <p className="text-slate-700">You've answered every challenge. The Chief is ready to sign off.</p>
            <button
              type="button"
              onClick={close}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700"
            >
              <Gavel size={18} aria-hidden /> Close the case
            </button>
          </div>
        )}
      </Card>
    </div>
  )
}
