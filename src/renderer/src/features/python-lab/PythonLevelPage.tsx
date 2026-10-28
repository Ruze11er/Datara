import { useCallback, useRef, useState } from 'react'
import { Navigate, useParams } from 'react-router'
import { CircleX, LoaderCircle } from 'lucide-react'
import type { PythonLevel } from '@shared/content'
import { CodeEditor, type CodeEditorHandle } from '../../components/CodeEditor'
import { Markdown } from '../../components/Markdown'
import { ResultTable } from '../../components/ResultTable'
import { pythonLab, type Numbered } from '../../content'
import { checkPythonLab, isPythonStarted, runPythonLab } from '../../engines/python/pythonEngine'
import type { PyError, PyLabCheck, PyLabRun, PyVariable } from '../../engines/python/types'
import { followingLevel, isLevelUnlocked } from '../../lib/labProgress'
import {
  CheckBanner,
  ExplanationSection,
  HelpSection,
  LessonLink,
  LevelHeader,
  LockedLevel,
  SectionTitle,
  SolvedNote,
  Toolbar
} from '../labs/LevelParts'
import { useLevelSession, type AttemptResult } from '../labs/useLevelSession'

type Output =
  | { kind: 'idle' }
  | { kind: 'running'; label: string }
  | { kind: 'run'; result: PyLabRun }
  | { kind: 'check'; result: PyLabCheck; attempt: AttemptResult }
  | { kind: 'failed'; message: string }

/** Route wrapper: remounts the level screen whenever the level changes. */
export default function PythonLevelRoute() {
  const { levelId = '' } = useParams()
  const level = pythonLab.get(levelId)
  if (!level) return <Navigate to="/python" replace />
  return <PythonLevelPage key={level.id} level={level} />
}

function PythonLevelPage({ level }: { level: Numbered<PythonLevel> }) {
  const session = useLevelSession(pythonLab, level, level.starter)
  const { progress, lp, code } = session
  const editor = useRef<CodeEditorHandle>(null)
  const [output, setOutput] = useState<Output>({ kind: 'idle' })
  const busy = output.kind === 'running'

  const busyLabel = (action: string) =>
    isPythonStarted() ? `${action}…` : 'Starting Python (this takes a few seconds the first time)…'

  const run = useCallback(async () => {
    if (!code.current.trim()) return
    setOutput({ kind: 'running', label: busyLabel('Running') })
    try {
      const result = await runPythonLab(level.setup, code.current, level.files)
      setOutput({ kind: 'run', result })
    } catch (err) {
      setOutput({ kind: 'failed', message: err instanceof Error ? err.message : String(err) })
    }
  }, [code, level])

  const check = useCallback(async () => {
    if (!code.current.trim()) return
    setOutput({ kind: 'running', label: busyLabel('Checking') })
    try {
      const result = await checkPythonLab({
        setup: level.setup,
        code: code.current,
        solution: level.solution,
        expect: level.expect,
        checkOutput: level.checkOutput,
        variants: level.variants,
        calls: level.calls,
        files: level.files,
        ignoreRowOrder: level.ignoreRowOrder
      })
      const attempt = session.recordAttempt(result.pass)
      setOutput({ kind: 'check', result, attempt })
    } catch (err) {
      session.recordAttempt(false)
      setOutput({ kind: 'failed', message: err instanceof Error ? err.message : String(err) })
    }
  }, [code, level, session])

  const resetCode = () => {
    code.current = level.starter
    editor.current?.setValue(level.starter)
    editor.current?.focus()
  }

  const tryAgain = () => {
    session.resetTry()
    editor.current?.setValue(level.starter)
    setOutput({ kind: 'idle' })
  }

  if (!progress) return null
  if (!isLevelUnlocked(progress, pythonLab, level)) return <LockedLevel lab={pythonLab} level={level} />

  const previous = pythonLab.levels[level.number - 2] ?? null
  const next = followingLevel(progress, pythonLab, level)

  return (
    <div className="flex h-full flex-col">
      <LevelHeader lab={pythonLab} level={level} lp={lp} previous={previous} next={next} />

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(320px,400px)_1fr]">
        <aside className="min-h-0 space-y-5 overflow-y-auto border-r border-slate-200 bg-white p-5">
          <SolvedNote lp={lp} onTryAgain={tryAgain} />
          <section>
            <SectionTitle>Your task</SectionTitle>
            <Markdown text={level.task} />
          </section>
          {Object.entries(level.files).map(([name, text]) => (
            <section key={name}>
              <SectionTitle>File: {name}</SectionTitle>
              <p className="mb-2 text-xs text-slate-500">This file is in the same folder as your code.</p>
              <pre className="max-h-56 overflow-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[13px] text-slate-800">
                {text}
              </pre>
            </section>
          ))}
          {level.setup && (
            <section>
              <SectionTitle>Given data</SectionTitle>
              <p className="mb-2 text-xs text-slate-500">These variables already exist when your code runs.</p>
              <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[13px] text-slate-800">
                {level.setup}
              </pre>
            </section>
          )}
          <HelpSection level={level} lp={lp} onHint={session.revealHint} onSolution={session.revealSolution} />
          <ExplanationSection level={level} lp={lp} />
          <LessonLink lessonId={level.lesson} />
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col">
          <div className="h-[42%] min-h-[160px] border-b border-slate-200">
            <CodeEditor
              ref={editor}
              language="python"
              initialValue={code.current}
              onChange={session.onChange}
              onRun={run}
              onCheck={check}
              fontSize={progress.settings.editorFontSize}
            />
          </div>
          <Toolbar busy={busy} onRun={run} onCheck={check} onReset={resetCode} />
          <PythonOutput output={output} nextHref={next ? `/python/${next.id}` : null} />
        </section>
      </div>
    </div>
  )
}

function ErrorBox({ error }: { error: PyError }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
      <div className="flex items-center gap-2 font-semibold text-red-800">
        <CircleX size={16} aria-hidden /> {error.type}
        {error.line !== null && <span className="font-normal text-red-700">on line {error.line}</span>}
      </div>
      <p className="mt-1 text-sm text-red-900">{error.friendly}</p>
      {error.message && !error.friendly.includes(error.message) && (
        <p className="mt-2 font-mono text-xs text-red-700/80">{error.message}</p>
      )}
    </div>
  )
}

function OutputBlock({ title, text, muted = false }: { title: string; text: string; muted?: boolean }) {
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      <pre
        className={`overflow-x-auto rounded-lg border px-3 py-2 font-mono text-[13px] whitespace-pre-wrap ${
          muted ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-slate-800 bg-slate-900 text-slate-100'
        }`}
      >
        {text}
      </pre>
    </section>
  )
}

function Variables({ variables: all }: { variables: PyVariable[] }) {
  if (all.length === 0) return null
  // The learner's own variables first; given data (often a big table) after them.
  const variables = [...all.filter((v) => !v.given), ...all.filter((v) => v.given)]
  return (
    <section>
      <SectionTitle>Variables</SectionTitle>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-3 py-1.5 font-semibold">Name</th>
              <th className="px-3 py-1.5 font-semibold">Type</th>
              <th className="px-3 py-1.5 font-semibold">Value</th>
            </tr>
          </thead>
          <tbody>
            {variables.map((v) => (
              <tr key={v.name} className={`border-t border-slate-100 align-top ${v.given ? 'text-slate-400' : 'text-slate-800'}`}>
                <td className="px-3 py-1.5 font-mono whitespace-nowrap">
                  {v.name}
                  {v.given && <span className="ml-1.5 rounded bg-slate-100 px-1 font-sans text-[10px] text-slate-500">given</span>}
                </td>
                <td className="px-3 py-1.5 font-mono whitespace-nowrap">{v.type}</td>
                <td className="px-3 py-1.5 font-mono break-all">
                  {v.table ? (
                    <div className="flex max-h-64 max-w-full flex-col rounded border border-slate-200">
                      <ResultTable
                        columns={v.table.columns}
                        rows={v.table.rows}
                        totalRows={v.table.totalRows}
                        rowNumbers={false}
                        indexColumn
                        nullLabel="NaN"
                      />
                    </div>
                  ) : (
                    v.value
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {variables.some((v) => v.given) && <p className="mt-1 text-xs text-slate-400">Grey rows come from the given data.</p>}
    </section>
  )
}

function PythonOutput({ output, nextHref }: { output: Output; nextHref: string | null }) {
  if (output.kind === 'idle') {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-slate-400">
        Write your code above, then press <b className="mx-1 text-slate-500">Run</b> to see what it prints and the variables it
        creates, or <b className="mx-1 text-slate-500">Check answer</b> when you think it's right.
      </div>
    )
  }
  if (output.kind === 'running') {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-slate-500">
        <LoaderCircle size={16} className="animate-spin" aria-hidden /> {output.label}
      </div>
    )
  }
  if (output.kind === 'failed') {
    return (
      <div className="flex-1 overflow-auto p-4">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{output.message}</div>
      </div>
    )
  }

  const result = output.result
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {output.kind === 'check' && (
        <CheckBanner
          pass={output.result.pass}
          title={output.result.title}
          message={output.result.message}
          stars={output.attempt.stars}
          unlockedChapter={output.attempt.unlockedChapter}
          nextHref={nextHref}
        />
      )}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {result.error && <ErrorBox error={result.error} />}
        {result.output ? (
          <OutputBlock title="Printed output" text={result.output} />
        ) : (
          !result.error && <p className="text-sm text-slate-400">Your code didn't print anything.</p>
        )}
        {output.kind === 'check' && output.result.expectedOutput && (
          <OutputBlock title="Expected output" text={output.result.expectedOutput} muted />
        )}
        <Variables variables={result.variables} />
      </div>
    </div>
  )
}
