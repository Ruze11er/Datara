// Practice tables as CSV files, so Python can use pd.read_csv("orders.csv") on the same data as SQL:
// the practice shop (Python Playground) and Academy case datasets (Investigation Lab in Python mode).

import { toCsv } from '@shared/csv'
import { STORE_DATASET } from '../content'
import { runSql } from '../engines/sql/sqlEngine'
import type { SqlDataset } from '../engines/sql/types'

export const SHOP_TABLES = ['customers', 'products', 'orders', 'order_items', 'reviews'] as const

/** The SQL engine returns at most 5,000 rows per query, so big tables are read in pages. */
const PAGE = 5000

const cached = new Map<string, Promise<Record<string, string>>>()

/** File name -> CSV text for each table of a dataset. Built once per dataset, from the SQL engine's copy of the data. */
export function datasetCsvFiles(dataset: SqlDataset, tables: readonly string[]): Promise<Record<string, string>> {
  const key = `${dataset.id}:${tables.join(',')}`
  let files = cached.get(key)
  if (!files) {
    files = (async () => {
      const out: Record<string, string> = {}
      for (const table of tables) {
        let columns: string[] = []
        const rows: (string | number | null)[][] = []
        for (let offset = 0; ; offset += PAGE) {
          const page = await runSql({ sql: `SELECT * FROM ${table} ORDER BY rowid LIMIT ${PAGE} OFFSET ${offset}`, dataset })
          columns = page.columns
          rows.push(...page.rows)
          if (page.rows.length < PAGE) break
        }
        out[`${table}.csv`] = toCsv(columns, rows)
      }
      return out
    })().catch((err) => {
      cached.delete(key)
      throw err
    })
    cached.set(key, files)
  }
  return files
}

/** File name -> CSV text for every practice shop table. */
export const shopCsvFiles = (): Promise<Record<string, string>> => datasetCsvFiles(STORE_DATASET, SHOP_TABLES)
