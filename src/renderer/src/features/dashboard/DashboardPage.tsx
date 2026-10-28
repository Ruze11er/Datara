import { Link } from 'react-router'
import { ArrowRight, BookOpen, CodeXml, Database, Fingerprint, RotateCcw, type LucideIcon } from 'lucide-react'
import { Card, Page } from '../../components/Page'
import { lessonsInOrder, pythonLab, sqlLab, type Lab } from '../../content'
import { useProgress } from '../../lib/ProgressContext'
import { nextLesson, topicsToRevisit } from '../../lib/revisit'
import { nextLevel, overallStats } from '../../lib/labProgress'
import { reviewHref, reviewQueue } from '../../lib/reviewQueue'
import { activityByDay, streaks } from '../../lib/activity'
import { academyRank } from '../../lib/academyXp'
import { caseProgress, caseStats, isCaseUnlocked } from '../../lib/caseProgress'
import { cases } from '../../content'
import { RankSummary } from '../academy/RankParts'

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
  const queue = reviewQueue(progress)
  const streak = streaks(activityByDay(progress)).current
  const isNew = lessonsDone === 0 && sql.solved === 0 && py.solved === 0 && Object.keys(progress?.cases ?? {}).length === 0

  return (
    <Page
      title={isNew ? 'Welcome to Datara' : 'Welcome back'}
      subtitle={
        isNew
          ? 'A good way to start: read the first lesson, then try Level 1 in the SQL Lab.'
          : streak >= 2
            ? `Pick up where you left off. You're on a ${streak}-day practice streak.`
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

      <AcademyCard />

      {queue.due.length > 0 && (
        <Card className="mt-4 flex items-center gap-4 border-sky-200 bg-sky-50">
          <RotateCcw size={22} className="shrink-0 text-sky-600" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-slate-900">
              {queue.due.length === 1 ? '1 level is' : `${queue.due.length} levels are`} due for review
            </div>
            <div className="text-sm text-slate-600">
              Solve {queue.due.length === 1 ? 'it' : 'them'} again without help to make the skills stick.
            </div>
          </div>
          <Link
            to={reviewHref(queue.due[0]!.lab, queue.due[0]!.level)}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            Start reviewing <ArrowRight size={16} aria-hidden />
          </Link>
        </Card>
      )}

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

/** The learner's Academy rank and the case to work on next. */
function AcademyCard() {
  const { progress } = useProgress()
  if (!progress) return null
  const index = cases.findIndex((c, i) => isCaseUnlocked(progress, cases, i) && caseProgress(progress, c.id)?.stage !== 'closed')
  const c = index >= 0 ? cases[index] : undefined
  const cp = c ? caseProgress(progress, c.id) : undefined
  const stats = c ? caseStats(c, cp) : null
  return (
    <Card className="mt-4 flex flex-wrap items-center gap-6">
      <div className="min-w-64 flex-1">
        <RankSummary state={academyRank(progress)} compact />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="text-sm text-slate-600">
          {c ? (
            <>
              <span className="font-medium text-slate-900">
                Case #{c.number}: {c.title}
              </span>
              <br />
              {cp ? `${stats!.coreCracked} of ${stats!.coreTotal} core leads cracked` : 'A new case is waiting on your desk.'}
            </>
          ) : (
            'Every case on file is closed. New cases are on their way.'
          )}
        </div>
        <Link
          to={c ? `/academy/${c.id}/${cp ? 'lab' : 'briefing'}` : '/academy'}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Fingerprint size={16} aria-hidden /> {c && cp ? 'Continue the case' : c ? 'Open the case' : 'Academy'}
        </Link>
      </div>
    </Card>
  )
}
