import { WorkerClient } from '../workerClient'
import type { SqlRequest, SqlResult } from './types'

const TIMEOUT_MS = 5_000

const client = new WorkerClient(
  () => new Worker(new URL('./sql.worker.ts', import.meta.url), { type: 'module' })
)

export function runSql(request: SqlRequest): Promise<SqlResult> {
  return client.request<SqlResult>(
    'exec',
    request,
    TIMEOUT_MS,
    `The query ran for more than ${TIMEOUT_MS / 1000} seconds and was stopped.`
  )
}
