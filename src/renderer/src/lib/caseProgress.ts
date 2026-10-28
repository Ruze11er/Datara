// Progress rules for Data Detective Academy cases: starting a case, which leads and documents are open,
// cracking a lead, the board, the verdict, closing the case, and cleaning up saved data on load.
// Pure functions over ProgressData, like labProgress.ts.

import { caseRunXp } from '@shared/academy'
import { scoreCase, type CaseScore } from '@shared/cases/scoring'
import type { BoardState, CaseDef, CaseDocument, CaseRun, Evidence, HypothesisStatus, Lead, Relation } from '@shared/cases/types'
import type {
  AcademyState,
  CaseGrade,
  CaseLeadProgress,
  CaseMode,
  CaseProgress,
  CaseTool,
  CaseVerdict,
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

/** Starts (or replays) a case: a fresh run in the chosen mode. The best result from earlier runs is kept. */
export function startCase(p: ProgressData, c: CaseDef, mode: CaseMode): ProgressData {
  const previous = p.cases[c.id]
  const run: CaseProgress = {
    caseVersion: c.version,
    mode,
    startedAt: new Date().toISOString(),
    leads: {},
    evidence: {},
    seen: [],
    board: {},
    notes: [],
    stage: 'investigating',
    summaryChecks: [],
    best: previous?.best,
    runs: (previous?.runs ?? 0) + 1,
    tool: previous?.tool
  }
  return { ...p, cases: { ...p.cases, [c.id]: run } }
}

/** Forgets the case completely, including its best result. */
export function abandonCase(p: ProgressData, caseId: string): ProgressData {
  const cases = { ...p.cases }
  delete cases[caseId]
  return { ...p, cases }
}

/** A case is closed once any run of it was closed. */
export const isCaseClosed = (p: ProgressData | null, caseId: string): boolean => !!p?.cases[caseId]?.best

/** Case 1 is open from the start; each later case opens when the one before it has been closed. */
export const isCaseUnlocked = (p: ProgressData | null, cases: CaseDef[], index: number): boolean =>
  index === 0 || (!!cases[index - 1] && isCaseClosed(p, cases[index - 1]!.id))

// ---------- Leads, documents, evidence ----------

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

/** The verdict opens once enough core leads are cracked (the case's verdictMinLeads). The rest is up to the learner. */
export function isVerdictOpen(c: CaseDef, cp: CaseProgress | undefined): boolean {
  return caseStats(c, cp).coreCracked >= c.scoring.verdictMinLeads
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
  result: { columns: string[]; rows: SqlValue[][] },
  tool: CaseTool = 'sql'
): { progress: ProgressData; reveal: CrackReveal } {
  const before = caseProgress(p, c.id)
  const now = new Date().toISOString()
  let next = withLead(p, c.id, lead.id, () => ({ cracked: now, solution, tool }))
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

// ---------- Board ----------

const boardEntry = (board: BoardState, hypothesisId: string) => board[hypothesisId] ?? { status: 'open' as const, links: {} }

export function withHypothesisStatus(p: ProgressData, caseId: string, hypothesisId: string, status: HypothesisStatus): ProgressData {
  return withCase(p, caseId, (cp) => ({
    board: { ...cp.board, [hypothesisId]: { ...boardEntry(cp.board, hypothesisId), status } }
  }))
}

/** Links evidence to a hypothesis (or removes the link with `relation` null). */
export function withLink(
  p: ProgressData,
  caseId: string,
  hypothesisId: string,
  evidenceId: string,
  relation: Relation | null
): ProgressData {
  return withCase(p, caseId, (cp) => {
    const entry = boardEntry(cp.board, hypothesisId)
    const links = { ...entry.links }
    if (relation) links[evidenceId] = relation
    else delete links[evidenceId]
    return { board: { ...cp.board, [hypothesisId]: { ...entry, links } } }
  })
}

// ---------- Verdict and closing ----------

export function emptyVerdict(): CaseVerdict {
  return { contributors: [], citations: [], recommendations: [], limitations: [], pushback: {}, summary: '' }
}

export const verdictOf = (cp: CaseProgress | undefined): CaseVerdict => ({ ...emptyVerdict(), ...cp?.verdict })

export function withVerdict(p: ProgressData, caseId: string, change: (v: CaseVerdict) => Partial<CaseVerdict>): ProgressData {
  return withCase(p, caseId, (cp) => {
    const v = verdictOf(cp)
    return { verdict: { ...v, ...change(v) } }
  })
}

/** What's still missing before the verdict can be presented (empty when it's complete). */
export function verdictGaps(c: CaseDef, v: CaseVerdict): string[] {
  const gaps: string[] = []
  if (!v.cause) gaps.push('Name the main cause.')
  if (!v.theory) gaps.push(`Answer: ${c.verdict.theory.question}`)
  if (v.citations.length < c.verdict.citations.min) gaps.push(`Cite at least ${c.verdict.citations.min} pieces of evidence.`)
  if (v.recommendations.length !== c.verdict.recommendations.pick) gaps.push(`Choose ${c.verdict.recommendations.pick} recommendations.`)
  if (v.summary.trim().length < 40) gaps.push('Write your summary for the CEO (a few sentences).')
  return gaps
}

/** The run as the scoring sees it. */
export function caseRunOf(c: CaseDef, cp: CaseProgress): CaseRun {
  return {
    cracked: c.leads.filter((l) => isCracked(cp, l.id)).map((l) => l.id),
    board: cp.board,
    verdict: verdictOf(cp)
  }
}

export const scoreOf = (c: CaseDef, cp: CaseProgress): CaseScore => scoreCase(c, caseRunOf(c, cp))

const GRADE_ORDER: CaseGrade[] = ['reopened', 'provisional', 'solid', 'distinguished']

/** Leads cracked in this run without hints or the solution. */
export const unassistedLeads = (c: CaseDef, cp: CaseProgress): number =>
  c.leads.filter((l) => {
    const lp = leadProgress(cp, l.id)
    return !!lp.cracked && lp.hintsUsed === 0 && !lp.solutionViewed
  }).length

/** XP this (closed) run earns. */
export const runXpOf = (c: CaseDef, cp: CaseProgress, total: number): number =>
  caseRunXp({ total, challenge: cp.mode === 'challenge', unassistedLeads: unassistedLeads(c, cp) })

/**
 * Closes the case: scores the run and keeps it as the best result if it beats the earlier ones. The best rating
 * and the best XP are kept separately.
 */
export function closeCase(p: ProgressData, c: CaseDef): { progress: ProgressData; score: CaseScore; xp: number } {
  const cp = p.cases[c.id]
  if (!cp) throw new Error('The case has not been started')
  const score = scoreOf(c, cp)
  const xp = runXpOf(c, cp, score.total)
  const now = new Date().toISOString()
  const prev = cp.best
  const better = !prev || score.total > prev.total
  const best = {
    ...(better ? { total: score.total, grade: score.grade, closedAt: now } : prev),
    xp: Math.max(prev?.xp ?? 0, xp)
  }
  return { score, xp, progress: withCase(p, c.id, () => ({ stage: 'closed', closedAt: now, best })) }
}

// ---------- Loading saved data ----------

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined)
const count = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0)
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : [])
const tool = (v: unknown): CaseTool | undefined => (v === 'sql' || v === 'python' ? v : undefined)

function cleanSnapshot(v: unknown): EvidenceSnapshot | undefined {
  if (!isObj(v) || !Array.isArray(v.columns) || !Array.isArray(v.rows)) return undefined
  const cell = (x: unknown) => (typeof x === 'string' || typeof x === 'number' ? x : null)
  return {
    columns: v.columns.map(String),
    rows: v.rows.filter(Array.isArray).slice(0, SNAPSHOT_ROWS).map((r: unknown[]) => r.map(cell)),
    totalRows: count(v.totalRows)
  }
}

function cleanBoard(v: unknown): BoardState {
  const board: BoardState = {}
  for (const [id, entry] of Object.entries(isObj(v) ? v : {})) {
    if (!isObj(entry)) continue
    const status: HypothesisStatus = entry.status === 'supported' || entry.status === 'ruled-out' ? entry.status : 'open'
    const links: Record<string, Relation> = {}
    for (const [ev, rel] of Object.entries(isObj(entry.links) ? entry.links : {})) {
      if (rel === 'supports' || rel === 'contradicts') links[ev] = rel
    }
    board[id] = { status, links }
  }
  return board
}

function cleanVerdict(v: unknown): CaseVerdict | undefined {
  if (!isObj(v)) return undefined
  const pushback: Record<string, string> = {}
  for (const [id, choice] of Object.entries(isObj(v.pushback) ? v.pushback : {})) if (typeof choice === 'string') pushback[id] = choice
  return {
    cause: str(v.cause),
    contributors: strings(v.contributors),
    theory: str(v.theory),
    citations: strings(v.citations),
    recommendations: strings(v.recommendations),
    limitations: strings(v.limitations),
    pushback,
    summary: str(v.summary) ?? ''
  }
}

const GRADES = new Set<string>(GRADE_ORDER)

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
        solutionViewed: l.solutionViewed === true,
        tool: tool(l.tool)
      }
    }
    const evidence: CaseProgress['evidence'] = {}
    for (const [evId, e] of Object.entries(isObj(value.evidence) ? value.evidence : {})) {
      if (!isObj(e) || !str(e.lead)) continue
      evidence[evId] = { at: str(e.at) ?? '', lead: str(e.lead)!, snapshot: cleanSnapshot(e.snapshot) }
    }
    const best = isObj(value.best) && GRADES.has(String(value.best.grade))
      ? {
          total: count(value.best.total),
          grade: value.best.grade as CaseGrade,
          closedAt: str(value.best.closedAt) ?? '',
          xp: typeof value.best.xp === 'number' ? count(value.best.xp) : undefined
        }
      : undefined
    out[id] = {
      caseVersion: count(value.caseVersion),
      mode: value.mode === 'challenge' ? 'challenge' : 'guided',
      startedAt: str(value.startedAt) ?? '',
      leads,
      evidence,
      draft: str(value.draft),
      pythonDraft: str(value.pythonDraft),
      tool: tool(value.tool),
      focusLead: str(value.focusLead),
      seen: strings(value.seen),
      board: cleanBoard(value.board),
      notes: (Array.isArray(value.notes) ? value.notes : [])
        .filter(isObj)
        .filter((n) => typeof n.text === 'string')
        .map((n) => ({ id: str(n.id) ?? String(Math.random()), text: String(n.text), at: str(n.at) ?? '' })),
      verdict: cleanVerdict(value.verdict),
      stage: value.stage === 'pushback' || value.stage === 'closed' ? value.stage : 'investigating',
      closedAt: str(value.closedAt),
      summaryChecks: Array.isArray(value.summaryChecks) ? value.summaryChecks.filter((n): n is number => typeof n === 'number') : [],
      best,
      runs: Math.max(1, count(value.runs))
    }
  }
  return out
}

/** Cleans the saved Academy rewards record (achievement times and the last rank shown). */
export function normalizeAcademy(raw: unknown): AcademyState {
  const v = isObj(raw) ? raw : {}
  const achievements: Record<string, string> = {}
  for (const [id, at] of Object.entries(isObj(v.achievements) ? v.achievements : {})) if (typeof at === 'string') achievements[id] = at
  return { achievements, rankSeen: typeof v.rankSeen === 'number' ? count(v.rankSeen) : undefined }
}
