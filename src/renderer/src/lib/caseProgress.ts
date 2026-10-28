// Progress rules for Data Detective Academy cases: starting a case, which leads and documents are open,
// cracking a lead, and cleaning up saved data on load. Pure functions over ProgressData, like labProgress.ts.

import type { CaseDef, CaseDocument, Evidence, Lead } from '@shared/cases/types'
import type {
  CaseLeadProgress,
  CaseMode,
  CaseProgress,
  EvidenceSnapshot,
  ProgressData
} from '@shared/progress'
import type { SqlValue } from '@shared/sqlCheck'

/** Rows kept with an evidence card. */
export const SNAPSHOT_ROWS = 50

export const caseProgress = (p: ProgressData | null, caseId: string): CaseProgress | undefined => p?.cases[caseId]

export function emptyLeadProgress(): CaseLeadProgress {
  return { attempts: 0, hintsUsed: 0, solutionViewed: false }
}

export const leadProgress = (cp: CaseProgress | undefined, leadId: string): CaseLeadProgress => ({
  ...emptyLeadProgress(),
  ...cp?.leads[leadId]
})

export const isCracked = (cp: CaseProgress | undefined, leadId: string): boolean => !!cp?.leads[leadId]?.cracked

/** Returns progress with one case's record changed (the case must have been started). */
export function withCase(p: ProgressData, caseId: string, change: (current: CaseProgress) => Partial<CaseProgress>): ProgressData {
  const current = p.cases[caseId]
  if (!current) return p
  return { ...p, cases: { ...p.cases, [caseId]: { ...current, ...change(current) } } }
}

export function withLead(
  p: ProgressData,
  caseId: string,
  leadId: string,
  change: (current: CaseLeadProgress) => Partial<CaseLeadProgress>
): ProgressData {
  return withCase(p, caseId, (cp) => {
    const current = leadProgress(cp, leadId)
    return { leads: { ...cp.leads, [leadId]: { ...current, ...change(current) } } }
  })
}

/** Starts (or restarts) a case: a fresh run in the chosen mode. */
export function startCase(p: ProgressData, c: CaseDef, mode: CaseMode): ProgressData {
  const run: CaseProgress = {
    caseVersion: c.version,
    mode,
    startedAt: new Date().toISOString(),
    leads: {},
    evidence: {},
    seen: []
  }
  return { ...p, cases: { ...p.cases, [c.id]: run } }
}

export function abandonCase(p: ProgressData, caseId: string): ProgressData {
  const cases = { ...p.cases }
  delete cases[caseId]
  return { ...p, cases }
}

/** A lead appears once everything it requires is cracked. Secret leads appear only once found. */
export function isLeadVisible(cp: CaseProgress | undefined, lead: Lead): boolean {
  if (lead.secret) return isCracked(cp, lead.id)
  return lead.requires.every((id) => isCracked(cp, id))
}

/** Leads shown in the Investigation Lab, in case order. */
export const visibleLeads = (c: CaseDef, cp: CaseProgress | undefined): Lead[] => c.leads.filter((l) => isLeadVisible(cp, l))

/** Leads a query result is compared with: every visible lead not cracked yet, plus undiscovered secret leads. */
export const leadsToMatch = (c: CaseDef, cp: CaseProgress | undefined): Lead[] =>
  c.leads.filter((l) => !isCracked(cp, l.id) && (l.secret || isLeadVisible(cp, l)))

/** Non-secret leads not visible yet (shown only as a count). */
export const hiddenLeadCount = (c: CaseDef, cp: CaseProgress | undefined): number =>
  c.leads.filter((l) => !l.secret && !isLeadVisible(cp, l)).length

export const isDocumentUnlocked = (cp: CaseProgress | undefined, d: CaseDocument): boolean =>
  !d.unlockedBy || isCracked(cp, d.unlockedBy)

/** Evidence the learner holds: every claim, plus the facts from cracked leads (in case order). */
export const heldEvidence = (c: CaseDef, cp: CaseProgress | undefined): Evidence[] =>
  c.evidence.filter((e) => e.kind === 'claim' || !!cp?.evidence[e.id])

export function caseStats(c: CaseDef, cp: CaseProgress | undefined) {
  const core = c.leads.filter((l) => l.core)
  const listed = c.leads.filter((l) => !l.secret)
  return {
    coreCracked: core.filter((l) => isCracked(cp, l.id)).length,
    coreTotal: core.length,
    cracked: listed.filter((l) => isCracked(cp, l.id)).length,
    total: listed.length,
    secretsFound: c.leads.filter((l) => l.secret && isCracked(cp, l.id)).length
  }
}

export function snapshotOf(result: { columns: string[]; rows: SqlValue[][] }): EvidenceSnapshot {
  return { columns: result.columns, rows: result.rows.slice(0, SNAPSHOT_ROWS), totalRows: result.rows.length }
}

/** What cracking a lead revealed, for the "lead cracked" banner. */
export interface CrackReveal {
  lead: Lead
  evidence: Evidence | undefined
  /** Index into lead.sql.solutions that matched. */
  solution: number
  newLeads: Lead[]
  newDocuments: CaseDocument[]
}

/** Returns progress with a lead cracked and its evidence filed, plus what that revealed. */
export function crackLead(
  p: ProgressData,
  c: CaseDef,
  lead: Lead,
  solution: number,
  result: { columns: string[]; rows: SqlValue[][] }
): { progress: ProgressData; reveal: CrackReveal } {
  const before = caseProgress(p, c.id)
  const now = new Date().toISOString()
  let next = withLead(p, c.id, lead.id, () => ({ cracked: now, solution }))
  next = withCase(next, c.id, (cp) => ({
    evidence: { ...cp.evidence, [lead.evidence]: { at: now, lead: lead.id, snapshot: snapshotOf(result) } }
  }))
  const after = caseProgress(next, c.id)
  return {
    progress: next,
    reveal: {
      lead,
      evidence: c.evidence.find((e) => e.id === lead.evidence),
      solution,
      newLeads: c.leads.filter((l) => !l.secret && !isLeadVisible(before, l) && isLeadVisible(after, l)),
      newDocuments: c.documents.filter((d) => !isDocumentUnlocked(before, d) && isDocumentUnlocked(after, d))
    }
  }
}

/** Returns progress with these documents/evidence marked as seen (unchanged if they all were already). */
export function markSeen(p: ProgressData, caseId: string, ids: string[]): ProgressData {
  const cp = p.cases[caseId]
  const fresh = cp ? ids.filter((id) => !cp.seen.includes(id)) : []
  return fresh.length ? withCase(p, caseId, (current) => ({ seen: [...current.seen, ...fresh] })) : p
}

// ---------- Loading saved data ----------

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined)
const count = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0)

function cleanSnapshot(v: unknown): EvidenceSnapshot | undefined {
  if (!isObj(v) || !Array.isArray(v.columns) || !Array.isArray(v.rows)) return undefined
  const cell = (x: unknown) => (typeof x === 'string' || typeof x === 'number' ? x : null)
  return {
    columns: v.columns.map(String),
    rows: v.rows.filter(Array.isArray).slice(0, SNAPSHOT_ROWS).map((r: unknown[]) => r.map(cell)),
    totalRows: count(v.totalRows)
  }
}

/**
 * Keeps only well-formed case records from a saved (or imported) progress file. Unknown ids are kept: content may
 * add them later, and the screens ignore ids they don't know.
 */
export function normalizeCases(raw: unknown): Record<string, CaseProgress> {
  if (!isObj(raw)) return {}
  const out: Record<string, CaseProgress> = {}
  for (const [id, value] of Object.entries(raw)) {
    if (!isObj(value)) continue
    const leads: Record<string, CaseLeadProgress> = {}
    for (const [leadId, l] of Object.entries(isObj(value.leads) ? value.leads : {})) {
      if (!isObj(l)) continue
      leads[leadId] = {
        cracked: str(l.cracked),
        solution: typeof l.solution === 'number' ? count(l.solution) : undefined,
        attempts: count(l.attempts),
        hintsUsed: count(l.hintsUsed),
        solutionViewed: l.solutionViewed === true
      }
    }
    const evidence: CaseProgress['evidence'] = {}
    for (const [evId, e] of Object.entries(isObj(value.evidence) ? value.evidence : {})) {
      if (!isObj(e) || !str(e.lead)) continue
      evidence[evId] = { at: str(e.at) ?? '', lead: str(e.lead)!, snapshot: cleanSnapshot(e.snapshot) }
    }
    out[id] = {
      caseVersion: count(value.caseVersion),
      mode: value.mode === 'challenge' ? 'challenge' : 'guided',
      startedAt: str(value.startedAt) ?? '',
      leads,
      evidence,
      draft: str(value.draft),
      focusLead: str(value.focusLead),
      seen: Array.isArray(value.seen) ? value.seen.filter((s): s is string => typeof s === 'string') : []
    }
  }
  return out
}
