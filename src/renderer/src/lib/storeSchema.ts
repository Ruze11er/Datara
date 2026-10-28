import { useEffect, useState } from 'react'
import { STORE_DATASET } from '../content'
import { runSql } from '../engines/sql/sqlEngine'
import type { SqlDataset } from '../engines/sql/types'

export interface ColumnInfo {
  name: string
  type: string
  primaryKey: boolean
}

export interface TableInfo {
  name: string
  rowCount: number
  columns: ColumnInfo[]
}

const cached = new Map<string, Promise<TableInfo[]>>()

/** Reads a dataset's tables and columns straight from SQLite (once per dataset). */
export function loadSchema(dataset: SqlDataset): Promise<TableInfo[]> {
  let schema = cached.get(dataset.id)
  if (!schema) {
    schema = (async () => {
      const cols = await runSql({
        dataset,
        sql: `SELECT m.name, p.name, p.type, p.pk
              FROM sqlite_master AS m JOIN pragma_table_info(m.name) AS p
              WHERE m.type = 'table'
              ORDER BY m.name, p.cid`
      })
      const tables = new Map<string, TableInfo>()
      for (const [table, column, type, pk] of cols.rows) {
        const name = String(table)
        if (!tables.has(name)) tables.set(name, { name, rowCount: 0, columns: [] })
        tables.get(name)!.columns.push({ name: String(column), type: String(type), primaryKey: Number(pk) > 0 })
      }
      const counts = await runSql({
        dataset,
        sql: [...tables.keys()].map((t) => `SELECT '${t}', COUNT(*) FROM ${t}`).join(' UNION ALL ')
      })
      for (const [table, count] of counts.rows) tables.get(String(table))!.rowCount = Number(count)
      return [...tables.values()]
    })().catch((err) => {
      cached.delete(dataset.id)
      throw err
    })
    cached.set(dataset.id, schema)
  }
  return schema
}

/** The tables of a dataset, or null while loading (or while `dataset` is null). */
export function useSchema(dataset: SqlDataset | null): TableInfo[] | null {
  const [schema, setSchema] = useState<{ id: string; tables: TableInfo[] } | null>(null)
  useEffect(() => {
    if (!dataset) return
    let alive = true
    loadSchema(dataset).then((tables) => alive && setSchema({ id: dataset.id, tables }), () => undefined)
    return () => {
      alive = false
    }
  }, [dataset])
  return dataset && schema?.id === dataset.id ? schema.tables : null
}

/** The practice shop's tables (SQL Lab and Playground). */
export const useStoreSchema = (): TableInfo[] | null => useSchema(STORE_DATASET)
