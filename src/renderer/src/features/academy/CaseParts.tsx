// Building blocks shared by the Academy screens: stamps, evidence cards and case documents.

import { useState, type ReactNode } from 'react'
import { ChevronRight, FileText, Mail, MessageSquareQuote, Newspaper, SearchCheck, StickyNote } from 'lucide-react'
import type { CaseDef, CaseDocument, Evidence } from '@shared/cases/types'
import type { CaseEvidenceRecord } from '@shared/progress'
import { Markdown } from '../../components/Markdown'
import { ResultTable } from '../../components/ResultTable'

export type StampTone = 'neutral' | 'open' | 'solved' | 'alert'

const STAMP_TONES: Record<StampTone, string> = {
  neutral: 'border-slate-300 text-slate-600',
  open: 'border-sky-200 bg-sky-50 text-sky-700',
  solved: 'border-brand-100 bg-brand-50 text-brand-700',
  alert: 'border-amber-200 bg-amber-50 text-amber-900'
}

/** A small rubber-stamp style label, e.g. CASE #001 or NEW. */
export function Stamp({ children, tone = 'neutral' }: { children: ReactNode; tone?: StampTone }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-px font-mono text-[11px] font-semibold tracking-wider uppercase ${STAMP_TONES[tone]}`}
    >
      {children}
    </span>
  )
}

/** Small uppercase heading used across the case file. */
export function FileLabel({ children }: { children: ReactNode }) {
  return <h2 className="mb-2 font-mono text-xs font-semibold tracking-widest text-slate-500 uppercase">{children}</h2>
}

export const castMember = (c: CaseDef, id: string | undefined) => c.cast.find((m) => m.id === id)

/** An evidence card: a fact the learner proved with a query, or a claim someone made. */
export function EvidenceCard({
  c,
  evidence,
  record,
  isNew = false
}: {
  c: CaseDef
  evidence: Evidence
  record?: CaseEvidenceRecord
  isNew?: boolean
}) {
  const [showFinding, setShowFinding] = useState(false)
  const from = castMember(c, evidence.from)
  const fact = evidence.kind === 'fact'
  const Icon = fact ? SearchCheck : MessageSquareQuote
  return (
    <article
      className={`rounded-lg border bg-surface px-4 py-3 ${fact ? 'border-brand-100' : 'border-amber-200'}`}
      aria-label={`${fact ? 'Fact' : 'Claim'}: ${evidence.title}`}
    >
      <div className="flex items-center gap-2">
        <Icon size={15} className={fact ? 'text-brand-600' : 'text-amber-600'} aria-hidden />
        <Stamp tone={fact ? 'solved' : 'alert'}>{fact ? 'Fact' : 'Claim'}</Stamp>
        {isNew && <Stamp tone="open">New</Stamp>}
        <h3 className="min-w-0 truncate font-semibold text-slate-900">{evidence.title}</h3>
      </div>
      <Markdown text={evidence.summary} className="prose-compact mt-1.5 text-slate-700" />
      {from && (
        <p className="mt-1 text-xs text-slate-500">
          {from.name}, {from.role}
          {!fact && ' · Not proven by the data'}
        </p>
      )}
      {record?.snapshot && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowFinding(!showFinding)}
            aria-expanded={showFinding}
            className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            <ChevronRight size={13} className={`transition-transform ${showFinding ? 'rotate-90' : ''}`} aria-hidden />
            Your finding ({record.snapshot.totalRows} row{record.snapshot.totalRows === 1 ? '' : 's'})
          </button>
          {showFinding && (
            <div className="mt-1.5 max-h-64 overflow-auto rounded-md border border-slate-200">
              <ResultTable
                columns={record.snapshot.columns}
                rows={record.snapshot.rows}
                totalRows={record.snapshot.totalRows > record.snapshot.rows.length ? record.snapshot.totalRows : undefined}
              />
            </div>
          )}
        </div>
      )}
    </article>
  )
}

const DOCUMENT_ICONS = { memo: StickyNote, email: Mail, report: Newspaper, note: FileText }
const DOCUMENT_KINDS = { memo: 'Memo', email: 'Email', report: 'Report', note: 'Note' }

/** A document from the case files: an email, memo, report or note. */
export function DocumentCard({ c, doc, isNew = false }: { c: CaseDef; doc: CaseDocument; isNew?: boolean }) {
  const from = castMember(c, doc.from)
  const Icon = DOCUMENT_ICONS[doc.kind]
  return (
    <article className="rounded-lg border border-slate-200 bg-surface px-4 py-3">
      <div className="flex items-center gap-2">
        <Icon size={15} className="text-slate-500" aria-hidden />
        <Stamp>{DOCUMENT_KINDS[doc.kind]}</Stamp>
        {isNew && <Stamp tone="open">New</Stamp>}
        <h3 className="min-w-0 truncate font-semibold text-slate-900">{doc.title}</h3>
      </div>
      {from && (
        <p className="mt-0.5 text-xs text-slate-500">
          From {from.name}, {from.role}
        </p>
      )}
      <Markdown text={doc.body} className="mt-2 text-[14px] text-slate-700" />
    </article>
  )
}

/** A thin progress bar. */
export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <div className="h-full rounded-full bg-brand-600" style={{ width: `${max ? (100 * value) / max : 0}%` }} />
    </div>
  )
}
