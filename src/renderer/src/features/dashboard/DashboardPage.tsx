import { Link } from 'react-router'
import { ArrowRight, BookOpen, CodeXml, Database, RotateCcw, type LucideIcon } from 'lucide-react'
import { Card, Page } from '../../components/Page'
import { lessonsInOrder } from '../../content'
import { useProgress } from '../../lib/ProgressContext'
import { nextLesson, topicsToRevisit } from '../../lib/revisit'
import { nextSqlLevel, overallSqlStats } from '../../lib/sqlProgress'

function ContinueCard({
  icon: Icon,
  label,
  title,
  to,
  done
}: {
  icon: LucideIcon
  label: string
  title: string | null
  to: string
  done: string
}) {
  return (
    <Card className="flex flex-col">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Icon size={16} className="text-brand-600" aria-hidden /> {label}
      </div>
      <div className="mt-1.5 text-lg font-semibold text-slate-900">{title ?? done}</div>
      {title && (
        <Link
          to={to}
          className="mt-4 flex w-fit items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Continue <ArrowRight size={16} aria-hidden />
        </Link>
      )}
    </Card>
  )
}

function AreaLink({ to, icon: Icon, title, detail }: { to: string; icon: LucideIcon; title: string; detail: string }) {
  return (
    <Link to={to} className="group">
      <Card className="flex h-full items-center gap-3 py-4 transition-colors group-hover:border-brand-500">
        <Icon size={20} className="text-brand-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="font-medium text-slate-900">{title}</div>
          <div className="text-sm text-slate-500">{detail}</div>
        </div>
        <ArrowRight size={16} className="text-slate-400 group-hover:text-brand-600" aria-hidden />
      </Card>
    </Link>
  )
}

export default function DashboardPage() {
  const { progress } = useProgress()
  const lesson = nextLesson(progress)
  const level = nextSqlLevel(progress)
  const sql = overallSqlStats(progress)
  const lessonsDone = lessonsInOrder.filter((p) => progress?.lessons[p.lesson.id]?.completedAt).length
  const revisit = topicsToRevisit(progress)
  const isNew = lessonsDone === 0 && sql.solved === 0

  return (
    <Page
      title={isNew ? 'Welcome to Datara' : 'Welcome back'}
      subtitle={
        isNew
          ? 'A good way to start: read the first lesson, then try Level 1 in the SQL Lab.'
          : 'Pick up where you left off.'
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <ContinueCard
          icon={BookOpen}
          label="Next lesson"
          title={lesson?.title ?? null}
          to={lesson ? `/learn/${lesson.id}` : '/learn'}
          done="You have completed every lesson!"
        />
        <ContinueCard
          icon={Database}
          label={level ? `SQL Lab, Level ${level.number}` : 'SQL Lab'}
          title={level?.title ?? null}
          to={level ? `/sql/${level.id}` : '/sql'}
          done="You have solved every available level!"
        />
      </div>

      <h2 className="mt-8 mb-3 font-semibold text-slate-900">Your areas</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <AreaLink to="/learn" icon={BookOpen} title="Learn" detail={`${lessonsDone} of ${lessonsInOrder.length} lessons completed`} />
        <AreaLink
          to="/sql"
          icon={Database}
          title="SQL Lab"
          detail={`${sql.solved} of ${sql.total} levels · ${sql.stars} stars`}
        />
        <AreaLink to="/python" icon={CodeXml} title="Python Lab" detail="Coming in Phase 2" />
      </div>

      {(revisit.levels.length > 0 || revisit.lessons.length > 0) && (
        <>
          <h2 className="mt-8 mb-3 flex items-center gap-2 font-semibold text-slate-900">
            <RotateCcw size={16} className="text-amber-500" aria-hidden /> Worth revisiting
          </h2>
          <Card flush>
            <ul className="divide-y divide-slate-100">
              {revisit.lessons.slice(0, 3).map(({ lesson: l, reason }) => (
                <li key={l.id}>
                  <Link to={`/learn/${l.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-slate-50">
                    <span className="text-sm font-medium text-slate-800">Lesson: {l.title}</span>
                    <span className="text-xs text-slate-500">{reason}</span>
                  </Link>
                </li>
              ))}
              {revisit.levels.slice(0, 3).map(({ level: lv, reason }) => (
                <li key={lv.id}>
                  <Link to={`/sql/${lv.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-slate-50">
                    <span className="text-sm font-medium text-slate-800">
                      Level {lv.number}: {lv.title}
                    </span>
                    <span className="text-xs text-slate-500">{reason}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Link to="/progress" className="mt-2 inline-block text-sm text-brand-700 hover:underline">
            See all on the Progress page
          </Link>
        </>
      )}
    </Page>
  )
}
