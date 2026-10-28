import type { PyodideAPI, loadPyodide as LoadPyodide } from 'pyodide'
import checkerSource from '@shared/python/datara_check.py?raw'
import { serve } from '../workerHost'
import type { PyCheckSpec, PythonRunResult } from './types'

// Pyodide is real CPython compiled to WebAssembly. It runs inside this worker
// with an in-memory file system and no access to your real files or programs.
// Its files (and pandas) are bundled with the app, so no internet is needed.

let pyodide: Promise<PyodideAPI> | null = null
let checker: ((kind: string, spec: string) => string) | null = null

function getPyodide(): Promise<PyodideAPI> {
  return (pyodide ??= (async () => {
    const indexURL = new URL('/pyodide/', self.location.href).href
    const mod = (await import(/* @vite-ignore */ `${indexURL}pyodide.mjs`)) as {
      loadPyodide: typeof LoadPyodide
    }
    return mod.loadPyodide({ indexURL })
  })())
}

/** The Python Lab checker (src/shared/python/datara_check.py), loaded once. */
async function getChecker(): Promise<(kind: string, spec: string) => string> {
  if (!checker) {
    const py = await getPyodide()
    const ns = py.globals.get('dict')()
    py.runPython(checkerSource, { globals: ns })
    checker = ns.get('handle') as (kind: string, spec: string) => string
  }
  return checker
}

serve({
  /** Starts Python and loads any bundled packages the code imports (e.g. pandas). */
  async prepare({ code }: { code: string }): Promise<null> {
    const py = await getPyodide()
    try {
      await py.loadPackagesFromImports(code, { messageCallback: () => undefined, errorCallback: () => undefined })
    } catch {
      // A package that isn't bundled can't be loaded offline. The code's own
      // import will then fail with a normal ModuleNotFoundError the learner can read.
    }
    await getChecker()
    return null
  },

  /** Runs code directly (used by the engine check in Settings). */
  async eval({ code }: { code: string }): Promise<PythonRunResult> {
    const py = await getPyodide()
    const output: string[] = []
    py.setStdout({ batched: (s: string) => output.push(s) })
    py.setStderr({ batched: (s: string) => output.push(s) })

    // A fresh namespace per run, so variables never leak between runs.
    const globals = py.globals.get('dict')()
    try {
      const value: unknown = await py.runPythonAsync(code, { globals })
      let text: string | null = null
      if (value !== undefined && value !== null) {
        text = String(value)
        const proxy = value as { destroy?: () => void }
        if (typeof proxy.destroy === 'function') proxy.destroy()
      }
      return { output: output.join('\n'), value: text }
    } finally {
      globals.destroy()
    }
  },

  /** Python Lab "Run": given data + learner code, returns output, error, and variables. */
  async run(spec: { setup: string; code: string; files: Record<string, string>; caseTables?: boolean }): Promise<unknown> {
    const handle = await getChecker()
    return JSON.parse(handle('run', JSON.stringify(spec)))
  },

  /** Python Lab "Check": compares the learner's results with the solution's. */
  async check(spec: PyCheckSpec): Promise<unknown> {
    const handle = await getChecker()
    return JSON.parse(handle('check', JSON.stringify(spec)))
  }
})
