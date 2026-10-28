import initSqlJs, { type SqlJsStatic } from 'sql.js'
import { serve } from '../workerHost'
import type { SqlRequest, SqlResult, SqlValue } from './types'

let engine: Promise<SqlJsStatic> | null = null

const getEngine = (): Promise<SqlJsStatic> =>
  (engine ??= initSqlJs({
    // Bundled with the app (see scripts/prepare-engines.mjs); never downloaded.
    locateFile: (file) => new URL(`/sqljs/${file}`, self.location.href).href
  }))

serve({
  // Every run gets a brand-new in-memory database, so a query like DROP TABLE
  // can never damage the practice data or touch anything on disk.
  async exec({ sql, setupSql }: SqlRequest): Promise<SqlResult> {
    const SQL = await getEngine()
    const db = new SQL.Database()
    try {
      if (setupSql) db.exec(setupSql)
      const last = db.exec(sql).at(-1)
      if (!last) return { columns: [], rows: [] }
      return {
        columns: last.columns,
        rows: last.values.map((row) =>
          row.map((v): SqlValue => (v instanceof Uint8Array ? `[${v.length} bytes]` : v))
        )
      }
    } finally {
      db.close()
    }
  }
})
