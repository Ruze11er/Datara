// The practice shop's tables as CSV files, so the Python Playground can use
// pd.read_csv("orders.csv") on the same data as the SQL Lab.

import type { SqlValue } from '@shared/sqlCheck'
import { STORE_DATASET } from '../content'
import { runSql } from '../engines/sql/sqlEngine'

export const SHOP_TABLES = ['customers', 'products', 'orders', 'order_items', 'reviews'] as const

function csvCell(value: SqlValue): string {
  if (value === null) return '' // read back by pandas as a missing value (NaN)
  const text = String(value)
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

let cached: Promise<Record<string, string>> | null = null

/** File name -> CSV text for every shop table. Built once, from the SQL engine's copy of the data. */
export function shopCsvFiles(): Promise<Record<string, string>> {
  return (cached ??= (async () => {
    const files: Record<string, string> = {}
    for (const table of SHOP_TABLES) {
      const { columns, rows } = await runSql({ sql: `SELECT * FROM ${table}`, dataset: STORE_DATASET })
      files[`${table}.csv`] = [columns, ...rows].map((row) => row.map(csvCell).join(',')).join('\n') + '\n'
    }
    return files
  })().catch((err) => {
    cached = null
    throw err
  }))
}
