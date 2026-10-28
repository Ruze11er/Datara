import initSqlJs, { type SqlJsStatic } from 'sql.js'
import { runLastStatement } from '@shared/sqlRun'
import { serve } from '../workerHost'
import { DATASET_NOT_LOADED, type SqlResult, type SqlWorkerRequest } from './types'

let engine: Promise<SqlJsStatic> | null = null

const getEngine = (): Promise<SqlJsStatic> =>
  (engine ??= initSqlJs({
    // Bundled with the app (see scripts/prepare-engines.mjs); never downloaded.
    locateFile: (file) => new URL(`/sqljs/${file}`, self.location.href).href
  }))

/** Built practice databases, kept as bytes so each run starts from a fresh copy. */
const datasets = new Map<string, Uint8Array>()

function datasetBytes(SQL: SqlJsStatic, id: string, setupSql: string | undefined): Uint8Array {
  let bytes = datasets.get(id)
  if (!bytes) {
    // The client only leaves out the setup SQL when it thinks this worker already has the dataset.
    if (setupSql === undefined) throw new Error(DATASET_NOT_LOADED)
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
  async exec({ sql, dataset }: SqlWorkerRequest): Promise<SqlResult> {
    const SQL = await getEngine()
    const db = dataset ? new SQL.Database(datasetBytes(SQL, dataset.id, dataset.setupSql)) : new SQL.Database()
    try {
      return runLastStatement(db, sql)
    } finally {
      db.close()
    }
  }
})
