import { useState } from 'react'
import { addDays, formatDay, localDate, parseDay } from '../../lib/dates'

const WEEKS = 20
const CELL = 16 // hover area per day; the painted square inside is smaller, leaving a gap
/** Upper bounds of the colour steps 1–4 (0 actions = empty). */
const BUCKETS = [2, 5, 9, Infinity]
const LEGEND = ['No practice', '1–2 actions', '3–5 actions', '6–9 actions', '10 or more actions']
const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', '']

const step = (count: number): number => (count <= 0 ? 0 : BUCKETS.findIndex((max) => count <= max) + 1)
const actions = (n: number) => `${n} action${n === 1 ? '' : 's'}`

interface Hover {
  day: string
  count: number
  x: number
  y: number
}

/**
 * A GitHub-style calendar of the last 20 weeks: one column per week (Monday at the top), one cell
 * per day, darker teal for more practice. Hover shows the day's count; the same data is available
 * as a table below for keyboard and screen-reader users.
 */
export function ActivityCalendar({ days, today = localDate() }: { days: Map<string, number>; today?: string }) {
  const [hover, setHover] = useState<Hover | null>(null)

  // The grid starts on the Monday WEEKS-1 weeks before this week's Monday.
  const weekday = (parseDay(today).getDay() + 6) % 7 // Monday = 0
  const start = addDays(today, -weekday - (WEEKS - 1) * 7)
  const weeks = Array.from({ length: WEEKS }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)))

  const months = weeks.map((week, w) => {
    const first = parseDay(week[0]!)
    const previous = w > 0 ? parseDay(weeks[w - 1]![0]!) : null
    return !previous || previous.getMonth() !== first.getMonth()
      ? first.toLocaleDateString(undefined, { month: 'short' })
      : ''
  })

  const inRange = weeks.flat().filter((day) => day <= today)
  const activeDays = inRange.filter((day) => (days.get(day) ?? 0) > 0)

  return (
    <div>
      <div className="relative w-fit" onPointerLeave={() => setHover(null)}>
        <div
          role="img"
          aria-label={`Practice calendar: ${activeDays.length} active days in the last ${WEEKS} weeks. A table version follows.`}
          className="grid w-fit"
          style={{ gridTemplateColumns: `32px repeat(${WEEKS}, ${CELL}px)`, gridTemplateRows: `18px repeat(7, ${CELL}px)` }}
        >
          <div />
          {months.map((label, w) => (
            <div key={`m${w}`} className="overflow-visible text-[11px] whitespace-nowrap text-slate-500">
              {label}
            </div>
          ))}
          {DAY_LABELS.map((label, d) => (
            <div key={`d${d}`} className="text-[11px] leading-4 text-slate-500" style={{ gridColumn: 1, gridRow: d + 2 }}>
              {label}
            </div>
          ))}
          {weeks.map((week, w) =>
            week.map((day, d) => {
              if (day > today) return null
              const count = days.get(day) ?? 0
              const active = hover?.day === day
              return (
                <div
                  key={day}
                  className="flex items-center justify-center"
                  style={{ gridColumn: w + 2, gridRow: d + 2 }}
                  onPointerEnter={(e) => {
                    const cell = e.currentTarget.getBoundingClientRect()
                    const box = e.currentTarget.closest('.relative')!.getBoundingClientRect()
                    setHover({ day, count, x: cell.left - box.left + CELL / 2, y: cell.top - box.top })
                  }}
                >
                  <span
                    className="block h-3 w-3 rounded-[3px]"
                    style={{
                      backgroundColor: `var(--heat-${step(count)})`,
                      outline: active ? '2px solid var(--color-slate-900)' : undefined,
                      outlineOffset: 1
                    }}
                  />
                </div>
              )
            })
          )}
        </div>

        {hover && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-slate-200 bg-surface px-2.5 py-1.5 text-xs whitespace-nowrap shadow-md"
            style={{ left: hover.x, top: hover.y - 6 }}
          >
            <div className="font-semibold text-slate-900">{hover.count === 0 ? 'No practice' : actions(hover.count)}</div>
            <div className="text-slate-500">{formatDay(hover.day)}</div>
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500" style={{ marginLeft: 32 }}>
        Less
        {LEGEND.map((label, i) => (
          <span key={label} title={label} className="block h-3 w-3 rounded-[3px]" style={{ backgroundColor: `var(--heat-${i})` }} />
        ))}
        More
        <span className="ml-3">An action is a Check you pressed or a quiz you finished.</span>
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-slate-500 hover:text-slate-800">Show as a table</summary>
        {activeDays.length === 0 ? (
          <p className="mt-2 text-slate-500">No practice in the last {WEEKS} weeks yet.</p>
        ) : (
          <table className="mt-2 text-left">
            <thead>
              <tr className="text-xs text-slate-500">
                <th className="py-1 pr-6 font-medium">Day</th>
                <th className="py-1 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...activeDays].reverse().map((day) => (
                <tr key={day} className="border-t border-slate-100">
                  <td className="py-1 pr-6 text-slate-700">{formatDay(day)}</td>
                  <td className="py-1 text-slate-700 tabular-nums">{days.get(day)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </details>
    </div>
  )
}
