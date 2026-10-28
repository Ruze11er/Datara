import { useCallback, useRef, useState } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router'
import { CircleX, LoaderCircle } from 'lucide-react'
import { checkHiddenResult, checkResult, friendlySqlError, type CheckOutcome } from '@shared/sqlCheck'
import { CodeEditor, type CodeEditorHandle } from '../../components/CodeEditor'
import { Markdown } from '../../components/Markdown'
import { TableOrChart } from '../../components/TableOrChart'
import { sqlLab, STORE_DATASET, STORE_HIDDEN_DATASET, type NumberedLevel } from '../../content'
import { runSql } from '../../engines/sql/sqlEngine'
import type { SqlResult } from '../../engines/sql/types'
import { followingLevel, isLevelUnlocked } from '../../lib/labProgress'
import { useStoreSchema } from '../../lib/storeSchema'
import {
  CheckBanner,
  ExplanationSection,
  HelpSection,
  LessonLink,
  LevelHeader,
  LockedLevel,
  SectionTitle,
  ReviewNote,
  REVIEW_NEXT,
  SolvedNote,
  type NextLink,
  Toolbar
} from '../labs/LevelParts'
import { NotesBox } from '../notes/NotesBox'
import { levelNoteKey } from '../../lib/notes'
import { useLevelSession, type AttemptResult } from '../labs/useLevelSession'
import { SchemaPanel } from './SchemaPanel'

type Output =
  | { kind: 'idle' }
  | { kind: 'running'; label: string }
  | { kind: 'result'; label: string; result: SqlResult }
  | { kind: 'error'; message: string; raw: string }
  | { kind: 'check'; outcome: CheckOutcome; result: SqlResult; attempt: AttemptResult }

/** Route wrapper: remounts the level screen whenever the level changes. */
export default function SqlLevelRoute() {
  const { levelId = '' } = useParams()
  const [search] = useSearchParams()
  const reviewing = search.get('review') === '1'
  const level = sqlLab.get(levelId)
  if (!level) return <Navigate to="/sql" replace />
  return <SqlLevelPage key={`${level.id}-${reviewing}`} level={level} reviewing={reviewing} />
}

function SqlLevelPage({ level, reviewing }: { reviewing: boolean; level: NumberedLevel }) {
  const session = useLevelSession(sqlLab, level, level.starter, reviewing)
  const { progress, lp, code } = session
  const schema = useStoreSchema()
  const editor = useRef<CodeEditorHandle>(null)
  const [output, setOutput] = useState<Output>({ kind: 'idle' })
  const expected = useRef<Promise<SqlResult> | null>(null)
  const busy = output.kind === 'running'

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
  }, [code])

  const check = useCallback(async () => {
    if (!code.current.trim()) return
    setOutput({ kind: 'running', label: 'Checking…' })
    expected.current ??= runSql({ sql: level.solution, dataset: STORE_DATASET })

    let result: SqlResult
    try {
      result = await runSql({ sql: code.current, dataset: STORE_DATASET })
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err)
      session.recordAttempt(false)
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

    const options = { orderMatters: level.orderMatters, checkColumnNames: level.checkColumnNames }
    let outcome = checkResult(answer, result, options)
    if (outcome.pass && level.hiddenData) {
      // Step 2: same check on the hidden shop, so typed-in values (instead of calculations) fail.
      try {
        const hiddenAnswer = await runSql({ sql: level.solution, dataset: STORE_HIDDEN_DATASET })
        const hiddenResult = await runSql({ sql: code.current, dataset: STORE_HIDDEN_DATASET }).catch(() => null)
        outcome = checkHiddenResult(hiddenAnswer, hiddenResult, options)
      } catch {
        // If the reference answer can't run on the hidden data, the visible check stands.
      }
    }
    const attempt = session.recordAttempt(outcome.pass)
    setOutput({ kind: 'check', outcome, result, attempt })
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
  if (!isLevelUnlocked(progress, sqlLab, level)) return <LockedLevel lab={sqlLab} level={level} />

  const previous = sqlLab.levels[level.number - 2] ?? null
  const next = followingLevel(progress, sqlLab, level)
  const autocomplete = Object.fromEntries((schema ?? []).map((t) => [t.name, t.columns.map((c) => c.name)]))

  return (
    <div className="flex h-full flex-col">
      <LevelHeader lab={sqlLab} level={level} lp={lp} previous={previous} next={next} />

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(320px,400px)_1fr]">
        <aside className="min-h-0 space-y-5 overflow-y-auto border-r border-slate-200 bg-surface p-5">
          {reviewing && <ReviewNote />}
          {!reviewing && <SolvedNote lp={lp} onTryAgain={tryAgain} />}
          <section>
            <SectionTitle>Your task</SectionTitle>
            <Markdown text={level.task} />
          </section>
          <HelpSection level={level} lp={lp} onHint={session.revealHint} onSolution={session.revealSolution} />
          {!reviewing && <ExplanationSection level={level} lp={lp} />}
          <LessonLink lessonId={level.lesson} />
          <NotesBox noteKey={levelNoteKey('sql', level.id)} />
          <section>
            <SectionTitle>Tables</SectionTitle>
            <SchemaPanel schema={schema} focus={level.tables} onPreview={preview} />
          </section>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col">
          <div className="h-[38%] min-h-[150px] border-b border-slate-200">
            {schema && (
              <CodeEditor
                ref={editor}
                language="sql"
                initialValue={code.current}
                onChange={session.onChange}
                onRun={run}
                onCheck={check}
                schema={autocomplete}
                fontSize={progress.settings.editorFontSize}
              />
            )}
          </div>

          <Toolbar busy={busy} onRun={run} onCheck={check} onReset={resetCode} />

          <SqlOutput output={output} next={reviewing ? REVIEW_NEXT : next ? { href: `/sql/${next.id}`, label: 'Next level' } : null} />
        </section>
      </div>
    </div>
  )
}

function SqlOutput({ output, next }: { output: Output; next: NextLink | null }) {
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {output.kind === 'check' ? (
        <CheckBanner
          pass={output.outcome.pass}
          title={output.outcome.title}
          message={output.outcome.message}
          stars={output.attempt.stars}
          unlockedChapter={output.attempt.unlockedChapter}
          nextHref={next?.href ?? null}
          nextLabel={next?.label}
          nextReview={output.attempt.nextReview}
        />
      ) : null}
      <div className="min-h-0 flex-1">
        <TableOrChart
          label={output.kind === 'check' ? 'Your query result' : output.label}
          columns={output.result.columns}
          rows={output.result.rows}
          truncated={output.result.truncated}
        />
      </div>
    </div>
  )
}
