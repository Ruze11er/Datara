// Displays for Python results, shared by the Python Lab levels and the Playground.

import { CircleX } from 'lucide-react'
import { TableOrChart } from '../../components/TableOrChart'
import type { PyError, PyVariable } from '../../engines/python/types'
import { SectionTitle } from '../labs/LevelParts'

export function ErrorBox({ error }: { error: PyError }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
      <div className="flex items-center gap-2 font-semibold text-red-800">
        <CircleX size={16} aria-hidden /> {error.type}
        {error.line !== null && <span className="font-normal text-red-700">on line {error.line}</span>}
      </div>
      <p className="mt-1 text-sm text-red-900">{error.friendly}</p>
      {error.message && !error.friendly.includes(error.message) && (
        <p className="mt-2 font-mono text-xs text-red-700/80">{error.message}</p>
      )}
    </div>
  )
}

export function OutputBlock({ title, text, muted = false }: { title: string; text: string; muted?: boolean }) {
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      <pre
        className={`overflow-x-auto rounded-lg border px-3 py-2 font-mono text-[13px] whitespace-pre-wrap ${
          muted ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-code bg-code text-code-fg'
        }`}
      >
        {text}
      </pre>
    </section>
  )
}

export function Variables({ variables: all }: { variables: PyVariable[] }) {
  if (all.length === 0) return null
  // The learner's own variables first; given data (often a big table) after them.
  const variables = [...all.filter((v) => !v.given), ...all.filter((v) => v.given)]
  return (
    <section>
      <SectionTitle>Variables</SectionTitle>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-3 py-1.5 font-semibold">Name</th>
              <th className="px-3 py-1.5 font-semibold">Type</th>
              <th className="px-3 py-1.5 font-semibold">Value</th>
            </tr>
          </thead>
          <tbody>
            {variables.map((v) => (
              <tr key={v.name} className={`border-t border-slate-100 align-top ${v.given ? 'text-slate-400' : 'text-slate-800'}`}>
                <td className="px-3 py-1.5 font-mono whitespace-nowrap">
                  {v.name}
                  {v.given && <span className="ml-1.5 rounded bg-slate-100 px-1 font-sans text-[10px] text-slate-500">given</span>}
                </td>
                <td className="px-3 py-1.5 font-mono whitespace-nowrap">{v.type}</td>
                <td className="px-3 py-1.5 font-mono break-all">
                  {v.table ? (
                    <div className="flex max-h-80 max-w-full flex-col overflow-hidden rounded border border-slate-200 font-sans">
                      <TableOrChart
                        columns={v.table.columns}
                        rows={v.table.rows}
                        totalRows={v.table.totalRows}
                        rowNumbers={false}
                        indexColumn
                        nullLabel="NaN"
                      />
                    </div>
                  ) : (
                    v.value
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {variables.some((v) => v.given) && <p className="mt-1 text-xs text-slate-400">Grey rows come from the given data.</p>}
    </section>
  )
}
