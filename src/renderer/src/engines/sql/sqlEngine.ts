import { WorkerClient } from '../workerClient'
import { DATASET_NOT_LOADED, type SqlRequest, type SqlResult, type SqlWorkerRequest } from './types'

const TIMEOUT_MS = 5_000

const client = new WorkerClient(
  () => new Worker(new URL('./sql.worker.ts', import.meta.url), { type: 'module' })
)

/**
 * Dataset id -> the worker generation that has it. Case datasets are a few MB of SQL, so the text is sent
 * only once per worker; after a restart (a runaway query) it is sent again.
 */
const loadedIn = new Map<string, number>()

function send(request: SqlWorkerRequest): Promise<SqlResult> {
  return client.request<SqlResult>(
    'exec',
    request,
    TIMEOUT_MS,
    `The query ran for more than ${TIMEOUT_MS / 1000} seconds and was stopped.`
  )
}

export async function runSql({ sql, dataset }: SqlRequest): Promise<SqlResult> {
  if (!dataset) return send({ sql })
  const generation = client.generation()
  if (loadedIn.get(dataset.id) === generation) {
    try {
      return await send({ sql, dataset: { id: dataset.id } })
    } catch (err) {
      if (!(err instanceof Error) || err.message !== DATASET_NOT_LOADED) throw err
      // The worker was replaced in the meantime: send the dataset again below.
    }
  }
  // Requests run in order inside the worker, so later requests can already leave the setup SQL out. If this one
  // fails before the dataset is built, the worker answers DATASET_NOT_LOADED next time and it is sent again.
  loadedIn.set(dataset.id, generation)
  return send({ sql, dataset })
}
