// Data Detective Academy: the shape of a case (content/cases/<id>/) and of a learner's run through it.
// Shared by the app and scripts/verify-content.ts. Types only, so it compiles away completely.
//
// IDs (case, lead, evidence, hypothesis, document, option) are saved in progress: never rename a published one.

/** What a hypothesis turned out to be, according to the case's planted story. */
export type HypothesisTruth = 'cause' | 'contributor' | 'ruled-out'

export type Relation = 'supports' | 'contradicts'

export interface CastMember {
  id: string
  name: string
  role: string
}

export interface Hypothesis {
  id: string
  title: string
  /** Who suggested it (a cast id), if anyone. */
  source?: string
  truth: HypothesisTruth
  /** Why it is true or false. Shown in the debrief. */
  explanation: string
}

export interface CaseDocument {
  id: string
  title: string
  /** Cast id of the author. */
  from?: string
  kind: 'memo' | 'email' | 'report' | 'note'
  /** Markdown. */
  body: string
  /** Lead that reveals this document. Missing = available from the start. */
  unlockedBy?: string
}

export interface Evidence {
  id: string
  title: string
  /** fact = proven by the learner's own query; claim = something a person said (not proven). */
  kind: 'fact' | 'claim'
  /** What this shows, in a sentence or two (Markdown). Shown on the evidence card. */
  summary: string
  /** Cast id, for claims. */
  from?: string
  /** How this evidence bears on each hypothesis. Hypotheses not listed: it doesn't tell us anything about them. */
  relations: Record<string, Relation>
  /** Central to the case: the verdict should rest on key evidence. */
  key: boolean
}

export interface ColumnDoc {
  name: string
  description: string
}

export interface TableDoc {
  name: string
  description: string
  columns: ColumnDoc[]
}

export interface SqlSolution {
  query: string
  /** Shown when the learner's query matches this solution, e.g. "you kept the duplicates in: fine for spotting the pattern". */
  note?: string
}

export interface Misconception {
  query: string
  /** Shown when the learner's result matches this query's result. */
  feedback: string
}

export interface SqlLeadTool {
  starter: string
  /** Any result matching one of these cracks the lead. The first is the main one (used for feedback and the debrief). */
  solutions: SqlSolution[]
  /** Common wrong approaches, each with tailored feedback. */
  misconceptions: Misconception[]
  orderMatters: boolean
  /** Also check on the case's hidden dataset, so typed-in values fail. On by default. */
  hiddenData: boolean
  /** From nudge to near-solution. */
  hints: string[]
  /** Why the main solution works. Shown after cracking the lead. */
  explanation: string
  tests: { accept: string[]; reject: string[] }
}

export interface Lead {
  id: string
  title: string
  /** The question, as the investigation asks it (shown in both modes). */
  question: string
  /** Step-by-step instructions for guided mode (Markdown). */
  guidedTask: string
  /** Needed before the verdict, and counted in the Evidence score. */
  core: boolean
  /** Not listed until found: cracked only by a matching query run during the investigation. */
  secret: boolean
  /** Leads that must be cracked before this one appears. Empty = open from the start. */
  requires: string[]
  /** The evidence card this lead produces. */
  evidence: string
  concepts: string[]
  lesson?: string
  sql: SqlLeadTool
}

export interface VerdictOption {
  id: string
  text: string
  /** Points for choosing this option (0 = wrong). */
  score: number
  /** Shown in the debrief. */
  feedback: string
}

export interface LimitationOption {
  id: string
  text: string
  valid: boolean
  feedback: string
}

export interface Pushback {
  id: string
  /** Cast id. */
  from: string
  challenge: string
  options: VerdictOption[]
}

export interface Verdict {
  /** Question about a stakeholder's theory, e.g. the CEO's claim. */
  theory: { hypothesis: string; question: string; options: VerdictOption[] }
  /** How many evidence cards to cite (at least / at most). */
  citations: { min: number; max: number }
  recommendations: { question: string; pick: number; options: VerdictOption[] }
  limitations: { question: string; target: number; options: LimitationOption[] }
  pushback: Pushback[]
  /** Model executive summary (Markdown) and the checklist the learner compares theirs against. */
  modelSummary: string
  summaryChecklist: string[]
}

export interface ManualCard {
  id: string
  title: string
  /** Markdown. Methods and definitions only: facts that need sources belong in cited lessons. */
  body: string
  lessons: string[]
  check: { question: string; options: string[]; answer: number; explanation: string }
}

/** A claim the story makes, checked against the data by verify. The query returns one number. */
export interface Assertion {
  id: string
  description: string
  query: string
  practice?: { min?: number; max?: number; equals?: number }
  hidden?: { min?: number; max?: number; equals?: number }
}

export interface ScoringRules {
  /** Leads that show the data problem (Data quality score). */
  dataQualityLeads: string[]
  /** Correct board links needed for full marks on links. */
  linksTarget: number
  /** Relevant evidence citations needed for full marks on citations. */
  citationsTarget: number
}

/** A scripted play used by verify to check that the scoring rewards good reasoning (see tests.plays). */
export interface PlayTest {
  name: string
  /** "all" = every non-secret lead. */
  cracked: string[] | 'all'
  board: BoardState
  verdict: VerdictAnswers
  /** Expected total score range. */
  expect: { min?: number; max?: number }
}

export interface CaseDef {
  id: string
  /** Display number, e.g. "001". */
  number: string
  title: string
  /** Bump when the dataset or leads change in a way that makes saved runs stale. */
  version: number
  /** Rank the case is meant for (1 = Rookie). */
  rank: number
  summary: string
  /** Shown on the case file, e.g. "SQL Lab chapters 1–5". */
  recommendedTraining: string
  company: string
  dataset: { id: string; file: string; hiddenFile: string }
  tables: TableDoc[]
  /** Markdown, in the case's narrative voice. */
  briefing: string
  objectives: string[]
  cast: CastMember[]
  hypotheses: Hypothesis[]
  documents: CaseDocument[]
  evidence: Evidence[]
  leads: Lead[]
  manual: ManualCard[]
  verdict: Verdict
  scoring: ScoringRules
  debrief: { story: string; career: string }
  assertions: Assertion[]
  tests: { plays: PlayTest[] }
}

// ---------- A learner's run ----------

export type HypothesisStatus = 'open' | 'supported' | 'ruled-out'

/** Hypothesis id -> the learner's status and evidence links for it. */
export type BoardState = Record<string, { status: HypothesisStatus; links: Record<string, Relation> }>

export interface VerdictAnswers {
  /** Hypothesis id chosen as the main cause. */
  cause?: string
  /** Other hypotheses that made things look worse. */
  contributors: string[]
  /** Option id for the stakeholder-theory question. */
  theory?: string
  /** Evidence ids cited. */
  citations: string[]
  recommendations: string[]
  limitations: string[]
  /** Pushback id -> option id. */
  pushback: Record<string, string>
}

export interface CaseRun {
  cracked: string[]
  board: BoardState
  verdict: VerdictAnswers
}
