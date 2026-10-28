export type SqlValue = string | number | null

export interface SqlResult {
  columns: string[]
  rows: SqlValue[][]
}

export interface SqlRequest {
  /** The learner's query. */
  sql: string
  /** Statements that build the practice tables before the query runs. */
  setupSql?: string
}
