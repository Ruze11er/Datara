import { useState, type ComponentProps } from 'react'
import { ChartColumn, Table2 } from 'lucide-react'
import { ResultChart, planChart } from './ResultChart'
import { ResultTable } from './ResultTable'

type View = 'table' | 'chart'

/** The last choice, kept while the app is open so it sticks across runs and levels. */
let lastView: View = 'table'

/**
 * A result table with a Table | Chart switch. The table is always one click away: it's the chart's
 * accessible twin, listing every value.
 */
export function TableOrChart({ label, ...table }: { label?: string } & ComponentProps<typeof ResultTable>) {
  const [view, setViewState] = useState<View>(lastView)
  const setView = (v: View) => {
    lastView = v
    setViewState(v)
  }
  const plan = view === 'chart' ? planChart(table.columns, table.rows) : null

  const tab = (v: View, text: string, Icon: typeof Table2) => (
    <button
      type="button"
      role="tab"
      aria-selected={view === v}
      onClick={() => setView(v)}
      className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${
        view === v ? 'bg-surface text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
      }`}
    >
      <Icon size={13} aria-hidden /> {text}
    </button>
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 px-4 py-1.5">
        {label && <span className="text-xs font-medium text-slate-500">{label}</span>}
        <div className="ml-auto flex rounded-md bg-slate-100 p-0.5" role="tablist" aria-label="Show as">
          {tab('table', 'Table', Table2)}
          {tab('chart', 'Chart', ChartColumn)}
        </div>
      </div>
      {/* The chart scrolls inside this area, so a long chart never spills out of its box. */}
      <div className={`min-h-0 flex-1 ${view === 'chart' ? 'overflow-auto border-t border-slate-200' : ''}`}>
        {view === 'table' || !plan ? (
          <ResultTable {...table} />
        ) : 'reason' in plan ? (
          <p className="px-4 py-3 text-sm text-slate-500">{plan.reason}</p>
        ) : (
          <ResultChart columns={table.columns} rows={table.rows} plan={plan} />
        )}
      </div>
    </div>
  )
}
