import { Link } from 'react-router'
import { Bookmark, CircleCheck, Clock } from 'lucide-react'
import { Card, Page } from '../../components/Page'
import { getLesson, lessonCategories, lessonsInOrder } from '../../content'
import { useProgress } from '../../lib/ProgressContext'

export default function LearnPage() {
  const { progress } = useProgress()
  const done = lessonsInOrder.filter((p) => progress?.lessons[p.lesson.id]?.completedAt).length

  return (
    <Page
      title="Learn"
      subtitle={`Short, beginner-friendly readings with examples, quizzes, and cited sources. ${done} of ${lessonsInOrder.length} completed.`}
    >
      <div className="space-y-6">
        {lessonCategories.map((category) => (
          <section key={category.id}>
            <h2 className="text-lg font-semibold text-slate-900">{category.title}</h2>
            <p className="mb-3 text-sm text-slate-500">{category.description}</p>
            <div className="space-y-3">
              {category.modules.map((module) => (
                <Card key={module.id} flush>
                  <h3 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">{module.title}</h3>
                  <ul className="divide-y divide-slate-100">
                    {module.lessons.map((id) => {
                      const lesson = getLesson(id)
                      if (!lesson) return null
                      const lp = progress?.lessons[id]
                      const bookmarked = progress?.bookmarks.includes(id)
                      return (
                        <li key={id}>
                          <Link to={`/learn/${id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50">
                            {lp?.completedAt ? (
                              <CircleCheck size={20} className="shrink-0 text-brand-600" aria-label="Completed" />
                            ) : (
                              <span className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-300" aria-label="Not completed" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-slate-900">{lesson.title}</div>
                              <div className="truncate text-sm text-slate-500">{lesson.summary}</div>
                            </div>
                            {bookmarked && <Bookmark size={16} className="shrink-0 fill-amber-400 text-amber-500" aria-label="Bookmarked" />}
                            {lp?.quizScore !== undefined && (
                              <span className="shrink-0 text-xs text-slate-500">Quiz {Math.round(lp.quizScore * 100)}%</span>
                            )}
                            <span className="flex shrink-0 items-center gap-1 text-xs text-slate-400">
                              <Clock size={12} aria-hidden /> {lesson.minutes} min
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Page>
  )
}
