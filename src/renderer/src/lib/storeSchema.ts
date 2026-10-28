import { useEffect, useState } from 'react'
import { STORE_DATASET } from '../content'
import { runSql } from '../engines/sql/sqlEngine'

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

let cached: Promise<TableInfo[]> | null = null

/** Reads the practice database's tables and columns straight from SQLite. */
function loadSchema(): Promise<TableInfo[]> {
  return (cached ??= (async () => {
    const cols = await runSql({
      dataset: STORE_DATASET,
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
      dataset: STORE_DATASET,
      sql: [...tables.keys()].map((t) => `SELECT '${t}', COUNT(*) FROM ${t}`).join(' UNION ALL ')
    })
    for (const [table, count] of counts.rows) tables.get(String(table))!.rowCount = Number(count)
    return [...tables.values()]
  })().catch((err) => {
    cached = null
    throw err
  }))
}

export function useStoreSchema(): TableInfo[] | null {
  const [schema, setSchema] = useState<TableInfo[] | null>(null)
  useEffect(() => {
    let alive = true
    loadSchema().then((s) => alive && setSchema(s), () => undefined)
    return () => {
      alive = false
    }
  }, [])
  return schema
}
