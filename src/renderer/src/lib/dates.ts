// Calendar-day helpers. Days are local-time YYYY-MM-DD strings (the learner's calendar, not UTC).

export function localDate(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** A YYYY-MM-DD day as a local Date at midnight. */
export function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

export function addDays(day: string, days: number): string {
  const date = parseDay(day)
  date.setDate(date.getDate() + days)
  return localDate(date)
}

/** Whole days from one day to another (negative if `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  const utc = (day: string) => {
    const [y, m, d] = day.split('-').map(Number)
    return Date.UTC(y!, m! - 1, d!)
  }
  return Math.round((utc(to) - utc(from)) / 86_400_000)
}

/** e.g. "Tue 28 Oct 2026" */
export function formatDay(day: string): string {
  return parseDay(day).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}
