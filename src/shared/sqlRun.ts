// Runs SQL on a sql.js database and returns the last result table.
// Unlike sql.js's db.exec(), this keeps the column names when a query returns
// zero rows, so the checker can say "no rows" instead of "no result".
// Used by the SQL worker and by scripts/verify-content.ts, so no imports.

type Cell = string | number | null | Uint8Array

interface Statement {
  getColumnNames(): string[]
  step(): boolean
  get(): Cell[]
}

interface Database {
  iterateStatements(sql: string): Iterable<Statement>
}

export interface RunResult {
  columns: string[]
  rows: (string | number | null)[][]
}

const MAX_ROWS = 5000

export function runLastStatement(db: Database, sql: string): RunResult & { truncated: boolean } {
  let last: RunResult | null = null
  let truncated = false
  for (const statement of db.iterateStatements(sql)) {
    const columns = statement.getColumnNames()
    const rows: RunResult['rows'] = []
    let rowTruncated = false
    while (statement.step()) {
      if (rows.length >= MAX_ROWS) {
        rowTruncated = true
        break
      }
      rows.push(statement.get().map((v) => (v instanceof Uint8Array ? `[${v.length} bytes]` : v)))
    }
    // Statements like CREATE or DELETE have no columns; keep the last real result.
    if (columns.length > 0) {
      last = { columns, rows }
      truncated = rowTruncated
    }
  }
  return { ...(last ?? { columns: [], rows: [] }), truncated }
}
