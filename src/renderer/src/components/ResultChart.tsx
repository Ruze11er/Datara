// A quick chart of a query or DataFrame result: one series, picked automatically.
//
// Follows the dataviz guidance: one hue for a single series (no legend; the title names it), thin
// marks (bars <= 24px with a 4px rounded end, square at the zero baseline; 2px lines), solid hairline
// gridlines, values in text colours, a hover tooltip, and the table view as the accessible twin.
// A single row isn't charted (a one-bar chart says less than the number itself).

import { useMemo, useState, type PointerEvent } from 'react'
import type { SqlValue } from '@shared/sqlCheck'

const MAX_BARS = 25
const MAX_POINTS = 120
/** Bar charts label every bar tip only when there are few bars; otherwise the axis and tooltip carry values. */
const LABEL_ALL_BARS = 12
const DATE_LABEL = /^\d{4}-\d{2}(-\d{2})?$/

export interface ChartPlan {
  kind: 'bar' | 'line'
  labelIndex: number
  valueIndexes: number[]
}

/** IDs and pandas' unnamed row-number index are numbers, but not amounts worth plotting. */
const isIdColumn = (name: string) => name === '' || /(^|_)id$/i.test(name)

const isNumberColumn = (rows: SqlValue[][], c: number) =>
  rows.some((r) => typeof r[c] === 'number') && rows.every((r) => r[c] === null || typeof r[c] === 'number')

/** Decides whether (and how) a result can be charted. Returns a reason when it can't. */
export function planChart(columns: string[], rows: SqlValue[][]): ChartPlan | { reason: string } {
  if (rows.length < 2) return { reason: 'A chart needs at least two rows. With one row, the number itself says it best.' }
  const numeric = columns.map((_, c) => isNumberColumn(rows, c))
  let labelIndex = numeric.findIndex((n) => !n)
  if (labelIndex === -1) {
    // All numbers: use the first column as the labels (often an ID or a year) if there's another to plot.
    if (columns.length < 2) return { reason: 'A chart needs a column of labels and a column of numbers.' }
    labelIndex = 0
  }
  const numbers = numeric.map((n, c) => (n && c !== labelIndex ? c : -1)).filter((c) => c >= 0)
  // Only offered when there's nothing else to plot.
  const amounts = numbers.filter((c) => !isIdColumn(columns[c]!))
  const valueIndexes = amounts.length > 0 ? amounts : numbers
  if (valueIndexes.length === 0) return { reason: 'There are no number columns to chart. Charts need at least one.' }
  const labels = rows.map((r) => String(r[labelIndex] ?? ''))
  const kind = labels.every((l) => DATE_LABEL.test(l)) ? 'line' : 'bar'
  return { kind, labelIndex, valueIndexes }
}

// ---------------------------------------------------------------- number formatting

function niceStep(range: number, target = 4): number {
  const raw = range / target
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const residual = raw / magnitude
  const nice = residual >= 5 ? 10 : residual >= 2 ? 5 : residual >= 1 ? 2 : 1
  return nice * magnitude
}

/** Clean axis ticks covering [min, max], always including 0. */
function ticks(min: number, max: number): number[] {
  const lo = Math.min(0, min)
  const hi = Math.max(0, max)
  if (lo === hi) return [0, 1]
  const step = niceStep(hi - lo)
  const out: number[] = []
  for (let v = Math.floor(lo / step) * step; v <= hi + step * 0.999; v += step) out.push(Number(v.toPrecision(12)))
  return out
}

const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 })
const full = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 })
const tickLabel = (v: number) => (Math.abs(v) >= 1000 ? compact.format(v) : full.format(v))

// ---------------------------------------------------------------- component

interface Point {
  label: string
  value: number
}

export function ResultChart({ columns, rows, plan }: { columns: string[]; rows: SqlValue[][]; plan: ChartPlan }) {
  const [valueIndex, setValueIndex] = useState(plan.valueIndexes[0]!)
  const all = useMemo(
    () =>
      rows
        .map((r) => ({ label: String(r[plan.labelIndex] ?? '(empty)'), value: r[valueIndex] }))
        .filter((p): p is Point => typeof p.value === 'number'),
    [rows, plan.labelIndex, valueIndex]
  )
  const limit = plan.kind === 'bar' ? MAX_BARS : MAX_POINTS
  // Time series read left to right in date order; bars keep the result's order (its ORDER BY).
  const points = (plan.kind === 'line' ? [...all].sort((a, b) => (a.label < b.label ? -1 : 1)) : all).slice(0, limit)
  const skipped = rows.length - all.length

  return (
    <figure className="p-4">
      <figcaption className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-semibold text-slate-800">
          {columns[valueIndex]} by {columns[plan.labelIndex] || 'index'}
        </span>
        {plan.valueIndexes.length > 1 && (
          <label className="flex items-center gap-1.5 text-slate-500">
            Show
            <select
              value={valueIndex}
              onChange={(e) => setValueIndex(Number(e.target.value))}
              className="rounded-md border border-slate-200 bg-surface px-1.5 py-0.5 text-slate-700"
            >
              {plan.valueIndexes.map((c) => (
                <option key={c} value={c}>
                  {columns[c]}
                </option>
              ))}
            </select>
          </label>
        )}
        <span className="text-xs text-slate-400">
          {all.length > limit && `First ${limit} of ${all.length} rows. `}
          {skipped > 0 && `${skipped} empty value${skipped === 1 ? '' : 's'} left out.`}
        </span>
      </figcaption>
      {plan.kind === 'bar' ? <BarChart points={points} /> : <LineChart points={points} />}
    </figure>
  )
}

// ---------------------------------------------------------------- bars

function BarChart({ points }: { points: Point[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const values = points.map((p) => p.value)
  const scale = ticks(Math.min(...values), Math.max(...values))
  const lo = scale[0]!
  const hi = scale[scale.length - 1]!
  const pct = (v: number) => ((v - lo) / (hi - lo)) * 100
  const zero = pct(0)
  const labelAll = points.length <= LABEL_ALL_BARS

  return (
    <div className="grid grid-cols-[minmax(80px,max-content)_1fr] gap-x-3 text-xs" role="img" aria-label="Bar chart. The table view lists every value.">
      {points.map((p, i) => {
        const start = Math.min(zero, pct(p.value))
        const width = Math.abs(pct(p.value) - zero)
        const negative = p.value < 0
        return (
          <div key={i} className="contents" onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
            <div className={`flex h-6 items-center justify-end truncate ${hover === i ? 'text-slate-900' : 'text-slate-600'}`} title={p.label}>
              {p.label}
            </div>
            <div className="relative h-6">
              {/* Gridlines: solid hairlines, recessive. */}
              {scale.map((t) => (
                <span key={t} className="absolute inset-y-0 w-px bg-slate-200" style={{ left: `${pct(t)}%` }} />
              ))}
              <span
                className="absolute top-[5px] h-3.5"
                style={{
                  left: `${start}%`,
                  width: `max(${width}%, 1px)`,
                  backgroundColor: 'var(--chart-mark)',
                  opacity: hover === null || hover === i ? 1 : 0.55,
                  // 4px rounded at the data end, square at the zero baseline.
                  borderRadius: negative ? '4px 0 0 4px' : '0 4px 4px 0'
                }}
              />
              {(labelAll || hover === i) && (
                <span
                  className={`absolute top-1/2 -translate-y-1/2 px-1 whitespace-nowrap tabular-nums ${hover === i ? 'font-semibold text-slate-900' : 'text-slate-600'}`}
                  style={negative ? { right: `${100 - start}%` } : { left: `${start + width}%` }}
                >
                  {full.format(p.value)}
                </span>
              )}
            </div>
          </div>
        )
      })}
      <div />
      <div className="relative mt-1 h-4 text-[11px] text-slate-500 tabular-nums">
        {scale.map((t) => (
          <span key={t} className="absolute -translate-x-1/2" style={{ left: `${pct(t)}%` }}>
            {tickLabel(t)}
          </span>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- line

const W = 640
const H = 220
const PAD = { top: 12, right: 16, bottom: 26, left: 48 }

function LineChart({ points }: { points: Point[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const values = points.map((p) => p.value)
  const scale = ticks(Math.min(...values), Math.max(...values))
  const lo = scale[0]!
  const hi = scale[scale.length - 1]!
  const x = (i: number) => PAD.left + (points.length === 1 ? 0 : (i / (points.length - 1)) * (W - PAD.left - PAD.right))
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom)
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const area = `${line} L${x(points.length - 1).toFixed(1)},${y(Math.max(lo, 0))} L${x(0).toFixed(1)},${y(Math.max(lo, 0))} Z`
  const xLabels = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])]
  const last = points.length - 1

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - box.left) / box.width) * W
    const i = Math.round(((px - PAD.left) / (W - PAD.left - PAD.right)) * last)
    setHover(Math.max(0, Math.min(last, i)))
  }
  const h = hover === null ? null : points[hover]!

  return (
    <div className="relative max-w-3xl">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Line chart. The table view lists every value."
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {scale.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-slate-200)" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--color-slate-500)">
              {tickLabel(t)}
            </text>
          </g>
        ))}
        {xLabels.map((i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === last ? 'end' : 'middle'} fontSize={11} fill="var(--color-slate-500)">
            {points[i]!.label}
          </text>
        ))}
        <path d={area} fill="var(--chart-mark)" opacity={0.1} />
        <path d={line} fill="none" stroke="var(--chart-mark)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {/* End-dot with a surface ring, and its value as the one direct label. */}
        <circle cx={x(last)} cy={y(points[last]!.value)} r={4} fill="var(--chart-mark)" stroke="var(--color-surface)" strokeWidth={2} />
        {h && hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--color-slate-400)" strokeWidth={1} />
            <circle cx={x(hover)} cy={y(h.value)} r={4.5} fill="var(--chart-mark)" stroke="var(--color-surface)" strokeWidth={2} />
          </g>
        )}
      </svg>
      {h && hover !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-md border border-slate-200 bg-surface px-2.5 py-1.5 text-xs whitespace-nowrap shadow-md"
          style={{ left: `${(x(hover) / W) * 100}%` }}
        >
          <div className="font-semibold text-slate-900 tabular-nums">{full.format(h.value)}</div>
          <div className="text-slate-500">{h.label}</div>
        </div>
      )}
      {!h && (
        <div className="mt-1 text-xs text-slate-500">
          Latest ({points[last]!.label}): <span className="font-semibold text-slate-700 tabular-nums">{full.format(points[last]!.value)}</span>
        </div>
      )}
    </div>
  )
}
