import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { CircleX, CodeXml, Database, FileText, LoaderCircle, Play, RotateCcw } from 'lucide-react'
import { friendlySqlError } from '@shared/sqlCheck'
import { CodeEditor, type CodeEditorHandle } from '../../components/CodeEditor'
import { ResultTable } from '../../components/ResultTable'
import { STORE_DATASET } from '../../content'
import { isPythonStarted, runPythonLab } from '../../engines/python/pythonEngine'
import type { PyLabRun } from '../../engines/python/types'
import { runSql } from '../../engines/sql/sqlEngine'
import type { SqlResult } from '../../engines/sql/types'
import { useProgress } from '../../lib/ProgressContext'
import { shopCsvFiles, SHOP_TABLES } from '../../lib/shopFiles'
import { useStoreSchema } from '../../lib/storeSchema'
import { SectionTitle } from '../labs/LevelParts'
import { ErrorBox, OutputBlock, Variables } from '../python-lab/PythonResultParts'
import { SchemaPanel } from '../sql-lab/SchemaPanel'

type Language = 'sql' | 'python'

const EXAMPLES: Record<Language, string> = {
  sql: `-- The Playground: try any query on the practice shop.
-- Changes (INSERT, UPDATE, DELETE) are thrown away after each run.

SELECT category,
       COUNT(*) AS products,
       ROUND(AVG(price), 2) AS avg_price
FROM products
GROUP BY category
ORDER BY avg_price DESC;
`,
  python: `# The Playground: try any Python code.
# The shop's tables are files here: customers.csv, products.csv,
# orders.csv, order_items.csv and reviews.csv.
import pandas as pd

orders = pd.read_csv("orders.csv")
print(orders.head())

revenue_by_status = orders.groupby("status")["total_amount"].sum().round(2)
`
}

const AUTOSAVE_MS = 700

/** The editor's code, autosaved to the progress file so it's still there next time. */
function usePlaygroundCode(language: Language) {
  const { progress, update } = useProgress()
  const code = useRef(progress?.playground[language] ?? EXAMPLES[language])
  const timer = useRef<number | null>(null)

  const save = useCallback(() => {
    timer.current = null
    const text = code.current
    update((p) => (p.playground[language] === text ? p : { ...p, playground: { ...p.playground, [language]: text } }))
  }, [update, language])

  const onChange = useCallback(
    (text: string) => {
      code.current = text
      if (timer.current !== null) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(save, AUTOSAVE_MS)
    },
    [save]
  )

  useEffect(
    () => () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current)
        save()
      }
    },
    [save]
  )

  return { code, onChange, fontSize: progress?.settings.editorFontSize ?? 14 }
}

function Toolbar({ busy, onRun, onReset }: { busy: boolean; onRun: () => void; onReset: () => void }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-200 bg-surface px-4 py-2">
      <button
        type="button"
        onClick={onRun}
        disabled={busy}
        title="Run your code (Ctrl+Enter)"
        className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        <Play size={15} aria-hidden /> Run
      </button>
      <span className="ml-1 hidden text-xs text-slate-400 lg:inline">Ctrl+Enter runs</span>
      <button
        type="button"
        onClick={onReset}
        title="Replace your code with the example"
        className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
      >
        <RotateCcw size={14} aria-hidden /> Example
      </button>
    </div>
  )
}

function Running({ label }: { label: string }) {
  return (
    <div className="flex flex-1 items-center justify-center gap-2 text-sm text-slate-500">
      <LoaderCircle size={16} className="animate-spin" aria-hidden /> {label}
    </div>
  )
}

function Idle({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-slate-400">{children}</div>
}

const confirmReset = () => window.confirm('Replace your code with the example? Your current code will be lost.')

// ---------------------------------------------------------------- SQL

type SqlOutput =
  | { kind: 'idle' }
  | { kind: 'running'; label: string }
  | { kind: 'result'; label: string; result: SqlResult }
  | { kind: 'error'; message: string; raw: string }

function SqlPlayground() {
  const { code, onChange, fontSize } = usePlaygroundCode('sql')
  const schema = useStoreSchema()
  const editor = useRef<CodeEditorHandle>(null)
  const [output, setOutput] = useState<SqlOutput>({ kind: 'idle' })

  const runQuery = useCallback(async (sql: string, label: string) => {
    if (!sql.trim()) return
    setOutput({ kind: 'running', label: 'Running…' })
    try {
      setOutput({ kind: 'result', label, result: await runSql({ sql, dataset: STORE_DATASET }) })
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err)
      setOutput({ kind: 'error', message: friendlySqlError(raw), raw })
    }
  }, [])

  const run = useCallback(() => runQuery(code.current, 'Your query result'), [code, runQuery])
  const reset = () => {
    if (!confirmReset()) return
    editor.current?.setValue(EXAMPLES.sql)
    onChange(EXAMPLES.sql)
  }
  const autocomplete = Object.fromEntries((schema ?? []).map((t) => [t.name, t.columns.map((c) => c.name)]))

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(280px,340px)_1fr]">
      <aside className="min-h-0 overflow-y-auto border-r border-slate-200 bg-surface p-5">
        <SectionTitle>Tables</SectionTitle>
        <SchemaPanel
          schema={schema}
          focus={[]}
          onPreview={(table) => runQuery(`SELECT * FROM ${table} LIMIT 10`, `Preview: first 10 rows of ${table}`)}
        />
      </aside>
      <section className="flex min-h-0 min-w-0 flex-col">
        <div className="h-[45%] min-h-[160px] border-b border-slate-200">
          {schema && (
            <CodeEditor
              ref={editor}
              language="sql"
              initialValue={code.current}
              onChange={onChange}
              onRun={run}
              onCheck={run}
              schema={autocomplete}
              fontSize={fontSize}
            />
          )}
        </div>
        <Toolbar busy={output.kind === 'running'} onRun={run} onReset={reset} />
        {output.kind === 'idle' && <Idle>Write any query and press Run. Nothing here is checked or graded.</Idle>}
        {output.kind === 'running' && <Running label={output.label} />}
        {output.kind === 'error' && (
          <div className="flex-1 overflow-auto p-4">
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <div className="flex items-center gap-2 font-semibold text-red-800">
                <CircleX size={16} aria-hidden /> Your query has an error
              </div>
              <p className="mt-1 text-sm text-red-900">{output.message}</p>
              {output.raw !== output.message && <p className="mt-2 font-mono text-xs text-red-700/80">{output.raw}</p>}
            </div>
          </div>
        )}
        {output.kind === 'result' && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="px-4 py-2 text-xs font-medium text-slate-500">{output.label}</div>
            <div className="min-h-0 flex-1">
              <ResultTable columns={output.result.columns} rows={output.result.rows} truncated={output.result.truncated} />
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

// ---------------------------------------------------------------- Python

type PyOutput = { kind: 'idle' } | { kind: 'running'; label: string } | { kind: 'run'; result: PyLabRun } | { kind: 'failed'; message: string }

function PythonPlayground() {
  const { code, onChange, fontSize } = usePlaygroundCode('python')
  const schema = useStoreSchema()
  const editor = useRef<CodeEditorHandle>(null)
  const [output, setOutput] = useState<PyOutput>({ kind: 'idle' })

  const run = useCallback(async () => {
    if (!code.current.trim()) return
    setOutput({ kind: 'running', label: isPythonStarted() ? 'Running…' : 'Starting Python (this takes a few seconds the first time)…' })
    try {
      const files = await shopCsvFiles()
      setOutput({ kind: 'run', result: await runPythonLab('', code.current, files) })
    } catch (err) {
      setOutput({ kind: 'failed', message: err instanceof Error ? err.message : String(err) })
    }
  }, [code])

  const reset = () => {
    if (!confirmReset()) return
    editor.current?.setValue(EXAMPLES.python)
    onChange(EXAMPLES.python)
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(280px,340px)_1fr]">
      <aside className="min-h-0 space-y-4 overflow-y-auto border-r border-slate-200 bg-surface p-5">
        <section>
          <SectionTitle>Files</SectionTitle>
          <p className="mb-3 text-xs text-slate-500">
            The practice shop's tables, as CSV files in the same folder as your code. Read one with{' '}
            <code className="font-mono text-slate-700">pd.read_csv("orders.csv")</code>.
          </p>
          <ul className="space-y-2">
            {SHOP_TABLES.map((table) => {
              const info = schema?.find((t) => t.name === table)
              return (
                <li key={table} className="rounded-lg border border-slate-200 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText size={14} className="text-brand-600" aria-hidden />
                    <span className="font-mono font-medium text-slate-800">{table}.csv</span>
                    {info && <span className="ml-auto text-xs text-slate-400">{info.rowCount} rows</span>}
                  </div>
                  {info && (
                    <div className="mt-1 font-mono text-[12px] leading-relaxed text-slate-500">
                      {info.columns.map((c) => c.name).join(', ')}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      </aside>
      <section className="flex min-h-0 min-w-0 flex-col">
        <div className="h-[45%] min-h-[160px] border-b border-slate-200">
          <CodeEditor
            ref={editor}
            language="python"
            initialValue={code.current}
            onChange={onChange}
            onRun={run}
            onCheck={run}
            fontSize={fontSize}
          />
        </div>
        <Toolbar busy={output.kind === 'running'} onRun={run} onReset={reset} />
        {output.kind === 'idle' && (
          <Idle>Write any Python code and press Run to see what it prints and the variables it creates.</Idle>
        )}
        {output.kind === 'running' && <Running label={output.label} />}
        {output.kind === 'failed' && (
          <div className="flex-1 overflow-auto p-4">
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{output.message}</div>
          </div>
        )}
        {output.kind === 'run' && (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            {output.result.error && <ErrorBox error={output.result.error} />}
            {output.result.output ? (
              <OutputBlock title="Printed output" text={output.result.output} />
            ) : (
              !output.result.error && <p className="text-sm text-slate-400">Your code didn't print anything.</p>
            )}
            <Variables variables={output.result.variables} />
          </div>
        )}
      </section>
    </div>
  )
}

// ---------------------------------------------------------------- Page

const TABS: { id: Language; label: string; icon: typeof Database }[] = [
  { id: 'sql', label: 'SQL', icon: Database },
  { id: 'python', label: 'Python', icon: CodeXml }
]

export default function PlaygroundPage() {
  const [search, setSearch] = useSearchParams()
  const language: Language = search.get('lang') === 'python' ? 'python' : 'sql'

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-4 border-b border-slate-200 bg-surface px-5 py-3">
        <div>
          <h1 className="font-semibold text-slate-900">Playground</h1>
          <p className="text-xs text-slate-500">Free practice on the shop data. Nothing is checked or graded.</p>
        </div>
        <div className="ml-auto flex rounded-lg border border-slate-200 p-0.5" role="tablist" aria-label="Language">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={language === id}
              onClick={() => setSearch(id === 'sql' ? {} : { lang: id }, { replace: true })}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium ${
                language === id ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon size={15} aria-hidden /> {label}
            </button>
          ))}
        </div>
      </header>
      {language === 'sql' ? <SqlPlayground key="sql" /> : <PythonPlayground key="python" />}
    </div>
  )
}
