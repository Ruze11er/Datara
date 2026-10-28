import initSqlJs, { type SqlJsStatic } from 'sql.js'
import { runLastStatement } from '@shared/sqlRun'
import { serve } from '../workerHost'
import type { SqlRequest, SqlResult } from './types'

let engine: Promise<SqlJsStatic> | null = null

const getEngine = (): Promise<SqlJsStatic> =>
  (engine ??= initSqlJs({
    // Bundled with the app (see scripts/prepare-engines.mjs); never downloaded.
    locateFile: (file) => new URL(`/sqljs/${file}`, self.location.href).href
  }))

/** Built practice databases, kept as bytes so each run starts from a fresh copy. */
const datasets = new Map<string, Uint8Array>()

function datasetBytes(SQL: SqlJsStatic, id: string, setupSql: string): Uint8Array {
  let bytes = datasets.get(id)
  if (!bytes) {
    const db = new SQL.Database()
    try {
      db.exec(setupSql)
      bytes = db.export()
    } finally {
      db.close()
    }
    datasets.set(id, bytes)
  }
  return bytes
}

serve({
  // Every run gets a brand-new in-memory database, so a query like DROP TABLE
  // can never damage the practice data or touch anything on disk.
  async exec({ sql, dataset }: SqlRequest): Promise<SqlResult> {
    const SQL = await getEngine()
    const db = dataset ? new SQL.Database(datasetBytes(SQL, dataset.id, dataset.setupSql)) : new SQL.Database()
    try {
      return runLastStatement(db, sql)
    } finally {
      db.close()
    }
  }
})
