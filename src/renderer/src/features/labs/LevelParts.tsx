// Building blocks shared by the SQL and Python level screens.

import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, ArrowRight, BookOpen, CircleCheck, CircleX, Eye, Lightbulb, Lock, Play, RotateCcw, Trophy } from 'lucide-react'
import type { LevelProgress } from '@shared/progress'
import { Markdown } from '../../components/Markdown'
import { Stars } from '../../components/Stars'
import { getLesson, type BaseLevel, type Lab, type Numbered } from '../../content'

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">{children}</h2>
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

export function LevelHeader({
  lab,
  level,
  lp,
  previous,
  next
}: {
  lab: Lab
  level: Numbered<BaseLevel>
  lp: LevelProgress
  previous: Numbered<BaseLevel> | null
  next: Numbered<BaseLevel> | null
}) {
  const chapter = lab.chapters[level.chapterIndex]
  return (
    <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-3">
      <Link to={lab.path} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
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
        {lp.status === 'solved' && <Stars count={lp.stars} size={16} />}
        <div className="flex gap-1">
          <NavButton to={previous ? `${lab.path}/${previous.id}` : null} label="Previous level" icon={<ArrowLeft size={16} />} />
          <NavButton to={next ? `${lab.path}/${next.id}` : null} label="Next level" icon={<ArrowRight size={16} />} />
        </div>
      </div>
    </header>
  )
}

export function SolvedNote({ lp, onTryAgain }: { lp: LevelProgress; onTryAgain: () => void }) {
  if (lp.status !== 'solved') return null
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
      <span className="flex items-center gap-2">
        <CircleCheck size={16} aria-hidden /> Solved
      </span>
      {lp.stars < 3 && (lp.hintsUsed > 0 || lp.solutionViewed) && (
        <button type="button" onClick={onTryAgain} className="font-medium underline-offset-2 hover:underline">
          Try again for 3 stars
        </button>
      )}
    </div>
  )
}

export function HelpSection({
  level,
  lp,
  onHint,
  onSolution
}: {
  level: BaseLevel
  lp: LevelProgress
  onHint: () => void
  onSolution: () => void
}) {
  return (
    <section>
      <SectionTitle>Help</SectionTitle>
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
            onClick={onHint}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            <Lightbulb size={14} aria-hidden /> Show hint {lp.hintsUsed + 1} of {level.hints.length}
          </button>
        )}
        {!lp.solutionViewed && (
          <button
            type="button"
            onClick={onSolution}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50"
          >
            <Eye size={14} aria-hidden /> Show solution
          </button>
        )}
      </div>
      {lp.status !== 'solved' && lp.hintsUsed === 0 && !lp.solutionViewed && (
        <p className="mt-2 text-xs text-slate-400">Solve it without help for 3 stars.</p>
      )}
      {lp.solutionViewed && (
        <div className="mt-3">
          <div className="mb-1 text-xs font-medium text-slate-500">Solution</div>
          <pre className="overflow-x-auto rounded-lg bg-slate-900 px-3 py-2 font-mono text-[13px] text-slate-100">{level.solution}</pre>
        </div>
      )}
    </section>
  )
}

export function ExplanationSection({ level, lp }: { level: BaseLevel; lp: LevelProgress }) {
  if (lp.status !== 'solved' && !lp.solutionViewed) return null
  return (
    <section>
      <SectionTitle>Why it works</SectionTitle>
      <Markdown text={level.explanation} />
    </section>
  )
}

export function LessonLink({ lessonId }: { lessonId?: string }) {
  const lesson = lessonId ? getLesson(lessonId) : undefined
  if (!lesson) return null
  return (
    <Link
      to={`/learn/${lesson.id}`}
      className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-brand-500"
    >
      <BookOpen size={15} className="text-brand-600" aria-hidden />
      <span>
        Review the lesson: <span className="font-medium">{lesson.title}</span>
      </span>
    </Link>
  )
}

export function LockedLevel({ lab, level }: { lab: Lab; level: Numbered<BaseLevel> }) {
  return (
    <div className="mx-auto max-w-xl px-8 py-16 text-center">
      <Lock size={32} className="mx-auto text-slate-400" aria-hidden />
      <h1 className="mt-4 text-xl font-semibold text-slate-900">Level {level.number} is locked</h1>
      <p className="mt-2 text-slate-500">
        Solve every level in Chapter {level.chapterIndex} to unlock Chapter {level.chapterIndex + 1}.
      </p>
      <Link to={lab.path} className="mt-6 inline-block font-medium text-brand-700 hover:underline">
        Back to all levels
      </Link>
    </div>
  )
}

/** Result banner after pressing Check. */
export function CheckBanner({
  pass,
  title,
  message,
  stars,
  unlockedChapter,
  nextHref
}: {
  pass: boolean
  title: string
  message: string
  stars: number
  unlockedChapter: number | null
  nextHref: string | null
}) {
  if (pass) {
    return (
      <div className="flex items-center gap-3 border-b border-brand-100 bg-brand-50 px-4 py-3">
        <CircleCheck size={22} className="shrink-0 text-brand-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 font-semibold text-brand-700">
            {title} <Stars count={stars} />
          </div>
          <div className="text-sm text-slate-600">
            {message}
            {unlockedChapter && ` Chapter ${unlockedChapter} is now unlocked!`}
          </div>
        </div>
        {nextHref && (
          <Link
            to={nextHref}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Next level <ArrowRight size={15} aria-hidden />
          </Link>
        )}
      </div>
    )
  }
  return (
    <div className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3">
      <CircleX size={20} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
      <div>
        <div className="font-semibold text-amber-900">{title}</div>
        <div className="text-sm whitespace-pre-line text-amber-900/90">{message}</div>
      </div>
    </div>
  )
}

/** Run / Check / Reset buttons above the output. */
export function Toolbar({
  busy,
  onRun,
  onCheck,
  onReset
}: {
  busy: boolean
  onRun: () => void
  onCheck: () => void
  onReset: () => void
}) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2">
      <button
        type="button"
        onClick={onRun}
        disabled={busy}
        title="Run your code and see the result (Ctrl+Enter)"
        className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        <Play size={15} aria-hidden /> Run
      </button>
      <button
        type="button"
        onClick={onCheck}
        disabled={busy}
        title="Check whether your answer is correct (Ctrl+Shift+Enter)"
        className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        <CircleCheck size={15} aria-hidden /> Check answer
      </button>
      <span className="ml-1 hidden text-xs text-slate-400 lg:inline">Ctrl+Enter runs · Ctrl+Shift+Enter checks</span>
      <button
        type="button"
        onClick={onReset}
        title="Put the starting code back"
        className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
      >
        <RotateCcw size={14} aria-hidden /> Reset
      </button>
    </div>
  )
}
