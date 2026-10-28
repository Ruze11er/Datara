import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CircleCheck,
  CircleX,
  Eye,
  Lightbulb,
  LoaderCircle,
  Lock,
  Play,
  RotateCcw,
  Trophy
} from 'lucide-react'
import type { ProgressData } from '@shared/progress'
import { checkResult, friendlySqlError, type CheckOutcome } from '@shared/sqlCheck'
import { CodeEditor, type CodeEditorHandle } from '../../components/CodeEditor'
import { Markdown } from '../../components/Markdown'
import { ResultTable } from '../../components/ResultTable'
import { Stars } from '../../components/Stars'
import { getLesson, getSqlLevel, sqlChapters, sqlLevels, STORE_DATASET, type NumberedLevel } from '../../content'
import { runSql } from '../../engines/sql/sqlEngine'
import type { SqlResult } from '../../engines/sql/types'
import { useProgress } from '../../lib/ProgressContext'
import { useStoreSchema } from '../../lib/storeSchema'
import {
  followingLevel,
  isChapterUnlocked,
  isLevelUnlocked,
  levelProgress,
  starsForTry
} from '../../lib/sqlProgress'
import { SchemaPanel } from './SchemaPanel'

type Output =
  | { kind: 'idle' }
  | { kind: 'running'; label: string }
  | { kind: 'result'; label: string; result: SqlResult }
  | { kind: 'error'; message: string; raw: string }
  | { kind: 'check'; outcome: CheckOutcome; result: SqlResult; stars: number; unlockedChapter: number | null }

const AUTOSAVE_MS = 700

/** Route wrapper: remounts the level screen whenever the level changes. */
export default function SqlLevelRoute() {
  const { levelId = '' } = useParams()
  const level = getSqlLevel(levelId)
  if (!level) return <Navigate to="/sql" replace />
  return <SqlLevelPage key={level.id} level={level} />
}

function setLevel(p: ProgressData, id: string, change: (lp: ReturnType<typeof levelProgress>) => Partial<ReturnType<typeof levelProgress>>): ProgressData {
  const current = levelProgress(p, id)
  return { ...p, sqlLevels: { ...p.sqlLevels, [id]: { ...current, ...change(current) } } }
}

function SqlLevelPage({ level }: { level: NumberedLevel }) {
  const { progress, update } = useProgress()
  const schema = useStoreSchema()
  const editor = useRef<CodeEditorHandle>(null)
  const lp = levelProgress(progress, level.id)

  const code = useRef(lp.lastCode ?? level.starter)
  const [output, setOutput] = useState<Output>({ kind: 'idle' })
  const expected = useRef<Promise<SqlResult> | null>(null)
  const saveTimer = useRef<number | null>(null)

  const chapter = sqlChapters[level.chapterIndex]
  const unlocked = isLevelUnlocked(progress, level)
  const solved = lp.status === 'solved'
  const showExplanation = solved || lp.solutionViewed
  const lesson = level.lesson ? getLesson(level.lesson) : undefined
  const busy = output.kind === 'running'

  // ---- Autosave the editor contents
  const saveCode = useCallback(() => {
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current)
    saveTimer.current = null
    const text = code.current
    update((p) => (levelProgress(p, level.id).lastCode === text ? p : setLevel(p, level.id, () => ({ lastCode: text }))))
  }, [update, level.id])

  const onChange = useCallback(
    (text: string) => {
      code.current = text
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(saveCode, AUTOSAVE_MS)
    },
    [saveCode]
  )

  // Save any pending edit when leaving the level.
  useEffect(() => () => {
    if (saveTimer.current !== null) saveCode()
  }, [saveCode])

  // ---- Running and checking
  const run = useCallback(async () => {
    if (!code.current.trim()) return
    setOutput({ kind: 'running', label: 'Running…' })
    try {
      const result = await runSql({ sql: code.current, dataset: STORE_DATASET })
      setOutput({ kind: 'result', label: 'Your query result', result })
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err)
      setOutput({ kind: 'error', message: friendlySqlError(raw), raw })
    }
  }, [])

  const check = useCallback(async () => {
    if (!code.current.trim()) return
    setOutput({ kind: 'running', label: 'Checking…' })
    expected.current ??= runSql({ sql: level.solution, dataset: STORE_DATASET })
    const nextChapterWasLocked = !isChapterUnlocked(progress, level.chapterIndex + 1)

    let result: SqlResult
    try {
      result = await runSql({ sql: code.current, dataset: STORE_DATASET })
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err)
      update((p) => setLevel(p, level.id, (cur) => ({ attempts: cur.attempts + 1, lastCode: code.current })))
      setOutput({ kind: 'error', message: friendlySqlError(raw), raw })
      return
    }

    let answer: SqlResult
    try {
      answer = await expected.current
    } catch (err) {
      expected.current = null
      setOutput({ kind: 'error', message: 'The answer for this level could not be calculated.', raw: String(err) })
      return
    }

    const outcome = checkResult(answer, result, { orderMatters: level.orderMatters, checkColumnNames: level.checkColumnNames })
    let earned = 0
    let nextProgress: ProgressData | null = null
    update((p) => {
      nextProgress = setLevel(p, level.id, (cur) => {
        const base = { attempts: cur.attempts + 1, lastCode: code.current }
        if (!outcome.pass) return base
        earned = starsForTry(cur)
        return {
          ...base,
          status: 'solved',
          stars: Math.max(cur.stars, earned) as 0 | 1 | 2 | 3,
          solvedAt: cur.solvedAt ?? new Date().toISOString()
        }
      })
      return nextProgress
    })
    const unlockedChapter =
      outcome.pass && nextChapterWasLocked && isChapterUnlocked(nextProgress, level.chapterIndex + 1)
        ? level.chapterIndex + 2
        : null
    setOutput({ kind: 'check', outcome, result, stars: earned, unlockedChapter })
  }, [level, progress, update])

  // ---- Help
  const revealHint = () => update((p) => setLevel(p, level.id, (cur) => ({ hintsUsed: Math.min(cur.hintsUsed + 1, level.hints.length) })))

  const revealSolution = () => {
    const ok = window.confirm('Viewing the solution means this try can earn at most 1 star. Show it?')
    if (ok) update((p) => setLevel(p, level.id, () => ({ solutionViewed: true })))
  }

  const tryAgain = () => {
    update((p) => setLevel(p, level.id, () => ({ hintsUsed: 0, solutionViewed: false, lastCode: level.starter })))
    code.current = level.starter
    editor.current?.setValue(level.starter)
    setOutput({ kind: 'idle' })
  }

  const resetCode = () => {
    code.current = level.starter
    editor.current?.setValue(level.starter)
    editor.current?.focus()
  }

  const preview = async (table: string) => {
    setOutput({ kind: 'running', label: 'Loading preview…' })
    try {
      const result = await runSql({ sql: `SELECT * FROM ${table} LIMIT 10`, dataset: STORE_DATASET })
      setOutput({ kind: 'result', label: `Preview: first 10 rows of ${table}`, result })
    } catch (err) {
      setOutput({ kind: 'error', message: String(err), raw: String(err) })
    }
  }

  if (!progress) return null

  const previous = sqlLevels[level.number - 2]
  const next = followingLevel(progress, level)

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-xl px-8 py-16 text-center">
        <Lock size={32} className="mx-auto text-slate-400" aria-hidden />
        <h1 className="mt-4 text-xl font-semibold text-slate-900">Level {level.number} is locked</h1>
        <p className="mt-2 text-slate-500">Solve every level in Chapter {level.chapterIndex} to unlock Chapter {level.chapterIndex + 1}.</p>
        <Link to="/sql" className="mt-6 inline-block font-medium text-brand-700 hover:underline">
          Back to all levels
        </Link>
      </div>
    )
  }

  const autocomplete = Object.fromEntries((schema ?? []).map((t) => [t.name, t.columns.map((c) => c.name)]))

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-3">
        <Link to="/sql" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft size={16} aria-hidden /> All levels
        </Link>
        <span className="text-slate-300">|</span>
        <div className="min-w-0">
          <div className="text-xs text-slate-500">
            Chapter {level.chapterIndex + 1}: {chapter?.title} · Level {level.number}
          </div>
          <h1 className="flex items-center gap-2 truncate font-semibold text-slate-900">
            {level.isMilestone && <Trophy size={16} className="shrink-0 text-amber-500" aria-label="Milestone level" />}
            {level.title}
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {solved && <Stars count={lp.stars} size={16} />}
          <div className="flex gap-1">
            <NavButton to={previous ? `/sql/${previous.id}` : null} label="Previous level" icon={<ArrowLeft size={16} />} />
            <NavButton to={next ? `/sql/${next.id}` : null} label="Next level" icon={<ArrowRight size={16} />} />
          </div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(320px,400px)_1fr]">
        {/* Left: task, help, tables */}
        <aside className="min-h-0 space-y-5 overflow-y-auto border-r border-slate-200 bg-white p-5">
          {solved && (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
              <span className="flex items-center gap-2">
                <CircleCheck size={16} aria-hidden /> Solved
              </span>
              {lp.stars < 3 && (lp.hintsUsed > 0 || lp.solutionViewed) && (
                <button type="button" onClick={tryAgain} className="font-medium underline-offset-2 hover:underline">
                  Try again for 3 stars
                </button>
              )}
            </div>
          )}

          <section>
            <h2 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Your task</h2>
            <Markdown text={level.task} />
          </section>

          <section>
            <h2 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Help</h2>
            <ol className="space-y-2">
              {level.hints.slice(0, lp.hintsUsed).map((hint, i) => (
                <li key={i} className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-slate-700">
                  <Lightbulb size={15} className="mt-0.5 shrink-0 text-amber-500" aria-hidden />
                  <Markdown text={hint} className="prose-compact" />
                </li>
              ))}
            </ol>
            <div className="mt-2 flex flex-wrap gap-2">
              {lp.hintsUsed < level.hints.length && (
                <button
                  type="button"
                  onClick={revealHint}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Lightbulb size={14} aria-hidden /> Show hint {lp.hintsUsed + 1} of {level.hints.length}
                </button>
              )}
              {!lp.solutionViewed && (
                <button
                  type="button"
                  onClick={revealSolution}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50"
                >
                  <Eye size={14} aria-hidden /> Show solution
                </button>
              )}
            </div>
            {!solved && lp.hintsUsed === 0 && !lp.solutionViewed && (
              <p className="mt-2 text-xs text-slate-400">Solve it without help for 3 stars.</p>
            )}
            {lp.solutionViewed && (
              <div className="mt-3">
                <div className="mb-1 text-xs font-medium text-slate-500">Solution</div>
                <pre className="overflow-x-auto rounded-lg bg-slate-900 px-3 py-2 font-mono text-[13px] text-slate-100">
                  {level.solution}
                </pre>
              </div>
            )}
          </section>

          {showExplanation && (
            <section>
              <h2 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Why it works</h2>
              <Markdown text={level.explanation} />
            </section>
          )}

          {lesson && (
            <Link
              to={`/learn/${lesson.id}`}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-brand-500"
            >
              <BookOpen size={15} className="text-brand-600" aria-hidden />
              <span>
                Review the lesson: <span className="font-medium">{lesson.title}</span>
              </span>
            </Link>
          )}

          <section>
            <h2 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Tables</h2>
            <SchemaPanel schema={schema} focus={level.tables} onPreview={preview} />
          </section>
        </aside>

        {/* Right: editor and results */}
        <section className="flex min-h-0 min-w-0 flex-col">
          <div className="h-[38%] min-h-[150px] border-b border-slate-200">
            {schema && (
              <CodeEditor
                ref={editor}
                initialValue={code.current}
                onChange={onChange}
                onRun={run}
                onCheck={check}
                schema={autocomplete}
                fontSize={progress.settings.editorFontSize}
              />
            )}
          </div>

          <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2">
            <button
              type="button"
              onClick={run}
              disabled={busy}
              title="Run your query and see the result (Ctrl+Enter)"
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Play size={15} aria-hidden /> Run
            </button>
            <button
              type="button"
              onClick={check}
              disabled={busy}
              title="Check whether your answer is correct (Ctrl+Shift+Enter)"
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              <CircleCheck size={15} aria-hidden /> Check answer
            </button>
            <span className="ml-1 hidden text-xs text-slate-400 lg:inline">Ctrl+Enter runs · Ctrl+Shift+Enter checks</span>
            <button
              type="button"
              onClick={resetCode}
              title="Clear the editor"
              className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
            >
              <RotateCcw size={14} aria-hidden /> Reset
            </button>
          </div>

          <OutputPanel output={output} next={next} />
        </section>
      </div>
    </div>
  )
}

function NavButton({ to, label, icon }: { to: string | null; label: string; icon: ReactNode }) {
  const cls = 'flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200'
  if (!to)
    return (
      <span className={`${cls} text-slate-300`} aria-label={label} aria-disabled>
        {icon}
      </span>
    )
  return (
    <Link to={to} className={`${cls} text-slate-600 hover:bg-slate-50`} aria-label={label} title={label}>
      {icon}
    </Link>
  )
}

function OutputPanel({ output, next }: { output: Output; next: NumberedLevel | null }) {
  if (output.kind === 'idle') {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-slate-400">
        Write a query above, then press <b className="mx-1 text-slate-500">Run</b> to see the result or
        <b className="mx-1 text-slate-500">Check answer</b> when you think it's right.
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
  if (output.kind === 'error') {
    return (
      <div className="flex-1 overflow-auto p-4">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex items-center gap-2 font-semibold text-red-800">
            <CircleX size={16} aria-hidden /> Your query has an error
          </div>
          <p className="mt-1 text-sm text-red-900">{output.message}</p>
          {output.raw !== output.message && <p className="mt-2 font-mono text-xs text-red-700/80">{output.raw}</p>}
        </div>
      </div>
    )
  }

  const result = output.result
  let banner: ReactNode = <div className="px-4 py-2 text-xs font-medium text-slate-500">{output.kind === 'result' ? output.label : ''}</div>

  if (output.kind === 'check') {
    const { outcome } = output
    banner = outcome.pass ? (
      <div className="flex items-center gap-3 border-b border-brand-100 bg-brand-50 px-4 py-3">
        <CircleCheck size={22} className="shrink-0 text-brand-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 font-semibold text-brand-700">
            {outcome.title} <Stars count={output.stars} />
          </div>
          <div className="text-sm text-slate-600">
            {outcome.message}
            {output.unlockedChapter && ` Chapter ${output.unlockedChapter} is now unlocked!`}
          </div>
        </div>
        {next && (
          <Link
            to={`/sql/${next.id}`}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Next level <ArrowRight size={15} aria-hidden />
          </Link>
        )}
      </div>
    ) : (
      <div className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3">
        <CircleX size={20} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
        <div>
          <div className="font-semibold text-amber-900">{outcome.title}</div>
          <div className="text-sm text-amber-900/90">{outcome.message}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {banner}
      <div className="min-h-0 flex-1">
        <ResultTable columns={result.columns} rows={result.rows} truncated={result.truncated} />
      </div>
    </div>
  )
}
