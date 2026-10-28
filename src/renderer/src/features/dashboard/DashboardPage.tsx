import { Link } from 'react-router'
import { ArrowRight, BookOpen, CodeXml, Database, RotateCcw, type LucideIcon } from 'lucide-react'
import { Card, Page } from '../../components/Page'
import { lessonsInOrder, pythonLab, sqlLab, type Lab } from '../../content'
import { useProgress } from '../../lib/ProgressContext'
import { nextLesson, topicsToRevisit } from '../../lib/revisit'
import { nextLevel, overallStats } from '../../lib/labProgress'

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
      <div className="mt-1.5 text-lg leading-snug font-semibold text-slate-900">{title ?? done}</div>
      {title && (
        <Link
          to={to}
          className="mt-auto flex w-fit items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Continue <ArrowRight size={16} aria-hidden />
        </Link>
      )}
    </Card>
  )
}

function LabContinue({ lab, icon }: { lab: Lab; icon: LucideIcon }) {
  const { progress } = useProgress()
  const level = nextLevel(progress, lab)
  const stats = overallStats(progress, lab)
  return (
    <ContinueCard
      icon={icon}
      label={level ? `${lab.name}, Level ${level.number} · ${stats.solved}/${stats.total} solved` : lab.name}
      title={level?.title ?? null}
      to={level ? `${lab.path}/${level.id}` : lab.path}
      done="You have solved every available level!"
    />
  )
}

export default function DashboardPage() {
  const { progress } = useProgress()
  const lesson = nextLesson(progress)
  const sql = overallStats(progress, sqlLab)
  const py = overallStats(progress, pythonLab)
  const lessonsDone = lessonsInOrder.filter((p) => progress?.lessons[p.lesson.id]?.completedAt).length
  const revisit = topicsToRevisit(progress)
  const isNew = lessonsDone === 0 && sql.solved === 0 && py.solved === 0

  return (
    <Page
      title={isNew ? 'Welcome to Datara' : 'Welcome back'}
      subtitle={
        isNew
          ? 'A good way to start: read the first lesson, then try Level 1 in the SQL Lab.'
          : 'Pick up where you left off.'
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <ContinueCard
          icon={BookOpen}
          label={`Next lesson · ${lessonsDone}/${lessonsInOrder.length} completed`}
          title={lesson?.title ?? null}
          to={lesson ? `/learn/${lesson.id}` : '/learn'}
          done="You have completed every lesson!"
        />
        <LabContinue lab={sqlLab} icon={Database} />
        <LabContinue lab={pythonLab} icon={CodeXml} />
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
              {revisit.levels.slice(0, 3).map(({ lab, level: lv, reason }) => (
                <li key={`${lab.id}-${lv.id}`}>
                  <Link to={`${lab.path}/${lv.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-slate-50">
                    <span className="text-sm font-medium text-slate-800">
                      {lab.name} level {lv.number}: {lv.title}
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
