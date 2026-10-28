// Parses an Academy case from its two files: content/cases/<id>/case.yaml (story, board, verdict, data checks)
// and leads.yaml (the investigation questions). Used by the app and by scripts/verify-content.ts.
// Shape errors throw; cross-reference problems (unknown ids) are reported by caseProblems() instead.

import { parse as parseYaml } from 'yaml'
import type {
  Assertion,
  BoardState,
  CaseDef,
  CaseDocument,
  Evidence,
  Hypothesis,
  Lead,
  LimitationOption,
  ManualCard,
  PlayTest,
  Relation,
  VerdictAnswers,
  VerdictOption
} from './types'

type Obj = Record<string, unknown>

function obj(v: unknown, where: string): Obj {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new Error(`${where} must be a mapping`)
  return v as Obj
}

function list(v: unknown, where: string): unknown[] {
  if (v === undefined) return []
  if (!Array.isArray(v)) throw new Error(`${where} must be a list`)
  return v
}

function text(o: Obj, key: string, where: string): string {
  const v = o[key]
  if (typeof v !== 'string' || v.trim() === '') throw new Error(`${where}: "${key}" must be a non-empty text`)
  return v.trim()
}

function optText(o: Obj, key: string, where: string): string | undefined {
  return o[key] === undefined ? undefined : text(o, key, where)
}

function num(o: Obj, key: string, where: string): number {
  const v = o[key]
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`${where}: "${key}" must be a number`)
  return v
}

function texts(o: Obj, key: string, where: string): string[] {
  return list(o[key], `${where}: "${key}"`).map((v) => {
    if (typeof v !== 'string') throw new Error(`${where}: "${key}" must be a list of text`)
    // trimEnd only: leading spaces can matter in code.
    return v.trimEnd()
  })
}

function oneOf<T extends string>(o: Obj, key: string, allowed: readonly T[], where: string): T {
  const v = o[key]
  if (!allowed.includes(v as T)) throw new Error(`${where}: "${key}" must be one of ${allowed.join(', ')}`)
  return v as T
}

function relations(v: unknown, where: string): Record<string, Relation> {
  if (v === undefined) return {}
  const out: Record<string, Relation> = {}
  for (const [id, rel] of Object.entries(obj(v, where))) {
    if (rel !== 'supports' && rel !== 'contradicts') throw new Error(`${where}: "${id}" must be supports or contradicts`)
    out[id] = rel
  }
  return out
}

function option(v: unknown, where: string): VerdictOption {
  const o = obj(v, where)
  return { id: text(o, 'id', where), text: text(o, 'text', where), score: num(o, 'score', where), feedback: text(o, 'feedback', where) }
}

function range(v: unknown, where: string): Assertion['practice'] {
  if (v === undefined) return undefined
  const o = obj(v, where)
  const r: NonNullable<Assertion['practice']> = {}
  for (const key of ['min', 'max', 'equals'] as const) if (o[key] !== undefined) r[key] = num(o, key, where)
  return r
}

function board(v: unknown, where: string): BoardState {
  const out: BoardState = {}
  for (const [id, entry] of Object.entries(obj(v ?? {}, where))) {
    const e = obj(entry, `${where}.${id}`)
    out[id] = {
      status: oneOf(e, 'status', ['open', 'supported', 'ruled-out'] as const, `${where}.${id}`),
      links: relations(e.links, `${where}.${id}.links`)
    }
  }
  return out
}

function verdictAnswers(v: unknown, where: string): VerdictAnswers {
  const o = obj(v ?? {}, where)
  const pushback: Record<string, string> = {}
  for (const [id, choice] of Object.entries(obj(o.pushback ?? {}, `${where}.pushback`))) pushback[id] = String(choice)
  return {
    cause: optText(o, 'cause', where),
    contributors: texts(o, 'contributors', where),
    theory: optText(o, 'theory', where),
    citations: texts(o, 'citations', where),
    recommendations: texts(o, 'recommendations', where),
    limitations: texts(o, 'limitations', where),
    pushback
  }
}

function parseLead(v: unknown, i: number): Lead {
  const o = obj(v, `lead ${i + 1}`)
  const where = `lead "${String(o.id ?? i + 1)}"`
  const sql = obj(o.sql, `${where}.sql`)
  const tests = obj(sql.tests ?? {}, `${where}.sql.tests`)
  const solutions = list(sql.solutions, `${where}.sql.solutions`).map((s, j) => {
    const so = obj(s, `${where} solution ${j + 1}`)
    return { query: text(so, 'query', `${where} solution ${j + 1}`), note: optText(so, 'note', `${where} solution ${j + 1}`) }
  })
  if (solutions.length === 0) throw new Error(`${where}: needs at least one solution`)
  const python = o.python === undefined ? undefined : obj(o.python, `${where}.python`)
  return {
    id: text(o, 'id', where),
    title: text(o, 'title', where),
    question: text(o, 'question', where),
    guidedTask: text(o, 'guidedTask', where),
    core: o.core === true,
    secret: o.secret === true,
    requires: texts(o, 'requires', where),
    evidence: text(o, 'evidence', where),
    concepts: texts(o, 'concepts', where),
    lesson: optText(o, 'lesson', where),
    sql: {
      starter: typeof sql.starter === 'string' ? sql.starter : '-- Write your query below.\n',
      solutions,
      misconceptions: list(sql.misconceptions, `${where}.sql.misconceptions`).map((m, j) => {
        const mo = obj(m, `${where} misconception ${j + 1}`)
        return { query: text(mo, 'query', `${where} misconception ${j + 1}`), feedback: text(mo, 'feedback', `${where} misconception ${j + 1}`) }
      }),
      orderMatters: sql.orderMatters === true,
      hiddenData: sql.hiddenData !== false,
      hints: texts(sql, 'hints', `${where}.sql`),
      explanation: text(sql, 'explanation', `${where}.sql`),
      tests: { accept: texts(tests, 'accept', `${where}.sql.tests`), reject: texts(tests, 'reject', `${where}.sql.tests`) }
    },
    python: python
      ? { solution: text(python, 'solution', `${where}.python`), starter: optText(python, 'starter', `${where}.python`) }
      : undefined
  }
}

export function parseCase(caseText: string, leadsText: string, where: string): CaseDef {
  const raw = obj(parseYaml(caseText), where)
  const at = (part: string) => `${where} ${part}`

  const dataset = obj(raw.dataset, at('dataset'))
  const verdict = obj(raw.verdict, at('verdict'))
  const theory = obj(verdict.theory, at('verdict.theory'))
  const citations = obj(verdict.citations, at('verdict.citations'))
  const recs = obj(verdict.recommendations, at('verdict.recommendations'))
  const lims = obj(verdict.limitations, at('verdict.limitations'))
  const scoring = obj(raw.scoring, at('scoring'))
  const debrief = obj(raw.debrief, at('debrief'))
  const tests = obj(raw.tests ?? {}, at('tests'))

  return {
    id: text(raw, 'id', where),
    number: text(raw, 'number', where),
    title: text(raw, 'title', where),
    version: num(raw, 'version', where),
    rank: num(raw, 'rank', where),
    summary: text(raw, 'summary', where),
    recommendedTraining: text(raw, 'recommendedTraining', where),
    company: text(raw, 'company', where),
    dataset: { id: text(dataset, 'id', at('dataset')), file: text(dataset, 'file', at('dataset')), hiddenFile: text(dataset, 'hiddenFile', at('dataset')) },
    tables: list(raw.tables, at('tables')).map((t, i) => {
      const o = obj(t, at(`table ${i + 1}`))
      return {
        name: text(o, 'name', at(`table ${i + 1}`)),
        description: text(o, 'description', at(`table ${i + 1}`)),
        columns: Object.entries(obj(o.columns, at(`table ${i + 1} columns`))).map(([name, description]) => ({ name, description: String(description) }))
      }
    }),
    briefing: text(raw, 'briefing', where),
    objectives: texts(raw, 'objectives', where),
    cast: list(raw.cast, at('cast')).map((c, i) => {
      const o = obj(c, at(`cast ${i + 1}`))
      return { id: text(o, 'id', at(`cast ${i + 1}`)), name: text(o, 'name', at(`cast ${i + 1}`)), role: text(o, 'role', at(`cast ${i + 1}`)) }
    }),
    hypotheses: list(raw.hypotheses, at('hypotheses')).map((h, i): Hypothesis => {
      const o = obj(h, at(`hypothesis ${i + 1}`))
      const w = at(`hypothesis ${String(o.id ?? i + 1)}`)
      return {
        id: text(o, 'id', w),
        title: text(o, 'title', w),
        source: optText(o, 'source', w),
        truth: oneOf(o, 'truth', ['cause', 'contributor', 'ruled-out'] as const, w),
        explanation: text(o, 'explanation', w)
      }
    }),
    documents: list(raw.documents, at('documents')).map((d, i): CaseDocument => {
      const o = obj(d, at(`document ${i + 1}`))
      const w = at(`document ${String(o.id ?? i + 1)}`)
      return {
        id: text(o, 'id', w),
        title: text(o, 'title', w),
        from: optText(o, 'from', w),
        kind: oneOf(o, 'kind', ['memo', 'email', 'report', 'note'] as const, w),
        body: text(o, 'body', w),
        unlockedBy: optText(o, 'unlockedBy', w)
      }
    }),
    evidence: list(raw.evidence, at('evidence')).map((e, i): Evidence => {
      const o = obj(e, at(`evidence ${i + 1}`))
      const w = at(`evidence ${String(o.id ?? i + 1)}`)
      return {
        id: text(o, 'id', w),
        title: text(o, 'title', w),
        kind: oneOf(o, 'kind', ['fact', 'claim'] as const, w),
        summary: text(o, 'summary', w),
        from: optText(o, 'from', w),
        relations: relations(o.relations, `${w} relations`),
        key: o.key === true
      }
    }),
    leads: list(parseYaml(leadsText), `${where} leads.yaml`).map(parseLead),
    manual: list(raw.manual, at('manual')).map((m, i): ManualCard => {
      const o = obj(m, at(`manual card ${i + 1}`))
      const w = at(`manual card ${String(o.id ?? i + 1)}`)
      const check = obj(o.check, `${w} check`)
      return {
        id: text(o, 'id', w),
        title: text(o, 'title', w),
        body: text(o, 'body', w),
        lessons: texts(o, 'lessons', w),
        check: {
          question: text(check, 'question', `${w} check`),
          options: texts(check, 'options', `${w} check`),
          answer: num(check, 'answer', `${w} check`),
          explanation: text(check, 'explanation', `${w} check`)
        }
      }
    }),
    verdict: {
      theory: {
        hypothesis: text(theory, 'hypothesis', at('verdict.theory')),
        question: text(theory, 'question', at('verdict.theory')),
        options: list(theory.options, at('verdict.theory.options')).map((v, i) => option(v, at(`verdict.theory option ${i + 1}`)))
      },
      citations: { min: num(citations, 'min', at('verdict.citations')), max: num(citations, 'max', at('verdict.citations')) },
      recommendations: {
        question: text(recs, 'question', at('verdict.recommendations')),
        pick: num(recs, 'pick', at('verdict.recommendations')),
        options: list(recs.options, at('verdict.recommendations.options')).map((v, i) => option(v, at(`recommendation ${i + 1}`)))
      },
      limitations: {
        question: text(lims, 'question', at('verdict.limitations')),
        target: num(lims, 'target', at('verdict.limitations')),
        options: list(lims.options, at('verdict.limitations.options')).map((v, i): LimitationOption => {
          const o = obj(v, at(`limitation ${i + 1}`))
          return { id: text(o, 'id', at(`limitation ${i + 1}`)), text: text(o, 'text', at(`limitation ${i + 1}`)), valid: o.valid === true, feedback: text(o, 'feedback', at(`limitation ${i + 1}`)) }
        })
      },
      pushback: list(verdict.pushback, at('verdict.pushback')).map((p, i) => {
        const o = obj(p, at(`pushback ${i + 1}`))
        return {
          id: text(o, 'id', at(`pushback ${i + 1}`)),
          from: text(o, 'from', at(`pushback ${i + 1}`)),
          challenge: text(o, 'challenge', at(`pushback ${i + 1}`)),
          options: list(o.options, at(`pushback ${i + 1} options`)).map((v, j) => option(v, at(`pushback ${i + 1} option ${j + 1}`)))
        }
      }),
      modelSummary: text(verdict, 'modelSummary', at('verdict')),
      summaryChecklist: texts(verdict, 'summaryChecklist', at('verdict'))
    },
    scoring: {
      dataQualityLeads: texts(scoring, 'dataQualityLeads', at('scoring')),
      linksTarget: num(scoring, 'linksTarget', at('scoring')),
      citationsTarget: num(scoring, 'citationsTarget', at('scoring')),
      verdictMinLeads: num(scoring, 'verdictMinLeads', at('scoring'))
    },
    debrief: { story: text(debrief, 'story', at('debrief')), career: text(debrief, 'career', at('debrief')) },
    assertions: list(raw.assertions, at('assertions')).map((a, i): Assertion => {
      const o = obj(a, at(`assertion ${i + 1}`))
      const w = at(`assertion ${String(o.id ?? i + 1)}`)
      return { id: text(o, 'id', w), description: text(o, 'description', w), query: text(o, 'query', w), practice: range(o.practice, `${w} practice`), hidden: range(o.hidden, `${w} hidden`) }
    }),
    tests: {
      plays: list(tests.plays, at('tests.plays')).map((p, i): PlayTest => {
        const o = obj(p, at(`play ${i + 1}`))
        const w = at(`play "${String(o.name ?? i + 1)}"`)
        const expect = obj(o.expect, `${w} expect`)
        return {
          name: text(o, 'name', w),
          cracked: o.cracked === 'all' ? 'all' : texts(o, 'cracked', w),
          board: board(o.board, `${w} board`),
          verdict: verdictAnswers(o.verdict, `${w} verdict`),
          expect: { min: expect.min === undefined ? undefined : num(expect, 'min', w), max: expect.max === undefined ? undefined : num(expect, 'max', w) },
          missedIncludes: texts(o, 'missedIncludes', w)
        }
      })
    }
  }
}

/** Unknown ids and other cross-reference mistakes in a parsed case. Empty when everything lines up. */
export function caseProblems(c: CaseDef): string[] {
  const problems: string[] = []
  const unique = (kind: string, ids: string[]) => {
    const seen = new Set<string>()
    for (const id of ids) {
      if (seen.has(id)) problems.push(`${kind} id "${id}" is used twice`)
      seen.add(id)
    }
    return seen
  }
  const cast = unique('cast', c.cast.map((x) => x.id))
  const hyps = unique('hypothesis', c.hypotheses.map((x) => x.id))
  unique('document', c.documents.map((x) => x.id))
  const evidence = unique('evidence', c.evidence.map((x) => x.id))
  const leads = unique('lead', c.leads.map((x) => x.id))
  unique('manual card', c.manual.map((x) => x.id))
  unique('assertion', c.assertions.map((x) => x.id))
  const verdictOptions = [
    ...c.verdict.theory.options,
    ...c.verdict.recommendations.options,
    ...c.verdict.limitations.options,
    ...c.verdict.pushback.flatMap((p) => p.options)
  ]
  unique('verdict option', verdictOptions.map((o) => o.id))
  unique('pushback', c.verdict.pushback.map((p) => p.id))

  const need = (set: Set<string>, id: string | undefined, what: string) => {
    if (id !== undefined && !set.has(id)) problems.push(`${what} refers to unknown id "${id}"`)
  }
  for (const h of c.hypotheses) need(cast, h.source, `hypothesis ${h.id} source`)
  for (const d of c.documents) {
    need(cast, d.from, `document ${d.id} from`)
    need(leads, d.unlockedBy, `document ${d.id} unlockedBy`)
  }
  for (const e of c.evidence) {
    need(cast, e.from, `evidence ${e.id} from`)
    for (const h of Object.keys(e.relations)) need(hyps, h, `evidence ${e.id} relations`)
  }
  const producedBy = new Map<string, string>()
  for (const l of c.leads) {
    need(evidence, l.evidence, `lead ${l.id} evidence`)
    const other = producedBy.get(l.evidence)
    if (other) problems.push(`leads ${other} and ${l.id} both produce evidence ${l.evidence}`)
    producedBy.set(l.evidence, l.id)
    if (c.evidence.find((e) => e.id === l.evidence)?.kind === 'claim') problems.push(`lead ${l.id} produces a claim; leads produce facts`)
    for (const r of l.requires) need(leads, r, `lead ${l.id} requires`)
    if (l.secret && l.core) problems.push(`lead ${l.id} is both secret and core`)
    if (l.sql.hints.length !== 3) problems.push(`lead ${l.id} has ${l.sql.hints.length} hints (3 expected)`)
  }
  for (const e of c.evidence) {
    if (e.kind === 'fact' && !producedBy.has(e.id)) problems.push(`fact ${e.id} is not produced by any lead`)
  }
  // Every lead must be reachable: its requirements eventually trace back to open leads.
  const reachable = new Set<string>()
  for (let changed = true; changed; ) {
    changed = false
    for (const l of c.leads) {
      if (!reachable.has(l.id) && l.requires.every((r) => reachable.has(r))) {
        reachable.add(l.id)
        changed = true
      }
    }
  }
  for (const l of c.leads) if (!reachable.has(l.id)) problems.push(`lead ${l.id} can never be unlocked (circular requires?)`)

  need(hyps, c.verdict.theory.hypothesis, 'verdict.theory.hypothesis')
  for (const p of c.verdict.pushback) need(cast, p.from, `pushback ${p.id} from`)
  for (const id of c.scoring.dataQualityLeads) need(leads, id, 'scoring.dataQualityLeads')
  for (const m of c.manual) {
    if (m.check.answer < 0 || m.check.answer >= m.check.options.length) problems.push(`manual card ${m.id}: invalid answer index`)
  }
  if (!c.hypotheses.some((h) => h.truth === 'cause')) problems.push('no hypothesis has truth: cause')
  if (c.verdict.recommendations.options.length < c.verdict.recommendations.pick) problems.push('fewer recommendation options than "pick"')
  if (c.verdict.citations.min > c.verdict.citations.max) problems.push('verdict.citations: min is above max')
  const coreCount = c.leads.filter((l) => l.core).length
  if (c.scoring.verdictMinLeads < 1 || c.scoring.verdictMinLeads > coreCount) {
    problems.push(`scoring.verdictMinLeads must be between 1 and the number of core leads (${coreCount})`)
  }

  for (const play of c.tests.plays) {
    const w = `play "${play.name}"`
    if (play.cracked !== 'all') for (const id of play.cracked) need(leads, id, `${w} cracked`)
    for (const [h, entry] of Object.entries(play.board)) {
      need(hyps, h, `${w} board`)
      for (const e of Object.keys(entry.links)) need(evidence, e, `${w} board links`)
    }
    const v = play.verdict
    need(hyps, v.cause, `${w} cause`)
    for (const h of v.contributors) need(hyps, h, `${w} contributors`)
    for (const e of v.citations) need(evidence, e, `${w} citations`)
    const optionIds = new Set(verdictOptions.map((o) => o.id))
    for (const id of [v.theory, ...v.recommendations, ...v.limitations, ...Object.values(v.pushback)]) need(optionIds, id, `${w} verdict`)
  }
  return problems
}
