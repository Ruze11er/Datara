import { Link } from 'react-router'
import { Bookmark, RotateCcw } from 'lucide-react'
import { Card, Page } from '../../components/Page'
import { labs, lessonCategories, lessonsInOrder, type Lab } from '../../content'
import { useProgress } from '../../lib/ProgressContext'
import { topicsToRevisit } from '../../lib/revisit'
import { chapterStats, isChapterUnlocked, overallStats } from '../../lib/labProgress'

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card>
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{value}</div>
      {detail && <div className="mt-0.5 text-xs text-slate-400">{detail}</div>}
    </Card>
  )
}

function Bar({ label, done, total, note }: { label: string; done: number; total: number; note?: string }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div>
      <div className="mb-1 flex justify-between gap-3 text-sm">
        <span className="text-slate-700">{label}</span>
        <span className="shrink-0 text-slate-500 tabular-nums">{note ?? `${done}/${total}`}</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function LabChapters({ lab }: { lab: Lab }) {
  const { progress } = useProgress()
  return (
    <Card>
      <h2 className="mb-4 font-semibold text-slate-900">{lab.name} chapters</h2>
      <div className="space-y-4">
        {lab.chapters.map((c, i) => {
          const s = chapterStats(progress, lab, i)
          const open = isChapterUnlocked(progress, lab, i)
          return (
            <Bar
              key={c.id}
              label={`Chapter ${i + 1}: ${c.title}`}
              done={s.solved}
              total={s.total}
              note={open ? `${s.solved}/${s.total} · ${s.stars}★` : 'Locked'}
            />
          )
        })}
      </div>
    </Card>
  )
}

export default function ProgressPage() {
  const { progress } = useProgress()
  const done = lessonsInOrder.filter((p) => progress?.lessons[p.lesson.id]?.completedAt)
  const scores = done.map((p) => progress?.lessons[p.lesson.id]?.quizScore).filter((s): s is number => s !== undefined)
  const avgQuiz = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) : null
  const totals = labs.map((lab) => overallStats(progress, lab))
  const solved = totals.reduce((s, t) => s + t.solved, 0)
  const levelCount = totals.reduce((s, t) => s + t.total, 0)
  const stars = totals.reduce((s, t) => s + t.stars, 0)
  const maxStars = totals.reduce((s, t) => s + t.maxStars, 0)
  const revisit = topicsToRevisit(progress)

  return (
    <Page title="Progress" subtitle="Everything you've completed, and what to revisit.">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Lessons completed" value={`${done.length}/${lessonsInOrder.length}`} />
        <Stat label="Levels solved" value={`${solved}/${levelCount}`} detail="SQL Lab and Python Lab" />
        <Stat label="Stars earned" value={`${stars}/${maxStars}`} detail="3 stars = solved without help" />
        <Stat label="Average quiz score" value={avgQuiz === null ? '–' : `${avgQuiz}%`} detail="Best score per lesson" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {labs.map((lab) => (
          <LabChapters key={lab.id} lab={lab} />
        ))}
        <Card>
          <h2 className="mb-4 font-semibold text-slate-900">Lessons</h2>
          <div className="space-y-4">
            {lessonCategories.map((cat) => {
              const ids = cat.modules.flatMap((m) => m.lessons)
              const n = ids.filter((id) => progress?.lessons[id]?.completedAt).length
              return <Bar key={cat.id} label={cat.title} done={n} total={ids.length} />
            })}
          </div>
        </Card>
      </div>

      <h2 className="mt-8 mb-3 flex items-center gap-2 font-semibold text-slate-900">
        <RotateCcw size={16} className="text-amber-500" aria-hidden /> Topics to revisit
      </h2>
      {revisit.levels.length === 0 && revisit.lessons.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">
            Nothing yet. Levels where you needed hints or the solution, low quiz scores, and lessons you save with{' '}
            <Bookmark size={13} className="inline" aria-label="Revisit later" /> will appear here.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card flush>
            <h3 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">Lessons</h3>
            <ul className="divide-y divide-slate-100">
              {revisit.lessons.map(({ lesson, reason }) => (
                <li key={lesson.id}>
                  <Link to={`/learn/${lesson.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-slate-50">
                    <span className="text-sm text-slate-800">{lesson.title}</span>
                    <span className="shrink-0 text-xs text-slate-500">{reason}</span>
                  </Link>
                </li>
              ))}
              {revisit.lessons.length === 0 && <li className="px-5 py-3 text-sm text-slate-400">None</li>}
            </ul>
          </Card>
          <Card flush>
            <h3 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">Levels to practise again</h3>
            <ul className="divide-y divide-slate-100">
              {revisit.levels.map(({ lab, level, reason }) => (
                <li key={`${lab.id}-${level.id}`}>
                  <Link to={`${lab.path}/${level.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-slate-50">
                    <span className="text-sm text-slate-800">
                      {lab.name} {level.number}: {level.title}
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">{reason}</span>
                  </Link>
                </li>
              ))}
              {revisit.levels.length === 0 && <li className="px-5 py-3 text-sm text-slate-400">None</li>}
            </ul>
          </Card>
        </div>
      )}
    </Page>
  )
}
