import type { RunResult } from '@shared/sqlRun'

export type { SqlValue } from '@shared/sqlCheck'

export interface SqlResult extends RunResult {
  /** True when the result had more rows than the app displays. */
  truncated: boolean
}

/** Practice tables: an id plus the SQL that creates them. */
export interface SqlDataset {
  id: string
  setupSql: string
}

export interface SqlRequest {
  /** The query to run. */
  sql: string
  /**
   * Practice tables to load before the query runs. The `id` lets the worker
   * build the database once and reuse a fresh copy for every run.
   */
  dataset?: SqlDataset
}

/** What is actually sent to the worker: the setup SQL is left out once the worker has the dataset. */
export interface SqlWorkerRequest {
  sql: string
  dataset?: { id: string; setupSql?: string }
}

/** The worker's error when it is asked for a dataset it hasn't built (it was restarted). */
export const DATASET_NOT_LOADED = 'DATARA_DATASET_NOT_LOADED'
