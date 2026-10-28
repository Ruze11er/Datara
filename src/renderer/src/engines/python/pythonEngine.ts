import { WorkerClient } from '../workerClient'
import type { PyCheckSpec, PyLabCheck, PyLabRun, PythonRunResult } from './types'

const STARTUP_TIMEOUT_MS = 120_000
const RUN_TIMEOUT_MS = 10_000
/** Checking runs the code several times (given data + hidden variants). */
const CHECK_TIMEOUT_MS = 15_000
const TOO_LONG = `Your code ran for too long and was stopped. Check for a loop that never ends.`

const client = new WorkerClient(
  () => new Worker(new URL('./python.worker.ts', import.meta.url), { type: 'module' })
)

let started = false

/** False until Python has started once (the first start takes a few seconds). */
export const isPythonStarted = (): boolean => started

async function prepare(code: string): Promise<void> {
  // Starting Python and loading pandas can take a few seconds the first time,
  // so it gets a generous limit; the learner's code itself gets a short one.
  await client.request('prepare', { code }, STARTUP_TIMEOUT_MS, 'Python took too long to start.')
  started = true
}

/** Runs code directly. Used by the engine check in Settings. */
export async function runPython(code: string): Promise<PythonRunResult> {
  await prepare(code)
  return client.request<PythonRunResult>('eval', { code }, RUN_TIMEOUT_MS, TOO_LONG)
}

/** Python Lab "Run". */
export async function runPythonLab(setup: string, code: string): Promise<PyLabRun> {
  await prepare(`${setup}\n${code}`)
  return client.request<PyLabRun>('run', { setup, code }, RUN_TIMEOUT_MS, TOO_LONG)
}

/** Python Lab "Check". */
export async function checkPythonLab(spec: PyCheckSpec): Promise<PyLabCheck> {
  await prepare([spec.setup, spec.code, spec.solution, ...spec.variants].join('\n'))
  return client.request<PyLabCheck>('check', spec, CHECK_TIMEOUT_MS, TOO_LONG)
}
