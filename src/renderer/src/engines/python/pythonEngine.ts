import { WorkerClient } from '../workerClient'
import type { PythonRunResult } from './types'

const STARTUP_TIMEOUT_MS = 120_000
const RUN_TIMEOUT_MS = 10_000

const client = new WorkerClient(
  () => new Worker(new URL('./python.worker.ts', import.meta.url), { type: 'module' })
)

export async function runPython(code: string): Promise<PythonRunResult> {
  // Starting Python and loading pandas can take a few seconds the first time,
  // so it gets a generous limit; the learner's code itself gets a short one.
  await client.request('prepare', { code }, STARTUP_TIMEOUT_MS, 'Python took too long to start.')
  return client.request<PythonRunResult>(
    'run',
    { code },
    RUN_TIMEOUT_MS,
    `Your code ran for more than ${RUN_TIMEOUT_MS / 1000} seconds and was stopped. Check for a loop that never ends.`
  )
}
