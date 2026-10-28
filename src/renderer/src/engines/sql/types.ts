import type { RunResult } from '@shared/sqlRun'

export type { SqlValue } from '@shared/sqlCheck'

export interface SqlResult extends RunResult {
  /** True when the result had more rows than the app displays. */
  truncated: boolean
}

export interface SqlRequest {
  /** The query to run. */
  sql: string
  /**
   * Practice tables to load before the query runs. The `id` lets the worker
   * build the database once and reuse a fresh copy for every run.
   */
  dataset?: { id: string; setupSql: string }
}
