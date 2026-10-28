// The Detective Board: one card per theory (hypothesis). The learner links evidence to each theory as supporting
// or contradicting it, and marks each theory supported, ruled out or still open. Two views of the same data:
// columns (with drag and drop, plus buttons for keyboard users) and a notebook table. Plus the learner's own notes.

import { useState, type DragEvent } from 'react'
import { ArrowDown, ArrowUp, GripVertical, Link2, Plus, StickyNote, Trash2, X } from 'lucide-react'
import type { CaseDef, Evidence, Hypothesis, HypothesisStatus, Relation } from '@shared/cases/types'
import type { CaseProgress } from '@shared/progress'
import { Markdown } from '../../components/Markdown'
import { useProgress } from '../../lib/ProgressContext'
import { heldEvidence, withCase, withHypothesisStatus, withLink } from '../../lib/caseProgress'
import { castMember, FileLabel, Stamp } from './CaseParts'

type View = 'columns' | 'notebook'
let lastView: View = 'columns'

const STATUSES: { id: HypothesisStatus; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'supported', label: 'Supported' },
  { id: 'ruled-out', label: 'Ruled out' }
]

const DRAG_TYPE = 'application/x-datara-evidence'

export function DetectiveBoard({ c, cp }: { c: CaseDef; cp: CaseProgress }) {
  const { update } = useProgress()
  const [view, setViewState] = useState<View>(lastView)
  const setView = (v: View) => {
    lastView = v
    setViewState(v)
  }
  const [dragging, setDragging] = useState<string | null>(null)
  const evidence = heldEvidence(c, cp)
  const readOnly = cp.stage === 'closed'

  const setStatus = (h: string, s: HypothesisStatus) => update((p) => withHypothesisStatus(p, c.id, h, s))
  const link = (h: string, e: string, r: Relation | null) => update((p) => withLink(p, c.id, h, e, r))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-4">
        <p className="max-w-2xl text-slate-600">
          Every theory is a suspect. Link your evidence to each one: does it <b className="text-slate-800">support</b> the
          theory or <b className="text-slate-800">contradict</b> it? Then decide which theories hold up. Claims are what people
          say; only facts prove anything.
        </p>
        <div className="ml-auto flex rounded-md bg-slate-100 p-0.5" role="tablist" aria-label="Board view">
          {(['columns', 'notebook'] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`rounded px-2.5 py-1 text-xs font-medium ${
                view === v ? 'bg-surface text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {v === 'columns' ? 'Board' : 'Notebook'}
            </button>
          ))}
        </div>
      </div>
      {readOnly && (
        <p className="rounded-lg bg-slate-50 px-4 py-2 text-sm text-slate-600">This case is closed. The board is shown as you left it.</p>
      )}

      {view === 'columns' ? (
        <>
          <section>
            <FileLabel>Your evidence</FileLabel>
            <ul className="flex flex-wrap gap-2">
              {evidence.map((e) => (
                <li
                  key={e.id}
                  draggable={!readOnly}
                  onDragStart={(ev: DragEvent) => {
                    ev.dataTransfer.setData(DRAG_TYPE, e.id)
                    ev.dataTransfer.effectAllowed = 'link'
                    setDragging(e.id)
                  }}
                  onDragEnd={() => setDragging(null)}
                  title={e.summary}
                  className={`flex items-center gap-1.5 rounded-lg border bg-surface px-2.5 py-1.5 text-sm ${
                    readOnly ? '' : 'cursor-grab active:cursor-grabbing'
                  } ${e.kind === 'fact' ? 'border-brand-100' : 'border-amber-200'}`}
                >
                  {!readOnly && <GripVertical size={13} className="text-slate-400" aria-hidden />}
                  <Stamp tone={e.kind === 'fact' ? 'solved' : 'alert'}>{e.kind}</Stamp>
                  <span className="text-slate-800">{e.title}</span>
                </li>
              ))}
            </ul>
            {!readOnly && <p className="mt-2 text-xs text-slate-500">Drag a card onto a theory, or use "Link evidence" on the theory.</p>}
          </section>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {c.hypotheses.map((h) => (
              <HypothesisCard
                key={h.id}
                c={c}
                cp={cp}
                h={h}
                evidence={evidence}
                dragging={dragging}
                readOnly={readOnly}
                onStatus={(s) => setStatus(h.id, s)}
                onLink={(e, r) => link(h.id, e, r)}
              />
            ))}
          </div>
        </>
      ) : (
        <Notebook c={c} cp={cp} evidence={evidence} readOnly={readOnly} onStatus={setStatus} onLink={link} />
      )}

      <BoardNotes c={c} cp={cp} readOnly={readOnly} />
    </div>
  )
}

function StatusControl({
  value,
  onChange,
  readOnly,
  label
}: {
  value: HypothesisStatus
  onChange: (s: HypothesisStatus) => void
  readOnly: boolean
  label: string
}) {
  return (
    <div className="flex rounded-md border border-slate-200 p-0.5" role="radiogroup" aria-label={label}>
      {STATUSES.map((s) => (
        <button
          key={s.id}
          type="button"
          role="radio"
          aria-checked={value === s.id}
          disabled={readOnly}
          onClick={() => onChange(s.id)}
          className={`flex-1 rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
            value === s.id
              ? s.id === 'supported'
                ? 'bg-brand-50 text-brand-700'
                : s.id === 'ruled-out'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-slate-100 text-slate-700'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}

function RelationLabel({ relation }: { relation: Relation }) {
  return relation === 'supports' ? (
    <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-brand-700">
      <ArrowUp size={12} aria-hidden /> Supports
    </span>
  ) : (
    <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-red-700">
      <ArrowDown size={12} aria-hidden /> Contradicts
    </span>
  )
}

function HypothesisCard({
  c,
  cp,
  h,
  evidence,
  dragging,
  readOnly,
  onStatus,
  onLink
}: {
  c: CaseDef
  cp: CaseProgress
  h: Hypothesis
  evidence: Evidence[]
  dragging: string | null
  readOnly: boolean
  onStatus: (s: HypothesisStatus) => void
  onLink: (evidenceId: string, relation: Relation | null) => void
}) {
  const [picking, setPicking] = useState(false)
  const entry = cp.board[h.id] ?? { status: 'open' as const, links: {} }
  const linked = evidence.filter((e) => entry.links[e.id])
  const unlinked = evidence.filter((e) => !entry.links[e.id])
  const source = castMember(c, h.source)

  const dropZone = (relation: Relation) => (
    <div
      onDragOver={(ev) => {
        if (ev.dataTransfer.types.includes(DRAG_TYPE)) ev.preventDefault()
      }}
      onDrop={(ev) => {
        ev.preventDefault()
        const id = ev.dataTransfer.getData(DRAG_TYPE)
        if (id) onLink(id, relation)
      }}
      className={`flex flex-1 items-center justify-center gap-1 rounded-md border-2 border-dashed py-2 text-xs font-medium ${
        relation === 'supports' ? 'border-brand-500 text-brand-700' : 'border-red-300 text-red-700'
      }`}
    >
      {relation === 'supports' ? <ArrowUp size={12} aria-hidden /> : <ArrowDown size={12} aria-hidden />}
      Drop: {relation}
    </div>
  )

  return (
    <article className="flex flex-col rounded-xl border border-slate-200 bg-surface p-4" aria-label={`Theory: ${h.title}`}>
      <h3 className="font-semibold text-slate-900">{h.title}</h3>
      <p className="mt-0.5 text-xs text-slate-500">{source ? `Suggested by ${source.name}, ${source.role}` : 'A possibility to check'}</p>
      <div className="mt-3">
        <StatusControl value={entry.status} onChange={onStatus} readOnly={readOnly} label={`Status of: ${h.title}`} />
      </div>

      <ul className="mt-3 space-y-1.5">
        {linked.map((e) => (
          <li key={e.id} className="flex items-center gap-2 rounded-md bg-slate-50 px-2 py-1.5 text-sm">
            <RelationLabel relation={entry.links[e.id]!} />
            <span className="min-w-0 flex-1 truncate text-slate-700" title={e.summary}>
              {e.title}
            </span>
            {!readOnly && (
              <>
                <button
                  type="button"
                  onClick={() => onLink(e.id, entry.links[e.id] === 'supports' ? 'contradicts' : 'supports')}
                  className="shrink-0 rounded px-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  title="Switch between supports and contradicts"
                >
                  Switch
                </button>
                <button
                  type="button"
                  onClick={() => onLink(e.id, null)}
                  className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label={`Unlink ${e.title}`}
                >
                  <X size={13} aria-hidden />
                </button>
              </>
            )}
          </li>
        ))}
        {linked.length === 0 && <li className="text-sm text-slate-400">No evidence linked yet.</li>}
      </ul>

      {dragging && !entry.links[dragging] && !readOnly && (
        <div className="mt-3 flex gap-2">
          {dropZone('supports')}
          {dropZone('contradicts')}
        </div>
      )}

      {!readOnly && unlinked.length > 0 && (
        <div className="mt-auto pt-3">
          {picking ? (
            <div className="rounded-lg border border-slate-200 p-2">
              <ul className="max-h-56 space-y-1 overflow-y-auto">
                {unlinked.map((e) => (
                  <li key={e.id} className="flex items-center gap-1.5 text-sm">
                    <span className="min-w-0 flex-1 truncate text-slate-700" title={e.summary}>
                      {e.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => onLink(e.id, 'supports')}
                      className="shrink-0 rounded border border-slate-200 px-1.5 py-0.5 text-xs text-brand-700 hover:bg-brand-50"
                    >
                      Supports
                    </button>
                    <button
                      type="button"
                      onClick={() => onLink(e.id, 'contradicts')}
                      className="shrink-0 rounded border border-slate-200 px-1.5 py-0.5 text-xs text-red-700 hover:bg-red-50"
                    >
                      Contradicts
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => setPicking(false)} className="mt-2 text-xs text-slate-500 hover:text-slate-800">
                Done
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-50"
            >
              <Link2 size={14} aria-hidden /> Link evidence
            </button>
          )}
        </div>
      )}
    </article>
  )
}

function Notebook({
  c,
  cp,
  evidence,
  readOnly,
  onStatus,
  onLink
}: {
  c: CaseDef
  cp: CaseProgress
  evidence: Evidence[]
  readOnly: boolean
  onStatus: (h: string, s: HypothesisStatus) => void
  onLink: (h: string, e: string, r: Relation | null) => void
}) {
  const entry = (h: string) => cp.board[h] ?? { status: 'open' as const, links: {} }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-surface">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left align-bottom">
            <th className="w-64 px-3 py-2 font-semibold text-slate-700">Evidence</th>
            {c.hypotheses.map((h) => (
              <th key={h.id} className="px-2 py-2 font-semibold text-slate-700">
                {h.title}
              </th>
            ))}
          </tr>
          <tr className="border-b border-slate-200">
            <td className="px-3 py-2 text-xs text-slate-500">Status</td>
            {c.hypotheses.map((h) => (
              <td key={h.id} className="px-2 py-2">
                <select
                  value={entry(h.id).status}
                  disabled={readOnly}
                  onChange={(ev) => onStatus(h.id, ev.target.value as HypothesisStatus)}
                  aria-label={`Status of: ${h.title}`}
                  className="w-full rounded border border-slate-200 bg-surface px-1.5 py-1 text-xs"
                >
                  {STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          {evidence.map((e) => (
            <tr key={e.id} className="border-b border-slate-100 last:border-0">
              <td className="px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <Stamp tone={e.kind === 'fact' ? 'solved' : 'alert'}>{e.kind}</Stamp>
                  <span className="font-medium text-slate-800">{e.title}</span>
                </div>
                <Markdown text={e.summary} className="prose-compact mt-0.5 text-xs text-slate-500" />
              </td>
              {c.hypotheses.map((h) => (
                <td key={h.id} className="px-2 py-2 align-top">
                  <select
                    value={entry(h.id).links[e.id] ?? ''}
                    disabled={readOnly}
                    onChange={(ev) => onLink(h.id, e.id, (ev.target.value || null) as Relation | null)}
                    aria-label={`${e.title} and ${h.title}`}
                    className="w-full rounded border border-slate-200 bg-surface px-1.5 py-1 text-xs"
                  >
                    <option value="">—</option>
                    <option value="supports">Supports</option>
                    <option value="contradicts">Contradicts</option>
                  </select>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BoardNotes({ c, cp, readOnly }: { c: CaseDef; cp: CaseProgress; readOnly: boolean }) {
  const { update } = useProgress()
  const [text, setText] = useState('')
  const add = () => {
    const t = text.trim()
    if (!t) return
    update((p) =>
      withCase(p, c.id, (cur) => ({ notes: [...cur.notes, { id: `${Date.now()}`, text: t, at: new Date().toISOString() }] }))
    )
    setText('')
  }
  return (
    <section>
      <FileLabel>Your notes</FileLabel>
      <ul className="space-y-2">
        {cp.notes.map((n) => (
          <li key={n.id} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-slate-800">
            <StickyNote size={14} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
            <span className="min-w-0 flex-1 whitespace-pre-wrap">{n.text}</span>
            {!readOnly && (
              <button
                type="button"
                onClick={() => update((p) => withCase(p, c.id, (cur) => ({ notes: cur.notes.filter((x) => x.id !== n.id) })))}
                className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-700"
                aria-label="Delete note"
              >
                <Trash2 size={13} aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>
      {!readOnly && (
        <div className="mt-2 flex gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) add()
            }}
            rows={2}
            placeholder="A hunch, a question, something to check… (not graded)"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-surface px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400"
            aria-label="New note"
          />
          <button
            type="button"
            onClick={add}
            disabled={!text.trim()}
            className="flex shrink-0 items-center gap-1 self-start rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Plus size={14} aria-hidden /> Pin note
          </button>
        </div>
      )}
    </section>
  )
}
