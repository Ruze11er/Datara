// Decides whether a query result cracks an Academy lead. Results are compared, never query text, using the
// same checker as the SQL Lab (src/shared/sqlCheck.ts) with two leniencies that suit an investigation:
// rounding doesn't matter, and extra columns are fine as long as the lead's columns are all there.
// Used by the app and by scripts/verify-content.ts.

import { checkHiddenResult, checkResult, type CheckOptions, type CheckOutcome, type QueryResult } from '../sqlCheck.ts'
import type { Lead } from './types'

/** Reference results for one lead on one dataset, in the same order as lead.sql.solutions / misconceptions. */
export interface LeadReference {
  solutions: (QueryResult | null)[]
  misconceptions: (QueryResult | null)[]
}

export type LeadMatch =
  /** Cracked on this dataset (index into lead.sql.solutions). */
  | { kind: 'match'; solution: number }
  /** Matches a known wrong approach. */
  | { kind: 'misconception'; index: number; feedback: string }
  | { kind: 'miss'; outcome: CheckOutcome }

export const leadCheckOptions = (lead: Lead): CheckOptions => ({
  orderMatters: lead.sql.orderMatters,
  checkColumnNames: false,
  roundingTolerant: true
})

const MAX_COMBINATIONS = 200

/**
 * Like checkResult, but the learner's result may have extra columns: each answer column is looked for among the
 * learner's columns (same values, any order), and the best combination is checked as a whole.
 */
export function compareResult(expected: QueryResult, actual: QueryResult, options: CheckOptions): CheckOutcome {
  const direct = checkResult(expected, actual, options)
  if (direct.pass || actual.columns.length <= expected.columns.length || actual.rows.length !== expected.rows.length) return direct

  const columnOptions = { orderMatters: false, checkColumnNames: false, roundingTolerant: options.roundingTolerant }
  const column = (r: QueryResult, i: number): QueryResult => ({ columns: [r.columns[i] ?? ''], rows: r.rows.map((row) => [row[i] ?? null]) })
  const candidates = expected.columns.map((name, e) => {
    const matching = actual.columns
      .map((_, a) => a)
      .filter((a) => checkResult(column(expected, e), column(actual, a), columnOptions).pass)
    // Try a column with the same name first.
    return matching.sort((x, y) => Number(actual.columns[y]?.toLowerCase() === name.toLowerCase()) - Number(actual.columns[x]?.toLowerCase() === name.toLowerCase()))
  })
  if (candidates.some((c) => c.length === 0)) return direct

  let tried = 0
  const chosen: number[] = []
  const search = (e: number): CheckOutcome | null => {
    if (e === expected.columns.length) {
      if (++tried > MAX_COMBINATIONS) return null
      const projected: QueryResult = { columns: [...expected.columns], rows: actual.rows.map((row) => chosen.map((a) => row[a] ?? null)) }
      const outcome = checkResult(expected, projected, options)
      return outcome.pass ? outcome : null
    }
    for (const a of candidates[e] ?? []) {
      if (chosen.includes(a)) continue
      chosen.push(a)
      const found = search(e + 1)
      chosen.pop()
      if (found || tried > MAX_COMBINATIONS) return found
    }
    return null
  }
  return search(0) ?? direct
}

/** Step 1 (practice data): does this result crack the lead, match a known mistake, or neither? */
export function matchLead(lead: Lead, reference: LeadReference, actual: QueryResult): LeadMatch {
  const options = leadCheckOptions(lead)
  for (const [i, expected] of reference.solutions.entries()) {
    if (expected && compareResult(expected, actual, options).pass) return { kind: 'match', solution: i }
  }
  for (const [i, expected] of reference.misconceptions.entries()) {
    if (expected && compareResult(expected, actual, options).pass) {
      return { kind: 'misconception', index: i, feedback: lead.sql.misconceptions[i]?.feedback ?? '' }
    }
  }
  const main = reference.solutions.find((r): r is QueryResult => r !== null)
  return {
    kind: 'miss',
    outcome: main
      ? compareResult(main, actual, options)
      : { pass: false, title: 'Not quite', message: "This lead's answer could not be calculated." }
  }
}

/**
 * Step 2 (hidden data): the learner's query must also give a correct result on the case's hidden dataset, so a
 * typed-in number fails. `hiddenActual` is null when the query fails to run there.
 */
export function confirmOnHidden(lead: Lead, hidden: LeadReference, hiddenActual: QueryResult | null): CheckOutcome {
  const options = leadCheckOptions(lead)
  const expected = hidden.solutions.filter((r): r is QueryResult => r !== null)
  if (expected.length === 0 || !lead.sql.hiddenData) return { pass: true, title: 'Lead cracked!', message: '' }
  if (hiddenActual) {
    for (const answer of expected) {
      const outcome = compareResult(answer, hiddenActual, options)
      if (outcome.pass) return outcome
    }
  }
  return checkHiddenResult(expected[0]!, null, options)
}
