// Runs Investigation Lab code (SQL or Python) and decides which leads it cracks. The comparison itself is shared
// with scripts/verify-cases.ts (src/shared/cases/leadMatch.ts), so the app and the tests never disagree.

import { confirmOnHidden, matchLead, type LeadReference } from '@shared/cases/leadMatch'
import { caseSetup, pyTableResult } from '@shared/cases/python'
import type { CaseDef, Lead } from '@shared/cases/types'
import type { CheckOutcome, QueryResult } from '@shared/sqlCheck'
import type { CaseDatasets } from '../../content'
import { runCasePython } from '../../engines/python/pythonEngine'
import type { PyLabRun } from '../../engines/python/types'
import { runSql } from '../../engines/sql/sqlEngine'
import type { SqlDataset } from '../../engines/sql/types'
import { datasetCsvFiles } from '../../lib/shopFiles'

const references = new Map<string, Promise<LeadReference>>()

async function tryRun(dataset: SqlDataset, sql: string): Promise<QueryResult | null> {
  try {
    const r = await runSql({ sql, dataset })
    return { columns: r.columns, rows: r.rows }
  } catch {
    return null
  }
}

/** A lead's answers (solutions and misconceptions) on one dataset, calculated once per session. */
function leadReference(c: CaseDef, lead: Lead, dataset: SqlDataset): Promise<LeadReference> {
  const key = `${c.id}:${c.version}:${lead.id}:${dataset.id}`
  let ref = references.get(key)
  if (!ref) {
    ref = (async () => ({
      solutions: await Promise.all(lead.sql.solutions.map((s) => tryRun(dataset, s.query))),
      misconceptions: await Promise.all(lead.sql.misconceptions.map((m) => tryRun(dataset, m.query)))
    }))()
    references.set(key, ref)
  }
  return ref
}

/** Calculates the answers for these leads in the background, so the first Run doesn't wait for them. */
export function prefetchLeads(c: CaseDef, datasets: CaseDatasets, leads: Lead[]): void {
  void (async () => {
    for (const lead of leads) await leadReference(c, lead, datasets.practice)
  })()
}

/** One Run's results, ready to compare with the leads. */
export interface Attempt {
  /** The SQL result, or each table (DataFrame or Series) the Python code made, in the order they were made. */
  results: { name: string; result: QueryResult }[]
  /** Runs the same code on the hidden data and returns its results by name (null if that fails). */
  onHidden: () => Promise<Map<string, QueryResult> | null>
}

export function sqlAttempt(datasets: CaseDatasets, sql: string, result: QueryResult): Attempt {
  return {
    results: [{ name: 'result', result }],
    onHidden: async () => {
      const hidden = await tryRun(datasets.hidden, sql)
      return hidden ? new Map([['result', hidden]]) : null
    }
  }
}

/** Python: the case tables are given as DataFrames; returns the run (for display) and its attempt. */
export async function runPythonAttempt(c: CaseDef, datasets: CaseDatasets, code: string): Promise<{ run: PyLabRun; attempt: Attempt }> {
  const tables = c.tables.map((t) => t.name)
  const setup = caseSetup(tables, code)
  const tablesOf = (run: PyLabRun) =>
    run.variables
      .filter((v) => !v.given && v.table)
      .flatMap((v) => {
        const result = pyTableResult(v.table!)
        return result ? [{ name: v.name, result }] : []
      })
  const run = await runCasePython(setup, code, await datasetCsvFiles(datasets.practice, tables))
  return {
    run,
    attempt: {
      results: run.error ? [] : tablesOf(run),
      onHidden: async () => {
        try {
          const hidden = await runCasePython(setup, code, await datasetCsvFiles(datasets.hidden, tables))
          return hidden.error ? null : new Map(tablesOf(hidden).map((t) => [t.name, t.result]))
        } catch {
          return null
        }
      }
    }
  }
}

export type LeadVerdict =
  /** Cracked: right on the practice data and on the hidden data. `result` is the matching table. */
  | { kind: 'cracked'; lead: Lead; solution: number; result: QueryResult }
  /** Right on the practice data only: probably a typed-in value. */
  | { kind: 'almost'; lead: Lead; message: string }
  /** Only reported for the lead the learner checked against. */
  | { kind: 'misconception'; lead: Lead; feedback: string }
  | { kind: 'miss'; lead: Lead; outcome: CheckOutcome }

/**
 * Compares an attempt with every lead in `leads`. Matches are confirmed on the hidden data. Misses are only
 * reported for `checked`, the lead the learner pressed Check for.
 */
export async function compareWithLeads(
  c: CaseDef,
  datasets: CaseDatasets,
  attempt: Attempt,
  leads: Lead[],
  checked?: Lead
): Promise<LeadVerdict[]> {
  const verdicts: LeadVerdict[] = []
  let hidden: Promise<Map<string, QueryResult> | null> | null = null
  const all = checked && !leads.includes(checked) ? [...leads, checked] : leads
  for (const lead of all) {
    const ref = await leadReference(c, lead, datasets.practice)
    let found: { name: string; result: QueryResult; solution: number } | null = null
    for (const r of attempt.results) {
      const m = matchLead(lead, ref, r.result)
      if (m.kind === 'match') {
        found = { ...r, solution: m.solution }
        break
      }
    }
    if (found) {
      hidden ??= attempt.onHidden()
      const outcome = confirmOnHidden(lead, await leadReference(c, lead, datasets.hidden), (await hidden)?.get(found.name) ?? null)
      verdicts.push(
        outcome.pass
          ? { kind: 'cracked', lead, solution: found.solution, result: found.result }
          : { kind: 'almost', lead, message: outcome.message }
      )
      continue
    }
    if (lead !== checked) continue
    // Feedback for the checked lead: a known mistake in any of the tables, else what's wrong with the latest one.
    const mistake = attempt.results.map((r) => matchLead(lead, ref, r.result)).find((m) => m.kind === 'misconception')
    const latest = attempt.results.at(-1)
    if (mistake?.kind === 'misconception') verdicts.push({ kind: 'misconception', lead, feedback: mistake.feedback })
    else if (latest) {
      const m = matchLead(lead, ref, latest.result)
      if (m.kind === 'miss') verdicts.push({ kind: 'miss', lead, outcome: m.outcome })
    } else {
      verdicts.push({
        kind: 'miss',
        lead,
        outcome: { pass: false, title: 'Not quite', message: 'Your code made no table to check. Put your answer in a DataFrame, for example `answer = ...`.' }
      })
    }
  }
  return verdicts
}
