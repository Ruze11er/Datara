import { useState } from 'react'
import { CircleCheck, CircleX, Download, LoaderCircle, Minus, Play, Plus, Trash2, Upload } from 'lucide-react'
import { emptyProgress } from '@shared/progress'
import { Card, Page } from '../../components/Page'
import { engineChecks, type CheckResult } from '../../lib/engineChecks'
import { useProgress } from '../../lib/ProgressContext'
import { normalizeProgress, progressStorage } from '../../lib/progressStorage'

const FONT_MIN = 12
const FONT_MAX = 22

function EditorSettings() {
  const { progress, update } = useProgress()
  const size = progress?.settings.editorFontSize ?? 14
  const setSize = (n: number) =>
    update((p) => ({ ...p, settings: { ...p.settings, editorFontSize: Math.min(FONT_MAX, Math.max(FONT_MIN, n)) } }))

  const btn = 'flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40'
  return (
    <Card>
      <h2 className="font-semibold text-slate-900">Code editor</h2>
      <div className="mt-3 flex items-center gap-3">
        <span className="text-sm text-slate-600">Text size</span>
        <button type="button" className={btn} onClick={() => setSize(size - 1)} disabled={size <= FONT_MIN} aria-label="Smaller">
          <Minus size={14} aria-hidden />
        </button>
        <span className="w-12 text-center text-sm tabular-nums">{size}px</span>
        <button type="button" className={btn} onClick={() => setSize(size + 1)} disabled={size >= FONT_MAX} aria-label="Larger">
          <Plus size={14} aria-hidden />
        </button>
        <code className="ml-4 rounded bg-slate-100 px-2 py-1 font-mono text-slate-700" style={{ fontSize: size }}>
          SELECT * FROM products;
        </code>
      </div>
    </Card>
  )
}

function DataSettings() {
  const { progress, update } = useProgress()
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function exportBackup() {
    if (!progress) return
    try {
      const saved = await progressStorage.exportBackup(progress)
      if (saved) setMessage({ ok: true, text: 'Backup saved.' })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : String(err) })
    }
  }

  async function importBackup() {
    try {
      const raw = await progressStorage.importBackup()
      if (raw === null) return
      const ok = window.confirm('Replace your current progress with this backup? Your current progress will be lost.')
      if (!ok) return
      update(() => normalizeProgress(raw))
      setMessage({ ok: true, text: 'Backup restored.' })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : String(err) })
    }
  }

  function reset() {
    const ok = window.confirm(
      'Delete ALL your progress (lessons, levels, stars, bookmarks)? This cannot be undone. Consider saving a backup first.'
    )
    if (!ok) return
    update(() => emptyProgress())
    setMessage({ ok: true, text: 'All progress has been reset.' })
  }

  const btn =
    'flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'
  return (
    <Card>
      <h2 className="font-semibold text-slate-900">Your data</h2>
      <p className="mt-1 text-sm text-slate-500">
        Progress is saved automatically, only on this PC (in a file called progress.json in your Datara app-data folder). Save a
        backup to keep a copy or move your progress to another PC.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={exportBackup} className={btn}>
          <Download size={15} aria-hidden /> Save a backup
        </button>
        <button type="button" onClick={importBackup} className={btn}>
          <Upload size={15} aria-hidden /> Restore from backup
        </button>
        <button
          type="button"
          onClick={reset}
          className="ml-auto flex items-center gap-2 rounded-lg border border-red-200 px-3.5 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          <Trash2 size={15} aria-hidden /> Reset all progress
        </button>
      </div>
      {message && (
        <p className={`mt-3 text-sm ${message.ok ? 'text-brand-700' : 'text-red-700'}`} role="status">
          {message.text}
        </p>
      )}
    </Card>
  )
}

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
            Confirms the SQL and Python engines work offline and stop code that runs forever. Takes about 30 seconds.
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
                  <LoaderCircle size={18} className={`mt-0.5 shrink-0 text-slate-300 ${pending ? 'animate-spin' : ''}`} aria-hidden />
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
        <EditorSettings />
        <DataSettings />
        <EngineCheck />
      </div>
    </Page>
  )
}
