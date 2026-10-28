import type { SqlValue } from '@shared/sqlCheck'

const MAX_DISPLAY_ROWS = 500

function Cell({ value, nullLabel }: { value: SqlValue; nullLabel: string }) {
  if (value === null) return <span className="italic text-slate-400">{nullLabel}</span>
  return <>{String(value)}</>
}

export function ResultTable({
  columns,
  rows,
  truncated = false,
  rowNumbers = true,
  indexColumn = false,
  nullLabel = 'NULL',
  totalRows
}: {
  columns: string[]
  rows: SqlValue[][]
  truncated?: boolean
  /** Show a # column numbering the rows. Off for pandas tables, whose index already labels the rows. */
  rowNumbers?: boolean
  /** The first column holds row labels (a pandas index), so it's shown in grey. */
  indexColumn?: boolean
  /** How a missing value is shown: NULL in SQL, NaN in pandas. */
  nullLabel?: string
  /** Total row count when only the first rows were sent. */
  totalRows?: number
}) {
  if (columns.length === 0) {
    return <p className="p-4 text-sm text-slate-500">The query ran but returned no table.</p>
  }
  const shown = rows.slice(0, MAX_DISPLAY_ROWS)
  const total = totalRows ?? rows.length
  const hidden = total - shown.length

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className={`${rowNumbers ? 'w-full' : 'w-max'} border-collapse text-left font-mono text-[13px]`}>
          <thead className="sticky top-0 bg-slate-100">
            <tr>
              {rowNumbers && (
                <th className="w-10 border-b border-slate-200 px-3 py-1.5 text-right font-normal text-slate-400">#</th>
              )}
              {columns.map((c, i) => (
                <th key={i} className="border-b border-slate-200 px-3 py-1.5 font-semibold whitespace-nowrap text-slate-700">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, r) => (
              <tr key={r} className="odd:bg-surface even:bg-slate-50/60">
                {rowNumbers && <td className="px-3 py-1 text-right text-slate-400">{r + 1}</td>}
                {row.map((v, c) => (
                  <td
                    key={c}
                    className={`px-3 py-1 whitespace-nowrap ${indexColumn && c === 0 ? 'text-slate-400' : 'text-slate-800'} ${
                      typeof v === 'number' ? 'text-right tabular-nums' : ''
                    }`}
                  >
                    <Cell value={v} nullLabel={nullLabel} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="px-4 py-3 text-sm text-slate-500">No rows matched.</p>}
      </div>
      <div className="border-t border-slate-200 bg-surface px-3 py-1.5 text-xs text-slate-500">
        {total} {total === 1 ? 'row' : 'rows'}
        {hidden > 0 && ` (showing the first ${shown.length})`}
        {truncated && ' (stopped at 5,000 rows)'}
      </div>
    </div>
  )
}
