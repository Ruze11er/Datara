// Runs Investigation Lab queries and decides which leads they crack. The comparison itself is shared with
// scripts/verify-cases.ts (src/shared/cases/leadMatch.ts), so the app and the tests never disagree.

import { confirmOnHidden, matchLead, type LeadReference } from '@shared/cases/leadMatch'
import type { CaseDef, Lead } from '@shared/cases/types'
import type { CheckOutcome, QueryResult } from '@shared/sqlCheck'
import type { CaseDatasets } from '../../content'
import { runSql } from '../../engines/sql/sqlEngine'
import type { SqlDataset } from '../../engines/sql/types'

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

export type LeadVerdict =
  /** Cracked: right on the practice data and on the hidden data. */
  | { kind: 'cracked'; lead: Lead; solution: number }
  /** Right on the practice data only: probably a typed-in value. */
  | { kind: 'almost'; lead: Lead; message: string }
  /** Only reported for the lead the learner checked against. */
  | { kind: 'misconception'; lead: Lead; feedback: string }
  | { kind: 'miss'; lead: Lead; outcome: CheckOutcome }

/**
 * Compares the learner's result (already run on the practice data) with every lead in `leads`. Matches are
 * confirmed on the hidden data. Misses are only reported for `checked`, the lead the learner pressed Check for.
 */
export async function compareWithLeads(
  c: CaseDef,
  datasets: CaseDatasets,
  sql: string,
  result: QueryResult,
  leads: Lead[],
  checked?: Lead
): Promise<LeadVerdict[]> {
  const verdicts: LeadVerdict[] = []
  let hiddenResult: Promise<QueryResult | null> | null = null
  const all = checked && !leads.includes(checked) ? [...leads, checked] : leads
  for (const lead of all) {
    const match = matchLead(lead, await leadReference(c, lead, datasets.practice), result)
    if (match.kind === 'match') {
      hiddenResult ??= tryRun(datasets.hidden, sql)
      const outcome = confirmOnHidden(lead, await leadReference(c, lead, datasets.hidden), await hiddenResult)
      verdicts.push(outcome.pass ? { kind: 'cracked', lead, solution: match.solution } : { kind: 'almost', lead, message: outcome.message })
    } else if (lead === checked) {
      verdicts.push(match.kind === 'misconception' ? { kind: 'misconception', lead, feedback: match.feedback } : { kind: 'miss', lead, outcome: match.outcome })
    }
  }
  return verdicts
}
