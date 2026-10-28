import { useState } from 'react'
import { ChevronRight, Eye, KeyRound, Table2 } from 'lucide-react'
import type { TableInfo } from '../../lib/storeSchema'

interface SchemaPanelProps {
  schema: TableInfo[] | null
  /** Tables this level uses; shown first and expanded. */
  focus: string[]
  onPreview: (table: string) => void
}

function TableEntry({ table, open: initiallyOpen, onPreview }: { table: TableInfo; open: boolean; onPreview: () => void }) {
  const [open, setOpen] = useState(initiallyOpen)
  return (
    <li className="rounded-lg border border-slate-200 bg-surface">
      <div className="flex items-center gap-1 pr-1">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left text-sm"
        >
          <ChevronRight size={14} aria-hidden className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`} />
          <Table2 size={15} aria-hidden className="shrink-0 text-brand-600" />
          <span className="truncate font-mono font-medium text-slate-800">{table.name}</span>
          <span className="ml-auto shrink-0 text-xs text-slate-400">{table.rowCount} rows</span>
        </button>
        <button
          type="button"
          onClick={onPreview}
          title={`Show the first 10 rows of ${table.name}`}
          className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        >
          <Eye size={13} aria-hidden /> Preview
        </button>
      </div>
      {open && (
        <ul className="border-t border-slate-100 px-3 py-1.5">
          {table.columns.map((c) => (
            <li key={c.name} className="flex items-center gap-2 py-0.5 font-mono text-[13px]">
              <span className="text-slate-700">{c.name}</span>
              {c.primaryKey && <KeyRound size={11} className="text-amber-500" aria-label="Primary key" />}
              <span className="ml-auto text-[11px] text-slate-400 uppercase">{c.type}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

export function SchemaPanel({ schema, focus, onPreview }: SchemaPanelProps) {
  if (!schema) return <p className="text-sm text-slate-400">Loading tables…</p>
  const sorted = [...schema].sort((a, b) => Number(focus.includes(b.name)) - Number(focus.includes(a.name)))
  return (
    <ul className="space-y-2">
      {sorted.map((t) => (
        <TableEntry key={t.name} table={t} open={focus.includes(t.name)} onPreview={() => onPreview(t.name)} />
      ))}
    </ul>
  )
}
