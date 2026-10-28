import { Link } from 'react-router'
import { ArrowRight, BookOpen, CodeXml, Database, type LucideIcon } from 'lucide-react'
import { Card, Page } from '../../components/Page'
import { useProgress } from '../../lib/ProgressContext'

interface Area {
  to: string
  title: string
  description: string
  icon: LucideIcon
  completed: number
}

export default function DashboardPage() {
  const { progress } = useProgress()
  const solved = (levels: Record<string, { status: string }> = {}) =>
    Object.values(levels).filter((l) => l.status === 'solved').length

  const areas: Area[] = [
    {
      to: '/learn',
      title: 'Learn',
      description: 'Short readings on analytics, SQL, Python, statistics and more, each with cited sources.',
      icon: BookOpen,
      completed: Object.values(progress?.lessons ?? {}).filter((l) => l.completedAt).length
    },
    {
      to: '/sql',
      title: 'SQL Lab',
      description: 'Solve business questions with real SQL queries on a sample online-store database.',
      icon: Database,
      completed: solved(progress?.sqlLevels)
    },
    {
      to: '/python',
      title: 'Python Lab',
      description: 'Practise Python and pandas on data-analysis tasks, from variables to DataFrames.',
      icon: CodeXml,
      completed: solved(progress?.pythonLevels)
    }
  ]

  return (
    <Page title="Welcome to Datara" subtitle="Learn data analytics at your own pace, fully offline.">
      <div className="grid gap-4 md:grid-cols-3">
        {areas.map(({ to, title, description, icon: Icon, completed }) => (
          <Link key={to} to={to} className="group">
            <Card className="flex h-full flex-col transition-colors group-hover:border-brand-500">
              <Icon className="text-brand-600" size={22} aria-hidden />
              <h2 className="mt-3 font-semibold text-slate-900">{title}</h2>
              <p className="mt-1 text-sm text-slate-500">{description}</p>
              <div className="mt-auto flex items-center justify-between pt-4 text-sm">
                <span className="text-slate-500">{completed} completed</span>
                <ArrowRight
                  size={16}
                  className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600"
                  aria-hidden
                />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </Page>
  )
}
