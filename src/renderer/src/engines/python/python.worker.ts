import type { PyodideAPI, loadPyodide as LoadPyodide } from 'pyodide'
import { serve } from '../workerHost'
import type { PythonRunResult } from './types'

// Pyodide is real CPython compiled to WebAssembly. It runs inside this worker
// with an in-memory file system and no access to your real files or programs.
// Its files (and pandas) are bundled with the app, so no internet is needed.

let pyodide: Promise<PyodideAPI> | null = null

function getPyodide(): Promise<PyodideAPI> {
  return (pyodide ??= (async () => {
    const indexURL = new URL('/pyodide/', self.location.href).href
    const mod = (await import(/* @vite-ignore */ `${indexURL}pyodide.mjs`)) as {
      loadPyodide: typeof LoadPyodide
    }
    return mod.loadPyodide({ indexURL })
  })())
}

serve({
  /** Starts Python and loads any bundled packages the code imports (e.g. pandas). */
  async prepare({ code }: { code: string }): Promise<null> {
    const py = await getPyodide()
    await py.loadPackagesFromImports(code, { messageCallback: () => undefined })
    return null
  },

  async run({ code }: { code: string }): Promise<PythonRunResult> {
    const py = await getPyodide()
    const output: string[] = []
    py.setStdout({ batched: (s: string) => output.push(s) })
    py.setStderr({ batched: (s: string) => output.push(s) })

    // A fresh namespace per run, so variables never leak between exercises.
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
  }
})
