// A case file: header, stage tabs, and the Briefing, Field Manual and Evidence Room tabs.
// The Investigation Lab is in InvestigationLab.tsx.

import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import {
  ArrowLeft,
  BookOpen,
  CircleCheck,
  CircleX,
  Compass,
  Eye,
  FileLock,
  FolderOpen,
  LoaderCircle,
  LockKeyhole,
  RotateCcw,
  SearchCheck,
  Table2,
  TriangleAlert
} from 'lucide-react'
import type { CaseDef, ManualCard } from '@shared/cases/types'
import type { CaseMode, CaseProgress } from '@shared/progress'
import { Card } from '../../components/Page'
import { Markdown } from '../../components/Markdown'
import { ResultTable } from '../../components/ResultTable'
import { getCase, getLesson, loadCaseDatasets, type CaseDatasets } from '../../content'
import { runSql } from '../../engines/sql/sqlEngine'
import type { SqlResult } from '../../engines/sql/types'
import { useProgress } from '../../lib/ProgressContext'
import { useSchema } from '../../lib/storeSchema'
import {
  caseProgress,
  caseStats,
  heldEvidence,
  isDocumentUnlocked,
  markSeen,
  startCase,
  withCase
} from '../../lib/caseProgress'
import { DocumentCard, EvidenceCard, FileLabel, ProgressBar, Stamp } from './CaseParts'
import { DetectiveBoard } from './DetectiveBoard'
import { InvestigationLab } from './InvestigationLab'
import { VerdictTab } from './VerdictTab'

export type CaseTab = 'briefing' | 'manual' | 'evidence' | 'lab' | 'board' | 'verdict'

const TABS: { id: CaseTab; label: string }[] = [
  { id: 'briefing', label: 'Briefing' },
  { id: 'manual', label: 'Field Manual' },
  { id: 'evidence', label: 'Evidence Room' },
  { id: 'lab', label: 'Investigation Lab' },
  { id: 'board', label: 'Detective Board' },
  { id: 'verdict', label: 'Verdict' }
]

/** Route wrapper: /academy/:caseId/:tab */
export default function CaseRoute() {
  const { caseId = '', tab } = useParams()
  const c = getCase(caseId)
  if (!c) return <Navigate to="/academy" replace />
  const current = TABS.some((t) => t.id === tab) ? (tab as CaseTab) : null
  return <CasePage key={c.id} c={c} tab={current} />
}

/** The case's datasets, loaded when the case opens (they are a few MB, so not part of the app's startup). */
function useCaseDatasets(c: CaseDef) {
  const [state, setState] = useState<{ datasets: CaseDatasets | null; error: string | null }>({ datasets: null, error: null })
  useEffect(() => {
    let alive = true
    loadCaseDatasets(c).then(
      (datasets) => alive && setState({ datasets, error: null }),
      (err: unknown) => alive && setState({ datasets: null, error: err instanceof Error ? err.message : String(err) })
    )
    return () => {
      alive = false
    }
  }, [c])
  return state
}

function CasePage({ c, tab }: { c: CaseDef; tab: CaseTab | null }) {
  const { progress } = useProgress()
  const cp = caseProgress(progress, c.id)
  const { datasets, error } = useCaseDatasets(c)
  if (!progress) return null
  // Before the case is taken only the briefing and the manual are open.
  const active: CaseTab = tab && (cp || tab === 'briefing' || tab === 'manual') ? tab : cp ? 'lab' : 'briefing'
  if (tab !== active) return <Navigate to={`/academy/${c.id}/${active}`} replace />
  const stats = caseStats(c, cp)

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-slate-200 bg-surface px-5 pt-3">
        <div className="flex items-center gap-3">
          <Link to="/academy" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
            <ArrowLeft size={16} aria-hidden /> Academy
          </Link>
          <span className="text-slate-300">|</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Stamp>Case #{c.number}</Stamp>
              <span className="text-xs text-slate-500">{c.company}</span>
            </div>
            <h1 className="truncate font-semibold text-slate-900">{c.title}</h1>
          </div>
          {cp && (
            <div className="ml-auto flex items-center gap-4">
              <Stamp tone="open">{cp.mode === 'guided' ? 'Guided' : 'Challenge'}</Stamp>
              <div className="w-44">
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>Core leads</span>
                  <span>
                    {stats.coreCracked} of {stats.coreTotal}
                  </span>
                </div>
                <ProgressBar value={stats.coreCracked} max={stats.coreTotal} label="Core leads cracked" />
              </div>
            </div>
          )}
        </div>
        <nav className="mt-2 -mb-px flex gap-1 overflow-x-auto" aria-label="Case file">
          {TABS.map((t) => {
            const label = t.id === 'verdict' && cp?.stage === 'closed' ? 'Case Closed' : t.label
            const locked = !cp && t.id !== 'briefing' && t.id !== 'manual'
            const cls = `flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium ${
              t.id === active
                ? 'border-brand-600 text-brand-700'
                : locked
                  ? 'border-transparent text-slate-300'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
            }`
            return locked ? (
              <span key={t.id} className={cls} aria-disabled title="Take the case first">
                <LockKeyhole size={13} aria-hidden /> {label}
              </span>
            ) : (
              <Link key={t.id} to={`/academy/${c.id}/${t.id}`} className={cls} aria-current={t.id === active ? 'page' : undefined}>
                {label}
              </Link>
            )
          })}
        </nav>
      </header>

      {cp && cp.caseVersion !== c.version && <VersionNote c={c} cp={cp} />}

      {active === 'lab' && cp ? (
        <div className="min-h-0 flex-1">
          {datasets ? <InvestigationLab c={c} cp={cp} datasets={datasets} /> : <DatasetStatus error={error} />}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className={`mx-auto px-8 py-6 ${active === 'board' ? 'max-w-6xl' : 'max-w-4xl'}`}>
            {active === 'briefing' && <Briefing c={c} cp={cp} />}
            {active === 'manual' && <FieldManual c={c} />}
            {active === 'evidence' && cp && <EvidenceRoom c={c} cp={cp} datasets={datasets} error={error} />}
            {active === 'board' && cp && <DetectiveBoard c={c} cp={cp} />}
            {active === 'verdict' && cp && <VerdictTab c={c} cp={cp} />}
          </div>
        </div>
      )}
    </div>
  )
}

function DatasetStatus({ error }: { error: string | null }) {
  if (error) {
    return (
      <div className="mx-auto mt-12 max-w-lg rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        The case data could not be loaded: {error}
      </div>
    )
  }
  return (
    <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500">
      <LoaderCircle size={16} className="animate-spin" aria-hidden /> Opening the case files…
    </div>
  )
}

function VersionNote({ c, cp }: { c: CaseDef; cp: CaseProgress }) {
  const { update } = useProgress()
  return (
    <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-5 py-2 text-sm text-amber-900">
      <TriangleAlert size={16} className="shrink-0 text-amber-600" aria-hidden />
      This case file has been updated since you started. Some of your findings may no longer match the data.
      <button
        type="button"
        className="ml-auto shrink-0 font-medium underline-offset-2 hover:underline"
        onClick={() => {
          if (window.confirm('Start this case again from the beginning? Your current findings will be cleared.')) {
            update((p) => startCase(p, c, cp.mode))
          }
        }}
      >
        Start again
      </button>
    </div>
  )
}

// ---------- Briefing ----------

const MODES: { id: CaseMode; title: string; text: string }[] = [
  {
    id: 'guided',
    title: 'Guided',
    text: 'Step-by-step instructions and a starter query for every lead. Recommended for your first case.'
  },
  {
    id: 'challenge',
    title: 'Challenge',
    text: 'Only the questions, and an empty editor. Hints are there if you need them. You can switch to guided at any time.'
  }
]

function Briefing({ c, cp }: { c: CaseDef; cp: CaseProgress | undefined }) {
  const { update } = useProgress()
  const navigate = useNavigate()
  const [mode, setMode] = useState<CaseMode>('guided')

  const take = () => {
    update((p) => startCase(p, c, mode))
    navigate(`/academy/${c.id}/evidence`)
  }

  return (
    <div className="space-y-6">
      <Card>
        <FileLabel>Briefing</FileLabel>
        <Markdown text={c.briefing} className="prose-lesson" />
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <FileLabel>Objectives</FileLabel>
          <ol className="list-decimal space-y-1.5 pl-5 text-[15px] text-slate-700">
            {c.objectives.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ol>
        </Card>
        <Card>
          <FileLabel>Persons of interest</FileLabel>
          <ul className="space-y-1.5 text-[15px]">
            {c.cast.map((m) => (
              <li key={m.id}>
                <span className="font-medium text-slate-900">{m.name}</span>
                <span className="text-slate-500">, {m.role}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-surface px-4 py-3 text-sm text-slate-600">
        <Compass size={16} className="mt-0.5 shrink-0 text-brand-600" aria-hidden />
        <span>
          <b className="text-slate-800">Recommended training:</b> {c.recommendedTraining}{' '}
          <Link to="/sql" className="font-medium text-brand-700 hover:underline">
            Open the SQL Lab
          </Link>
        </span>
      </div>

      {cp ? (
        <RunControls c={c} cp={cp} />
      ) : (
        <Card>
          <FileLabel>How do you want to work?</FileLabel>
          <div className="grid gap-3 md:grid-cols-2" role="radiogroup" aria-label="Mode">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={mode === m.id}
                onClick={() => setMode(m.id)}
                className={`rounded-lg border px-4 py-3 text-left ${
                  mode === m.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-semibold text-slate-900">{m.title}</div>
                <p className="mt-0.5 text-sm text-slate-600">{m.text}</p>
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Your case rating depends only on the quality of your investigation. Hints and failed checks never lower it.
          </p>
          <button
            type="button"
            onClick={take}
            className="mt-4 flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
          >
            <FolderOpen size={17} aria-hidden /> Take the case
          </button>
        </Card>
      )}
    </div>
  )
}

function RunControls({ c, cp }: { c: CaseDef; cp: CaseProgress }) {
  const { update } = useProgress()
  const navigate = useNavigate()
  return (
    <Card className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-slate-600">
        You took this case in <b className="text-slate-800">{cp.mode === 'guided' ? 'guided' : 'challenge'}</b> mode.
      </span>
      <div className="ml-auto flex flex-wrap gap-2">
        {cp.mode === 'challenge' && (
          <button
            type="button"
            onClick={() => update((p) => withCase(p, c.id, () => ({ mode: 'guided' })))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Switch to guided
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Start this case over? Everything you found in this run is cleared. Your best rating is kept.')) {
              update((p) => startCase(p, c, cp.mode))
              navigate(`/academy/${c.id}/lab`)
            }
          }}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
        >
          <RotateCcw size={14} aria-hidden /> Start over
        </button>
        <Link
          to={`/academy/${c.id}/lab`}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          <SearchCheck size={15} aria-hidden /> Back to the investigation
        </Link>
      </div>
    </Card>
  )
}

// ---------- Field Manual ----------

function FieldManual({ c }: { c: CaseDef }) {
  return (
    <div className="space-y-4">
      <p className="text-slate-600">
        Short notes on the methods this case needs. Each one ends with a quick check, and links to the full lesson.
      </p>
      {c.manual.map((card) => (
        <ManualEntry key={card.id} card={card} />
      ))}
    </div>
  )
}

function ManualEntry({ card }: { card: ManualCard }) {
  const [choice, setChoice] = useState<number | null>(null)
  const answered = choice !== null
  const right = choice === card.check.answer
  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900">{card.title}</h2>
      <Markdown text={card.body} className="mt-1.5 text-slate-700" />
      <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3">
        <p className="text-sm font-medium text-slate-800">{card.check.question}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {card.check.options.map((option, i) => (
            <button
              key={option}
              type="button"
              onClick={() => setChoice(i)}
              aria-pressed={choice === i}
              className={`rounded-lg border px-3 py-1.5 text-left text-sm ${
                answered && i === card.check.answer
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : choice === i
                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                    : 'border-slate-200 bg-surface text-slate-700 hover:border-slate-300'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        {answered && (
          <p className="mt-2 flex items-start gap-1.5 text-sm text-slate-700" role="status">
            {right ? (
              <CircleCheck size={15} className="mt-0.5 shrink-0 text-brand-600" aria-label="Correct" />
            ) : (
              <CircleX size={15} className="mt-0.5 shrink-0 text-amber-600" aria-label="Not quite" />
            )}
            {card.check.explanation}
          </p>
        )}
      </div>
      {card.lessons.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {card.lessons.map((id) => {
            const lesson = getLesson(id)
            return lesson ? (
              <Link
                key={id}
                to={`/learn/${id}`}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-sm text-slate-600 hover:border-brand-500"
              >
                <BookOpen size={13} className="text-brand-600" aria-hidden /> {lesson.title}
              </Link>
            ) : null
          })}
        </div>
      )}
    </Card>
  )
}

// ---------- Evidence Room ----------

function EvidenceRoom({
  c,
  cp,
  datasets,
  error
}: {
  c: CaseDef
  cp: CaseProgress
  datasets: CaseDatasets | null
  error: string | null
}) {
  const { update } = useProgress()
  const documents = c.documents.filter((d) => isDocumentUnlocked(cp, d))
  const lockedDocs = c.documents.length - documents.length
  const evidence = heldEvidence(c, cp)
  // Facts from hidden leads only count once found, so the total never gives a hidden lead away.
  const factsFound = evidence.filter((e) => e.kind === 'fact').length
  const factsTotal = c.evidence.filter(
    (e) => e.kind === 'fact' && (!!cp.evidence[e.id] || !c.leads.some((l) => l.secret && l.evidence === e.id))
  ).length

  // "New" markers stay for this visit; everything shown here counts as seen afterwards.
  const [unseen] = useState(() => new Set([...documents, ...evidence].map((x) => x.id).filter((id) => !cp.seen.includes(id))))
  const shownIds = [...documents, ...evidence].map((x) => x.id).join(',')
  useEffect(() => {
    if (shownIds) update((p) => markSeen(p, c.id, shownIds.split(',')))
  }, [shownIds, update, c.id])

  return (
    <div className="space-y-8">
      <section>
        <FileLabel>Case files</FileLabel>
        <div className="space-y-3">
          {documents.map((d) => (
            <DocumentCard key={d.id} c={c} doc={d} isNew={unseen.has(d.id)} />
          ))}
          {lockedDocs > 0 && (
            <p className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500">
              <FileLock size={16} aria-hidden />
              {lockedDocs} more file{lockedDocs === 1 ? '' : 's'} will turn up as you follow the leads.
            </p>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <FileLabel>Evidence locker</FileLabel>
          <span className="text-xs text-slate-500">
            {factsFound} of {factsTotal} facts found
          </span>
        </div>
        <div className="space-y-3">
          {evidence.map((e) => (
            <EvidenceCard key={e.id} c={c} evidence={e} record={cp.evidence[e.id]} isNew={unseen.has(e.id)} />
          ))}
        </div>
        {factsFound === 0 && (
          <p className="mt-3 text-sm text-slate-500">
            Claims are what people say. Facts are what you prove: crack leads in the{' '}
            <Link to={`/academy/${c.id}/lab`} className="font-medium text-brand-700 hover:underline">
              Investigation Lab
            </Link>{' '}
            and your findings are filed here.
          </p>
        )}
      </section>

      <section>
        <FileLabel>The data</FileLabel>
        {error && <p className="text-sm text-red-700">The data could not be loaded: {error}</p>}
        <DataDictionary c={c} datasets={datasets} />
      </section>
    </div>
  )
}

function DataDictionary({ c, datasets }: { c: CaseDef; datasets: CaseDatasets | null }) {
  const schema = useSchema(datasets?.practice ?? null)
  const [preview, setPreview] = useState<{ table: string; result: SqlResult | null; error?: string } | null>(null)

  const showPreview = async (table: string) => {
    if (!datasets) return
    if (preview?.table === table) return setPreview(null)
    setPreview({ table, result: null })
    try {
      setPreview({ table, result: await runSql({ sql: `SELECT * FROM ${table} LIMIT 10`, dataset: datasets.practice }) })
    } catch (err) {
      setPreview({ table, result: null, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return (
    <div className="space-y-3">
      {c.tables.map((t) => {
        const info = schema?.find((s) => s.name === t.name)
        return (
          <Card key={t.name} flush>
            <div className="flex items-start gap-3 px-4 py-3">
              <Table2 size={16} className="mt-0.5 shrink-0 text-brand-600" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono font-semibold text-slate-900">{t.name}</span>
                  {info && <span className="text-xs text-slate-500">{info.rowCount.toLocaleString()} rows</span>}
                </div>
                <p className="text-sm text-slate-600">{t.description}</p>
              </div>
              <button
                type="button"
                onClick={() => showPreview(t.name)}
                disabled={!datasets}
                aria-expanded={preview?.table === t.name}
                className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
              >
                <Eye size={13} aria-hidden /> {preview?.table === t.name ? 'Hide rows' : 'First 10 rows'}
              </button>
            </div>
            <table className="w-full border-t border-slate-100 text-sm">
              <tbody>
                {t.columns.map((col) => (
                  <tr key={col.name} className="border-b border-slate-100 last:border-0">
                    <td className="w-48 py-1.5 pr-3 pl-11 align-top font-mono text-[13px] text-slate-800">{col.name}</td>
                    <td className="w-20 py-1.5 pr-3 align-top text-[11px] text-slate-400 uppercase">
                      {info?.columns.find((x) => x.name === col.name)?.type ?? ''}
                    </td>
                    <td className="py-1.5 pr-4 text-slate-600">{col.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview?.table === t.name && (
              <div className="max-h-80 overflow-auto border-t border-slate-200">
                {preview.result ? (
                  <ResultTable columns={preview.result.columns} rows={preview.result.rows} />
                ) : preview.error ? (
                  <p className="px-4 py-3 text-sm text-red-700">{preview.error}</p>
                ) : (
                  <p className="flex items-center gap-2 px-4 py-3 text-sm text-slate-500">
                    <LoaderCircle size={14} className="animate-spin" aria-hidden /> Loading…
                  </p>
                )}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
