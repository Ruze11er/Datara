// The Investigation Lab: leads on the left, a SQL editor and results on the right.
// Every Run is compared with all open leads (and undiscovered hidden ones): a matching result cracks the lead
// and files the learner's own result as evidence. "Check lead" also explains what's wrong for the selected lead.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Circle, CircleCheck, CircleX, LoaderCircle, SquarePen } from 'lucide-react'
import type { CaseDef, Lead } from '@shared/cases/types'
import type { CaseProgress, ProgressData } from '@shared/progress'
import { friendlySqlError } from '@shared/sqlCheck'
import { CodeEditor, type CodeEditorHandle } from '../../components/CodeEditor'
import { Markdown } from '../../components/Markdown'
import { TableOrChart } from '../../components/TableOrChart'
import type { CaseDatasets } from '../../content'
import { runSql } from '../../engines/sql/sqlEngine'
import type { SqlResult } from '../../engines/sql/types'
import { withActivity } from '../../lib/activity'
import { useProgress } from '../../lib/ProgressContext'
import { useSchema } from '../../lib/storeSchema'
import {
  caseProgress,
  crackLead,
  hiddenLeadCount,
  isCracked,
  leadProgress,
  leadsToMatch,
  visibleLeads,
  withCase,
  withLead,
  type CrackReveal
} from '../../lib/caseProgress'
import { HelpSection, LessonLink, SectionTitle, Toolbar } from '../labs/LevelParts'
import { SchemaPanel } from '../sql-lab/SchemaPanel'
import { compareWithLeads, prefetchLeads, type LeadVerdict } from './caseEngine'
import { EvidenceCard, Stamp } from './CaseParts'

const BLANK = '-- Write a query to investigate, then press Run.\n'
const AUTOSAVE_MS = 700

type Output =
  | { kind: 'idle' }
  | { kind: 'running'; label: string }
  | { kind: 'error'; message: string; raw: string }
  | {
      kind: 'result'
      label: string
      result: SqlResult
      /** Leads this result cracked. */
      reveals: CrackReveal[]
      /** Near misses and feedback (typed-in values, known mistakes, the checked lead's problem). */
      notes: Exclude<LeadVerdict, { kind: 'cracked' }>[]
    }

/** The lead to show: the saved choice if it's visible, else the first open one. */
function focusedLead(c: CaseDef, cp: CaseProgress): Lead | undefined {
  const leads = visibleLeads(c, cp)
  return leads.find((l) => l.id === cp.focusLead) ?? leads.find((l) => !isCracked(cp, l.id)) ?? leads[0]
}

export function InvestigationLab({ c, cp, datasets }: { c: CaseDef; cp: CaseProgress; datasets: CaseDatasets }) {
  const { progress, update } = useProgress()
  const schema = useSchema(datasets.practice)
  const editor = useRef<CodeEditorHandle>(null)
  const focus = focusedLead(c, cp)
  const guided = cp.mode === 'guided'
  const code = useRef(cp.draft ?? (guided && focus ? focus.sql.starter : BLANK))
  const [output, setOutput] = useState<Output>({ kind: 'idle' })
  const busy = output.kind === 'running'

  // Work out the leads' answers in the background, so the first Run is quick.
  const initialLeads = useRef(leadsToMatch(c, cp))
  useEffect(() => prefetchLeads(c, datasets, initialLeads.current), [c, datasets])

  // ---- Autosave the editor text.
  const saveTimer = useRef<number | null>(null)
  const saveDraft = useCallback(() => {
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current)
    saveTimer.current = null
    const text = code.current
    update((p) => (p.cases[c.id]?.draft === text ? p : withCase(p, c.id, () => ({ draft: text }))))
  }, [update, c.id])
  const onChange = useCallback(
    (text: string) => {
      code.current = text
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(saveDraft, AUTOSAVE_MS)
    },
    [saveDraft]
  )
  useEffect(
    () => () => {
      if (saveTimer.current !== null) saveDraft()
    },
    [saveDraft]
  )

  const setCode = (text: string) => {
    code.current = text
    editor.current?.setValue(text)
    editor.current?.focus()
    saveDraft()
  }

  const selectLead = (id: string) => update((p) => withCase(p, c.id, () => ({ focusLead: id })))

  const investigate = async (check: boolean) => {
    const sql = code.current
    if (!sql.trim()) return
    saveDraft()
    const checked = check && focus && !isCracked(cp, focus.id) ? focus : undefined
    setOutput({ kind: 'running', label: checked ? 'Checking the lead…' : 'Running…' })
    if (checked) update((p) => withActivity(withLead(p, c.id, checked.id, (cur) => ({ attempts: cur.attempts + 1 }))))

    let result: SqlResult
    try {
      result = await runSql({ sql, dataset: datasets.practice })
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err)
      setOutput({ kind: 'error', message: friendlySqlError(raw), raw })
      return
    }

    let verdicts: LeadVerdict[] = []
    try {
      verdicts = await compareWithLeads(c, datasets, sql, result, leadsToMatch(c, cp), checked)
    } catch {
      // If the comparison fails, the learner still sees their result.
    }
    const reveals: CrackReveal[] = []
    const cracked = verdicts.filter((v) => v.kind === 'cracked')
    if (cracked.length > 0) {
      update((p) => {
        let next: ProgressData = checked ? p : withActivity(p)
        for (const v of cracked) {
          if (isCracked(caseProgress(next, c.id), v.lead.id)) continue
          const step = crackLead(next, c, v.lead, v.solution, result)
          next = step.progress
          reveals.push(step.reveal)
        }
        // If the lead in focus was cracked, move on: to a lead it revealed, or the next open one.
        const after = caseProgress(next, c.id)
        if (after && focus && isCracked(after, focus.id)) {
          const nextLead = reveals.flatMap((r) => r.newLeads)[0] ?? visibleLeads(c, after).find((l) => !isCracked(after, l.id))
          if (nextLead) next = withCase(next, c.id, () => ({ focusLead: nextLead.id }))
        }
        return next
      })
    }
    setOutput({
      kind: 'result',
      label: 'Your query result',
      result,
      reveals,
      notes: verdicts.filter((v): v is Exclude<LeadVerdict, { kind: 'cracked' }> => v.kind !== 'cracked')
    })
  }

  const preview = async (table: string) => {
    setOutput({ kind: 'running', label: 'Loading preview…' })
    try {
      const result = await runSql({ sql: `SELECT * FROM ${table} LIMIT 10`, dataset: datasets.practice })
      setOutput({ kind: 'result', label: `Preview: first 10 rows of ${table}`, result, reveals: [], notes: [] })
    } catch (err) {
      setOutput({ kind: 'error', message: String(err), raw: String(err) })
    }
  }

  if (!progress) return null
  const autocomplete = Object.fromEntries((schema ?? []).map((t) => [t.name, t.columns.map((col) => col.name)]))
  const focusCracked = !!focus && isCracked(cp, focus.id)

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(300px,380px)_1fr]">
      <aside className="min-h-0 space-y-5 overflow-y-auto border-r border-slate-200 bg-surface p-5">
        <LeadList c={c} cp={cp} focus={focus} onSelect={selectLead} />
        {focus && (
          <LeadDetail
            c={c}
            cp={cp}
            lead={focus}
            guided={guided}
            onStarter={() => setCode(focus.sql.starter)}
            onHint={() =>
              update((p) => withLead(p, c.id, focus.id, (cur) => ({ hintsUsed: Math.min(cur.hintsUsed + 1, focus.sql.hints.length) })))
            }
            onSolution={() => {
              const ok = window.confirm(
                'Show the solution? Your case rating will not change, but this lead will no longer count as cracked without help.'
              )
              if (ok) update((p) => withLead(p, c.id, focus.id, () => ({ solutionViewed: true })))
            }}
          />
        )}
        <section>
          <SectionTitle>Tables</SectionTitle>
          <SchemaPanel schema={schema} focus={[]} onPreview={preview} />
          <Link to={`/academy/${c.id}/evidence`} className="mt-2 inline-block text-sm font-medium text-brand-700 hover:underline">
            What the columns mean (Evidence Room)
          </Link>
        </section>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-col">
        <div className="h-[38%] min-h-[150px] border-b border-slate-200">
          {schema ? (
            <CodeEditor
              ref={editor}
              language="sql"
              initialValue={code.current}
              onChange={onChange}
              onRun={() => void investigate(false)}
              onCheck={() => void investigate(true)}
              schema={autocomplete}
              fontSize={progress.settings.editorFontSize}
            />
          ) : (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500">
              <LoaderCircle size={16} className="animate-spin" aria-hidden /> Loading the tables…
            </div>
          )}
        </div>
        <Toolbar
          busy={busy || !schema}
          onRun={() => void investigate(false)}
          onCheck={() => void investigate(true)}
          onReset={() => setCode(guided && focus && !focusCracked ? focus.sql.starter : BLANK)}
          checkLabel="Check lead"
          checkDisabled={!focus || focusCracked}
          resetLabel="Clear"
          resetTitle={guided ? "Put the selected lead's starter query in the editor" : 'Empty the editor'}
        />
        <LabOutput output={output} c={c} onSelectLead={selectLead} />
      </section>
    </div>
  )
}

function LeadList({
  c,
  cp,
  focus,
  onSelect
}: {
  c: CaseDef
  cp: CaseProgress
  focus: Lead | undefined
  onSelect: (id: string) => void
}) {
  const leads = visibleLeads(c, cp)
  const hidden = hiddenLeadCount(c, cp)
  return (
    <section>
      <SectionTitle>Leads</SectionTitle>
      <ul className="space-y-0.5">
        {leads.map((l) => {
          const cracked = isCracked(cp, l.id)
          const selected = focus?.id === l.id
          return (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => onSelect(l.id)}
                aria-current={selected ? 'true' : undefined}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm ${
                  selected ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {cracked ? (
                  <CircleCheck size={15} className="shrink-0 text-brand-600" aria-label="Cracked" />
                ) : (
                  <Circle size={15} className="shrink-0 text-slate-400" aria-label="Open" />
                )}
                <span className={`min-w-0 flex-1 truncate ${cracked && !selected ? 'text-slate-500' : ''}`}>{l.title}</span>
                {l.secret ? (
                  <Stamp tone="alert">Hidden</Stamp>
                ) : (
                  !l.core && <span className="shrink-0 text-[11px] text-slate-400">Optional</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      {hidden > 0 && (
        <p className="mt-2 px-2.5 text-xs text-slate-500">
          {hidden} more lead{hidden === 1 ? '' : 's'} will surface as you investigate.
        </p>
      )}
    </section>
  )
}

function LeadDetail({
  c,
  cp,
  lead,
  guided,
  onStarter,
  onHint,
  onSolution
}: {
  c: CaseDef
  cp: CaseProgress
  lead: Lead
  guided: boolean
  onStarter: () => void
  onHint: () => void
  onSolution: () => void
}) {
  const lp = leadProgress(cp, lead.id)
  const cracked = !!lp.cracked
  const evidence = c.evidence.find((e) => e.id === lead.evidence)
  const note = lp.solution !== undefined ? lead.sql.solutions[lp.solution]?.note : undefined
  return (
    <>
      <section className="rounded-lg border border-slate-200 p-4">
        <Stamp tone={cracked ? 'solved' : 'open'}>{cracked ? 'Cracked' : 'Open lead'}</Stamp>
        <h3 className="mt-1.5 font-semibold text-slate-900">{lead.title}</h3>
        <Markdown text={lead.question} className="mt-1 text-slate-700" />
        {guided && !cracked && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <Markdown text={lead.guidedTask} className="prose-compact text-slate-700" />
            <button
              type="button"
              onClick={onStarter}
              className="mt-2 flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <SquarePen size={14} aria-hidden /> Put the starter query in the editor
            </button>
          </div>
        )}
        {cracked && (
          <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
            {note && <p className="text-sm text-slate-600">{note}</p>}
            <div>
              <SectionTitle>Why it works</SectionTitle>
              <Markdown text={lead.sql.explanation} className="prose-compact text-slate-700" />
            </div>
            {evidence && <EvidenceCard c={c} evidence={evidence} record={cp.evidence[evidence.id]} />}
          </div>
        )}
      </section>
      {!cracked && (
        <HelpSection
          level={{ hints: lead.sql.hints, solution: lead.sql.solutions[0]?.query ?? '' }}
          lp={{ status: 'unsolved', hintsUsed: lp.hintsUsed, solutionViewed: lp.solutionViewed }}
          onHint={onHint}
          onSolution={onSolution}
          unaidedNote="Hints never lower your case rating."
        />
      )}
      <LessonLink lessonId={lead.lesson} />
    </>
  )
}

function LabOutput({ output, c, onSelectLead }: { output: Output; c: CaseDef; onSelectLead: (id: string) => void }) {
  if (output.kind === 'idle') {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-slate-400">
        <p className="max-w-md">
          Write a query above and press <b className="text-slate-500">Run</b>. Every result is compared with your open leads:
          when it answers one, the lead is cracked and your finding is filed as evidence. Press{' '}
          <b className="text-slate-500">Check lead</b> for feedback on the selected lead.
        </p>
      </div>
    )
  }
  if (output.kind === 'running') {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-slate-500">
        <LoaderCircle size={16} className="animate-spin" aria-hidden /> {output.label}
      </div>
    )
  }
  if (output.kind === 'error') {
    return (
      <div className="flex-1 overflow-auto p-4">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex items-center gap-2 font-semibold text-red-800">
            <CircleX size={16} aria-hidden /> Your query has an error
          </div>
          <p className="mt-1 text-sm text-red-900">{output.message}</p>
          {output.raw !== output.message && <p className="mt-2 font-mono text-xs text-red-700/80">{output.raw}</p>}
        </div>
      </div>
    )
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div aria-live="polite" className="max-h-[45%] shrink-0 overflow-y-auto">
        {output.reveals.map((r) => (
          <CrackedBanner key={r.lead.id} c={c} reveal={r} onSelectLead={onSelectLead} />
        ))}
        {output.notes.map((n) => (
          <NoteBanner key={`${n.kind}-${n.lead.id}`} note={n} />
        ))}
      </div>
      <div className="min-h-0 flex-1">
        <TableOrChart label={output.label} columns={output.result.columns} rows={output.result.rows} truncated={output.result.truncated} />
      </div>
    </div>
  )
}

function CrackedBanner({ c, reveal, onSelectLead }: { c: CaseDef; reveal: CrackReveal; onSelectLead: (id: string) => void }) {
  const note = reveal.lead.sql.solutions[reveal.solution]?.note
  return (
    <div className="flex items-start gap-3 border-b border-brand-100 bg-brand-50 px-4 py-3">
      <CircleCheck size={22} className="shrink-0 text-brand-600" aria-hidden />
      <div className="min-w-0 space-y-0.5 text-sm text-slate-600">
        <div className="flex flex-wrap items-center gap-2 text-base font-semibold text-brand-700">
          Lead cracked: {reveal.lead.title}
          {reveal.lead.secret && <Stamp tone="alert">Hidden lead found</Stamp>}
        </div>
        {reveal.evidence && (
          <p>
            New evidence filed: <b className="text-slate-800">{reveal.evidence.title}</b>. {reveal.evidence.summary}
          </p>
        )}
        {note && <p>{note}</p>}
        {reveal.newLeads.length > 0 && (
          <p>
            New lead{reveal.newLeads.length === 1 ? '' : 's'}:{' '}
            {reveal.newLeads.map((l, i) => (
              <span key={l.id}>
                {i > 0 && ', '}
                <button type="button" onClick={() => onSelectLead(l.id)} className="font-medium text-brand-700 hover:underline">
                  {l.title}
                </button>
              </span>
            ))}
          </p>
        )}
        {reveal.newDocuments.length > 0 && (
          <p>
            New in the case files: {reveal.newDocuments.map((d) => `"${d.title}"`).join(', ')}.{' '}
            <Link to={`/academy/${c.id}/evidence`} className="font-medium text-brand-700 hover:underline">
              Open the Evidence Room
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}

function NoteBanner({ note }: { note: Exclude<LeadVerdict, { kind: 'cracked' }> }) {
  const title =
    note.kind === 'almost' ? `Almost: ${note.lead.title}` : note.kind === 'miss' ? `${note.outcome.title}: ${note.lead.title}` : `Not quite: ${note.lead.title}`
  const message = note.kind === 'almost' ? note.message : note.kind === 'misconception' ? note.feedback : note.outcome.message
  return (
    <div className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3">
      <CircleX size={20} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
      <div className="min-w-0">
        <div className="font-semibold text-amber-900">{title}</div>
        <Markdown text={message} className="prose-compact prose-feedback text-amber-900/90" />
      </div>
    </div>
  )
}
