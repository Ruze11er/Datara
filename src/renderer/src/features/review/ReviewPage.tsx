import { Link } from 'react-router'
import { CalendarClock, CircleCheck, CodeXml, Database, RotateCcw } from 'lucide-react'
import { Card, Page } from '../../components/Page'
import { useProgress } from '../../lib/ProgressContext'
import { REVIEW_INTERVALS, daysBetween, localDate, reviewHref, reviewQueue, type ReviewItem } from '../../lib/reviewQueue'

function LabIcon({ item }: { item: ReviewItem }) {
  const Icon = item.lab.id === 'sql' ? Database : CodeXml
  return <Icon size={16} className="shrink-0 text-brand-600" aria-hidden />
}

function when(due: string, today: string): string {
  const days = daysBetween(today, due)
  if (days < 0) return days === -1 ? 'Due since yesterday' : `Due for ${-days} days`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Tomorrow'
  return `In ${days} days`
}

function ItemRow({ item, today, action }: { item: ReviewItem; today: string; action: boolean }) {
  const { lab, level, state, reason } = item
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <LabIcon item={item} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-800">
          {lab.name} level {level.number}: {level.title}
        </div>
        <div className="text-xs text-slate-500">{reason}</div>
      </div>
      <span className="shrink-0 text-xs text-slate-500">{state.done ? 'Mastered' : when(state.due, today)}</span>
      {action && (
        <Link
          to={reviewHref(lab, level)}
          className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Review
        </Link>
      )}
    </li>
  )
}

export default function ReviewPage() {
  const { progress } = useProgress()
  const today = localDate()
  const queue = reviewQueue(progress, today)
  const nothingYet = queue.due.length + queue.upcoming.length + queue.mastered.length === 0

  return (
    <Page
      title="Review"
      subtitle="Levels you found hard come back after a few days, so the skills stick."
    >
      <Card className="mb-6 text-sm leading-relaxed text-slate-600">
        A level joins your review queue when you solve it with hints or the solution, or after several tries. Its first
        review is the next day. Each review you solve <b>without help</b> sets the next one further out{' '}
        {`(${REVIEW_INTERVALS.join(' → ')} days)`}, and after the {REVIEW_INTERVALS[REVIEW_INTERVALS.length - 1]}-day
        review the level is <b>mastered</b>. If you need help during a review, it comes back tomorrow. Spreading practice out like
        this helps you remember for longer than repeating everything at once.
      </Card>

      {nothingYet ? (
        <Card className="text-center text-slate-500">
          <RotateCcw size={28} className="mx-auto text-slate-300" aria-hidden />
          <p className="mt-2">Nothing to review yet. Levels you find hard will show up here.</p>
        </Card>
      ) : (
        <>
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
            <RotateCcw size={16} className="text-brand-600" aria-hidden /> Due now ({queue.due.length})
          </h2>
          <Card flush>
            {queue.due.length === 0 ? (
              <p className="px-5 py-4 text-sm text-slate-500">All caught up! Come back when the next review is due.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {queue.due.map((item) => (
                  <ItemRow key={`${item.lab.id}-${item.level.id}`} item={item} today={today} action />
                ))}
              </ul>
            )}
          </Card>

          {queue.upcoming.length > 0 && (
            <>
              <h2 className="mt-8 mb-3 flex items-center gap-2 font-semibold text-slate-900">
                <CalendarClock size={16} className="text-slate-500" aria-hidden /> Coming up ({queue.upcoming.length})
              </h2>
              <Card flush>
                <ul className="divide-y divide-slate-100">
                  {queue.upcoming.map((item) => (
                    <ItemRow key={`${item.lab.id}-${item.level.id}`} item={item} today={today} action={false} />
                  ))}
                </ul>
              </Card>
            </>
          )}

          {queue.mastered.length > 0 && (
            <>
              <h2 className="mt-8 mb-3 flex items-center gap-2 font-semibold text-slate-900">
                <CircleCheck size={16} className="text-brand-600" aria-hidden /> Mastered ({queue.mastered.length})
              </h2>
              <Card flush>
                <ul className="divide-y divide-slate-100">
                  {queue.mastered.map((item) => (
                    <ItemRow key={`${item.lab.id}-${item.level.id}`} item={item} today={today} action={false} />
                  ))}
                </ul>
              </Card>
            </>
          )}
        </>
      )}
    </Page>
  )
}
