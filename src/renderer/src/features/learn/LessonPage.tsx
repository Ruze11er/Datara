import { Link, Navigate, useParams } from 'react-router'
import { ArrowLeft, ArrowRight, Bookmark, CircleCheck, Clock, Dumbbell, ExternalLink, Lock } from 'lucide-react'
import { Card } from '../../components/Page'
import { Markdown } from '../../components/Markdown'
import { Stars } from '../../components/Stars'
import { findLevel, getLessonPlace, lessonsInOrder } from '../../content'
import { useProgress } from '../../lib/ProgressContext'
import { withActivity } from '../../lib/activity'
import { isLevelUnlocked, levelProgress } from '../../lib/labProgress'
import { Quiz } from './Quiz'

export default function LessonRoute() {
  const { lessonId = '' } = useParams()
  const place = getLessonPlace(lessonId)
  if (!place) return <Navigate to="/learn" replace />
  return <LessonPage key={lessonId} lessonId={lessonId} />
}

function LessonPage({ lessonId }: { lessonId: string }) {
  const { progress, update } = useProgress()
  const place = getLessonPlace(lessonId)!
  const { lesson, category, moduleTitle } = place
  const lp = progress?.lessons[lesson.id]
  const bookmarked = !!progress?.bookmarks.includes(lesson.id)

  const index = lessonsInOrder.findIndex((p) => p.lesson.id === lesson.id)
  const previous = lessonsInOrder[index - 1]?.lesson
  const next = lessonsInOrder[index + 1]?.lesson

  const toggleBookmark = () =>
    update((p) => ({
      ...p,
      bookmarks: p.bookmarks.includes(lesson.id) ? p.bookmarks.filter((b) => b !== lesson.id) : [...p.bookmarks, lesson.id]
    }))

  const finishQuiz = (score: number) =>
    update((p) => {
      const current = p.lessons[lesson.id] ?? {}
      return {
        ...withActivity(p),
        lessons: {
          ...p.lessons,
          [lesson.id]: {
            completedAt: current.completedAt ?? new Date().toISOString(),
            quizScore: Math.max(current.quizScore ?? 0, score)
          }
        }
      }
    })

  return (
    <article className="mx-auto max-w-3xl px-8 py-8">
      <Link to="/learn" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft size={15} aria-hidden /> {category.title} · {moduleTitle}
      </Link>

      <header className="mt-3 mb-6 flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{lesson.title}</h1>
          <p className="mt-2 text-slate-500">{lesson.summary}</p>
          <div className="mt-3 flex items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Clock size={14} aria-hidden /> {lesson.minutes} min read
            </span>
            {lp?.completedAt && (
              <span className="flex items-center gap-1 text-brand-700">
                <CircleCheck size={14} aria-hidden /> Completed
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={toggleBookmark}
          aria-pressed={bookmarked}
          title={bookmarked ? 'Remove from topics to revisit' : 'Save to topics to revisit'}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          <Bookmark size={15} className={bookmarked ? 'fill-amber-400 text-amber-500' : ''} aria-hidden />
          {bookmarked ? 'Saved' : 'Revisit later'}
        </button>
      </header>

      <Markdown text={lesson.body} className="prose-lesson" />

      {lesson.practice.length > 0 && (
        <Card className="mt-8">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <Dumbbell size={17} className="text-brand-600" aria-hidden /> Practice this
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {lesson.practice.map((id) => {
              const found = findLevel(id)
              if (!found) return null
              const { lab, level } = found
              const open = isLevelUnlocked(progress, lab, level)
              const stars = levelProgress(progress, lab, id).stars
              const content = (
                <>
                  <span className="text-xs text-slate-500">{lab.id === 'sql' ? 'SQL' : 'Python'} {level.number}</span>
                  <span className="flex-1 truncate font-medium">{level.title}</span>
                  {open ? <Stars count={stars} size={12} /> : <Lock size={14} className="text-slate-400" aria-label="Locked" />}
                </>
              )
              return (
                <li key={id}>
                  {open ? (
                    <Link
                      to={`${lab.path}/${id}`}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 hover:border-brand-500"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div
                      className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-400"
                      title={`Unlocks when you finish Chapter ${level.chapterIndex}`}
                    >
                      {content}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      {lesson.quiz.length > 0 && (
        <Card className="mt-6">
          <h2 className="mb-1 font-semibold text-slate-900">Check your understanding</h2>
          <p className="mb-4 text-sm text-slate-500">Finish the quiz to mark this lesson as completed.</p>
          <Quiz questions={lesson.quiz} bestScore={lp?.quizScore} onFinish={finishQuiz} />
        </Card>
      )}

      {lesson.sources.length > 0 && (
        <section className="mt-8 border-t border-slate-200 pt-6">
          <h2 className="mb-3 font-semibold text-slate-900">Sources</h2>
          <ol className="space-y-2 text-sm">
            {lesson.sources.map((s) => (
              <li key={s.id} id={`source-${s.id}`} className="flex gap-2 rounded-md px-2 py-1 transition-colors">
                <span className="shrink-0 text-slate-400">[{s.id}]</span>
                <span className="text-slate-700">
                  {s.author && <>{s.author}. </>}
                  <a href={s.url} target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline">
                    {s.title}
                    <ExternalLink size={12} className="ml-1 inline align-baseline" aria-label="(opens in your browser)" />
                  </a>
                  . {s.publisher}. Accessed {s.accessed}.
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-slate-400">Links open in your web browser and need an internet connection.</p>
        </section>
      )}

      <nav className="mt-10 flex justify-between gap-4 border-t border-slate-200 pt-5 text-sm" aria-label="Lesson navigation">
        {previous ? (
          <Link to={`/learn/${previous.id}`} className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900">
            <ArrowLeft size={15} aria-hidden /> {previous.title}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to={`/learn/${next.id}`} className="flex items-center gap-1.5 font-medium text-brand-700 hover:underline">
            {next.title} <ArrowRight size={15} aria-hidden />
          </Link>
        )}
      </nav>
    </article>
  )
}
