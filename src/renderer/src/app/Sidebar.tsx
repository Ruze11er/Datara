import { NavLink } from 'react-router'
import {
  BookOpen,
  ChartColumn,
  CodeXml,
  Database,
  LayoutDashboard,
  NotebookPen,
  RotateCcw,
  Settings,
  SquareTerminal,
  type LucideIcon
} from 'lucide-react'
import { useProgress } from '../lib/ProgressContext'
import { reviewQueue } from '../lib/reviewQueue'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Small count shown on the right, e.g. reviews due. */
  badge?: number
}

function NavButton({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors ${
          isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`
      }
    >
      <Icon size={18} strokeWidth={2} aria-hidden />
      {item.label}
      {!!item.badge && (
        <span
          className="ml-auto rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700"
          aria-label={`${item.badge} due`}
        >
          {item.badge}
        </span>
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  const { progress } = useProgress()
  const due = reviewQueue(progress).due.length

  const mainNav: NavItem[] = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/learn', label: 'Learn', icon: BookOpen },
    { to: '/sql', label: 'SQL Lab', icon: Database },
    { to: '/python', label: 'Python Lab', icon: CodeXml },
    { to: '/review', label: 'Review', icon: RotateCcw, badge: due },
    { to: '/playground', label: 'Playground', icon: SquareTerminal },
    { to: '/notes', label: 'Notes', icon: NotebookPen },
    { to: '/progress', label: 'Progress', icon: ChartColumn }
  ]

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-surface px-3 py-5">
      <div className="mb-6 flex items-center gap-2.5 px-3">
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
          <rect width="28" height="28" rx="7" fill="var(--color-brand-600)" />
          <rect x="7" y="15" width="3.5" height="6" rx="1" fill="white" />
          <rect x="12.25" y="10" width="3.5" height="11" rx="1" fill="white" />
          <rect x="17.5" y="6" width="3.5" height="15" rx="1" fill="white" />
        </svg>
        <span className="text-lg font-semibold tracking-tight text-slate-900">Datara</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
        {mainNav.map((item) => (
          <NavButton key={item.to} item={item} />
        ))}
      </nav>

      <NavButton item={{ to: '/settings', label: 'Settings', icon: Settings }} />
    </aside>
  )
}
