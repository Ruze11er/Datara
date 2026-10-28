import { useState } from 'react'
import { CircleCheck, CircleX, LoaderCircle, Play } from 'lucide-react'
import { Card, Page } from '../../components/Page'
import { engineChecks, type CheckResult } from '../../lib/engineChecks'

function EngineCheck() {
  const [results, setResults] = useState<CheckResult[]>([])
  const [running, setRunning] = useState(false)

  async function run() {
    setRunning(true)
    setResults([])
    for (const check of engineChecks) {
      const result = await check.run()
      setResults((prev) => [...prev, result])
    }
    setRunning(false)
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-slate-900">Engine check</h2>
          <p className="mt-1 text-sm text-slate-500">
            Confirms the SQL and Python engines work offline and stop code that runs forever. Takes about 30
            seconds.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {running ? <LoaderCircle size={16} className="animate-spin" aria-hidden /> : <Play size={16} aria-hidden />}
          {running ? 'Checking…' : 'Run check'}
        </button>
      </div>

      {(results.length > 0 || running) && (
        <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
          {engineChecks.map((check, i) => {
            const r = results[i]
            const pending = !r && running && i === results.length
            return (
              <li key={check.name} className="flex items-start gap-3 py-2.5 text-sm">
                {r ? (
                  r.ok ? (
                    <CircleCheck size={18} className="mt-0.5 shrink-0 text-brand-600" aria-label="Passed" />
                  ) : (
                    <CircleX size={18} className="mt-0.5 shrink-0 text-red-600" aria-label="Failed" />
                  )
                ) : (
                  <LoaderCircle
                    size={18}
                    className={`mt-0.5 shrink-0 text-slate-300 ${pending ? 'animate-spin' : ''}`}
                    aria-hidden
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-800">{check.name}</div>
                  {r && <div className={r.ok ? 'text-slate-500' : 'text-red-700'}>{r.detail}</div>}
                </div>
                {r && <span className="shrink-0 tabular-nums text-slate-400">{(r.ms / 1000).toFixed(1)} s</span>}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

export default function SettingsPage() {
  return (
    <Page title="Settings" subtitle="App preferences and your local data.">
      <div className="space-y-4">
        <EngineCheck />
        <Card>
          <h2 className="font-semibold text-slate-900">Your data</h2>
          <p className="mt-1 text-sm text-slate-500">
            Progress is saved only on this PC, in a file called progress.json inside your Datara app-data folder.
            Backup (export/import) and reset options are coming in Phase 1.
          </p>
        </Card>
      </div>
    </Page>
  )
}
