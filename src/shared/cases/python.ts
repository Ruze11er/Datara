// Python in Academy cases: the case's tables are given to the learner as pandas DataFrames, and every DataFrame or
// Series the learner makes is compared with the leads, just like a SQL result. Shared by the app and
// scripts/verify-cases.ts.

import type { QueryResult } from '../sqlCheck.ts'

/** Setup ("given data") that loads the case tables the code mentions, e.g. `orders = pd.read_csv("orders.csv")`. */
export function caseSetup(tables: string[], code: string): string {
  const used = tables.filter((t) => new RegExp(`\\b${t}\\b`).test(code))
  return ['import pandas as pd', ...used.map((t) => `${t} = pd.read_csv("${t}.csv")`)].join('\n')
}

/** Starter code for Python mode. */
export function pythonStarter(tables: string[]): string {
  return [
    '# The case tables are ready as pandas DataFrames:',
    `# ${tables.join(', ')}`,
    '# Any table you make (a DataFrame or Series) is compared with your open leads.',
    '',
    ''
  ].join('\n')
}

export interface PyTableLike {
  columns: string[]
  rows: (string | number | null)[][]
  totalRows: number
}

/**
 * A Python variable's table as a query result, or null when it was cut short (it can't be compared in full).
 * The first column holds the row labels; a plain 0, 1, 2… index is dropped, a meaningful one (a groupby key) is kept.
 */
export function pyTableResult(table: PyTableLike): QueryResult | null {
  if (table.totalRows > table.rows.length) return null
  const plainIndex = table.columns[0] === '' && table.rows.every((row, i) => row[0] === i)
  if (!plainIndex) return { columns: table.columns.map((c, i) => c || `column ${i + 1}`), rows: table.rows }
  return { columns: table.columns.slice(1), rows: table.rows.map((row) => row.slice(1)) }
}
