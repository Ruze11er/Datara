// Compares a learner's query result with the reference answer and explains
// any difference in plain language. Used by the SQL Lab and by
// scripts/verify-content.ts, so this file must not import anything.
//
// Results are compared, not query text, so any correct query passes.

export type SqlValue = string | number | null

export interface QueryResult {
  columns: string[]
  rows: SqlValue[][]
}

export interface CheckOptions {
  /** Row order must match (the task asks for sorting). */
  orderMatters: boolean
  /** Column names must match (the task asks for specific names/aliases). */
  checkColumnNames: boolean
}

export interface CheckOutcome {
  pass: boolean
  /** Short headline, e.g. "Correct!" or "Not quite". */
  title: string
  /** What is different, in plain language. */
  message: string
}

/** Numbers this close are treated as equal (floating-point noise). */
const EXACT = 1e-6
/** Numbers this close suggest a rounding difference. */
const NEAR = 0.0051

const PLAIN_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/

function valuesEqual(a: SqlValue, b: SqlValue, tolerance: number): boolean {
  if (typeof a === 'number' && typeof b === 'number') {
    // EXACT is relative (scales with the size of the numbers); NEAR is absolute.
    const allowed = tolerance === EXACT ? EXACT * Math.max(1, Math.abs(a), Math.abs(b)) : tolerance
    return Math.abs(a - b) <= allowed
  }
  return a === b
}

function rowsEqual(a: SqlValue[], b: SqlValue[], tolerance: number): boolean {
  return a.length === b.length && a.every((v, i) => valuesEqual(v, b[i] ?? null, tolerance))
}

function rowKey(row: SqlValue[], decimals: number): string {
  return JSON.stringify(row.map((v) => (typeof v === 'number' ? Number(v.toFixed(decimals)) : v)))
}

function sortRows(rows: SqlValue[][], decimals: number): SqlValue[][] {
  return [...rows]
    .map((r) => ({ r, k: rowKey(r, decimals) }))
    .sort((x, y) => (x.k < y.k ? -1 : x.k > y.k ? 1 : 0))
    .map((x) => x.r)
}

function sameRowsAnyOrder(expected: SqlValue[][], actual: SqlValue[][], tolerance: number, decimals: number): boolean {
  const e = sortRows(expected, decimals)
  const a = sortRows(actual, decimals)
  return e.length === a.length && e.every((row, i) => rowsEqual(row, a[i] ?? [], tolerance))
}

/**
 * Lines up the learner's columns with the answer's. Matching names win
 * (so `SELECT price, product_name` passes); otherwise columns are compared in order.
 */
function alignColumns(expected: string[], actual: string[]): number[] {
  const lower = actual.map((c) => c.toLowerCase())
  const byName = expected.map((c) => lower.indexOf(c.toLowerCase()))
  const unique = new Set(byName)
  if (byName.every((i) => i >= 0) && unique.size === byName.length) return byName
  return expected.map((_, i) => i)
}

function describeColumns(columns: string[]): string {
  const named = columns.filter((c) => PLAIN_NAME.test(c))
  if (named.length === columns.length) return columns.join(', ')
  return ''
}

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`

export function checkResult(expected: QueryResult, actual: QueryResult, options: CheckOptions): CheckOutcome {
  const fail = (message: string, title = 'Not quite'): CheckOutcome => ({ pass: false, title, message })

  if (actual.columns.length === 0) {
    return fail('Your query ran, but it did not return a table of results. Make sure it ends with a SELECT statement.')
  }

  // 1. Same number of columns?
  if (actual.columns.length !== expected.columns.length) {
    const names = describeColumns(expected.columns)
    return fail(
      `Your result has ${plural(actual.columns.length, 'column')}, but the answer has ${expected.columns.length}.` +
        (names ? ` The answer's columns are: ${names}.` : ' Re-read the task to see which columns it asks for.')
    )
  }

  const mapping = alignColumns(expected.columns, actual.columns)
  const actualRows = actual.rows.map((row) => mapping.map((i) => row[i] ?? null))

  // 2. Same number of rows?
  if (actualRows.length !== expected.rows.length) {
    const got = actualRows.length
    const want = expected.rows.length
    let tip: string
    if (got === 0) {
      tip =
        'Your query returned no rows. Check your WHERE condition: text values need single quotes and must match exactly, including capital letters.'
    } else if (got > want) {
      tip = `Your query returned ${plural(got, 'row')}, but the answer has ${want}. You may need a filter (WHERE), DISTINCT, or LIMIT.`
    } else {
      tip = `Your query returned ${plural(got, 'row')}, but the answer has ${want}. Your filter may be too strict. Check each condition and the exact spelling of text values.`
    }
    return fail(tip)
  }

  // 3. Same values?
  let valuesMatch: boolean
  if (options.orderMatters) {
    valuesMatch = expected.rows.every((row, i) => rowsEqual(row, actualRows[i] ?? [], EXACT))
    if (!valuesMatch && sameRowsAnyOrder(expected.rows, actualRows, EXACT, 6)) {
      return fail('You have exactly the right rows, but in the wrong order. Check your ORDER BY (ASC or DESC?).', 'Almost!')
    }
  } else {
    valuesMatch = sameRowsAnyOrder(expected.rows, actualRows, EXACT, 6)
  }

  if (!valuesMatch) {
    if (sameRowsAnyOrder(expected.rows, actualRows, NEAR, 2)) {
      return fail('Your numbers are very close to the answer but not exact. Did the task ask you to round with ROUND(value, 2)?', 'Almost!')
    }
    const wrongColumns = expected.columns.filter((_, c) => {
      const e = sortRows(expected.rows.map((r) => [r[c] ?? null]), 6)
      const a = sortRows(actualRows.map((r) => [r[c] ?? null]), 6)
      return !e.every((v, i) => rowsEqual(v, a[i] ?? [], EXACT))
    })
    const names = describeColumns(wrongColumns)
    return fail(
      names
        ? `You have the right number of rows and columns, but some values in ${wrongColumns.length === 1 ? 'column' : 'columns'} ${names} don't match the answer.`
        : 'You have the right number of rows and columns, but some values don\'t match the answer. Check your conditions and calculations.'
    )
  }

  // 4. Column names (only when the task asks for specific names)
  if (options.checkColumnNames) {
    const wrongNames = expected.columns.filter(
      (name, i) => (actual.columns[mapping[i] ?? i] ?? '').toLowerCase() !== name.toLowerCase()
    )
    if (wrongNames.length > 0) {
      return fail(
        `The data is right! Now give the columns the names the task asks for: ${expected.columns.join(', ')}. Use AS to rename a column.`,
        'Almost!'
      )
    }
  }

  return { pass: true, title: 'Correct!', message: 'Your query returns exactly the right result.' }
}

/** Turns SQLite error messages into beginner-friendly explanations. */
export function friendlySqlError(raw: string): string {
  const message = raw.replace(/^Error:\s*/, '')
  let m: RegExpMatchArray | null

  if ((m = message.match(/no such table: (\S+)/))) {
    return `There is no table called "${m[1]}". Check the table list for the exact name.`
  }
  if ((m = message.match(/no such column: (\S+)/))) {
    return (
      `There is no column called "${m[1]}". Check the spelling in the table list. ` +
      `If "${m[1]}" is a text value, put it in single quotes, like '${m[1]}'.`
    )
  }
  if ((m = message.match(/near "(.+?)": syntax error/))) {
    return `SQL couldn't understand the query near "${m[1]}". Look for a missing comma, quote, or keyword just before it.`
  }
  if (/incomplete input/.test(message)) {
    return 'The query looks unfinished. Check for a missing closing quote or bracket.'
  }
  if (/misuse of aggregate/.test(message)) {
    return 'Aggregate functions like COUNT, SUM, or AVG cannot be used in WHERE. (You will meet HAVING for this later.)'
  }
  if (/ambiguous column name: (\S+)/.test(message)) {
    return 'That column name exists in more than one table. Put the table name in front, like orders.customer_id.'
  }
  if (/no tables specified/.test(message)) {
    return 'SELECT * needs a table. Add FROM followed by a table name.'
  }
  return message
}
