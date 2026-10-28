// Turns a result table into CSV text, so Python (pandas) can read the same data as SQL.
// Used by the Playground, the Academy's Python mode and scripts/verify-cases.ts, so no imports.

type Cell = string | number | null

function csvCell(value: Cell): string {
  if (value === null) return '' // read back by pandas as a missing value (NaN)
  const text = String(value)
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function toCsv(columns: string[], rows: Cell[][]): string {
  return [columns, ...rows].map((row) => row.map(csvCell).join(',')).join('\n') + '\n'
}
