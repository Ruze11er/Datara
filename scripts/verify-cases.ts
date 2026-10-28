// Checks every Data Detective Academy case (content/cases/). Called from verify-content.ts.
//
// - The case parses and every id it mentions exists (caseProblems).
// - The data dictionary matches the dataset's real tables and columns.
// - Every assertion (a claim the story makes about the data) holds on the practice and hidden datasets.
// - Every lead's solutions run, don't depend on row storage order, and differ from each other lead's answers
//   and from the lead's own misconceptions. Accept tests crack the lead (practice + hidden data), reject tests
//   don't, and the hidden data actually changes the answer.
// - The scripted plays in tests.plays score inside their expected ranges, so the scoring rewards good reasoning.

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { SqlJsStatic } from 'sql.js'
import { parse as parseYaml } from 'yaml'
import { caseProblems, parseCase } from '../src/shared/cases/parse.ts'
import { compareResult, confirmOnHidden, leadCheckOptions, matchLead, type LeadReference } from '../src/shared/cases/leadMatch.ts'
import { caseRunXp, rankState, xpBreakdown } from '../src/shared/academy.ts'
import { caseSetup, pyTableResult, type PyTableLike } from '../src/shared/cases/python.ts'
import { scoreCase } from '../src/shared/cases/scoring.ts'
import { toCsv } from '../src/shared/csv.ts'
import type { CaseDef, Lead } from '../src/shared/cases/types.ts'
import { checkResult, type QueryResult } from '../src/shared/sqlCheck.ts'
import { runLastStatement } from '../src/shared/sqlRun.ts'

export interface CaseCheckContext {
  SQL: SqlJsStatic
  contentDir: string
  verbose: boolean
  lessonIds: Set<string>
  error: (msg: string) => void
  warn: (msg: string) => void
  /** The Python checker (datara_check.py in Pyodide), or null if Python couldn't start. */
  python: ((kind: 'run' | 'check', spec: object) => any) | null
}

/** The XP and rank rules give the documented numbers (CLAUDE.md, docs/plan.md, the Academy page). */
function checkXpRules(error: (msg: string) => void): void {
  const expect = (what: string, actual: unknown, expected: unknown) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) error(`XP rules: ${what} gives ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`)
  }
  const xp = xpBreakdown({
    levels: [{ status: 'solved', stars: 3 }, { status: 'solved', stars: 1 }, { status: 'unsolved', stars: 0 }],
    lessons: [{ completedAt: '2026-01-01', quizScore: 1 }, { completedAt: '2026-01-02' }, {}],
    caseXp: [300],
    achievements: 2
  })
  // Levels: (10 + 3×5) + (10 + 1×5) = 40. Lessons: (15 + 10) + 15 = 40. Achievements: 2 × 25 = 50.
  expect('xpBreakdown', xp, { labs: 40, lessons: 40, cases: 300, achievements: 50, total: 430 })
  // 3 × 100 + 50 (Challenge) + 10 × 5 (unassisted leads).
  expect('caseRunXp (perfect Challenge run)', caseRunXp({ total: 100, challenge: true, unassistedLeads: 10 }), 400)
  expect('caseRunXp (guided, 70, no unassisted leads)', caseRunXp({ total: 70, challenge: false, unassistedLeads: 0 }), 210)
  const case1 = (grade?: string) => [{ title: 'Case #001', rank: 1, grade }]
  expect('rank with 600 XP and Case #001 Solid', rankState(600, case1('solid')).current.rank, 2)
  expect('rank with 600 XP and Case #001 Provisional', rankState(600, case1('provisional')).current.rank, 1)
  expect('rank with 400 XP and Case #001 Distinguished', rankState(400, case1('distinguished')).current.rank, 1)
  expect('rank with 9999 XP and no rank-2 case', rankState(9999, case1('solid')).current.rank, 2)
  expect('promotion blocked by a missing case', rankState(9999, case1('solid')).needs?.noCaseYet, true)
}

/** Checks all cases and returns how many were checked. */
export async function verifyCases(ctx: CaseCheckContext): Promise<number> {
  const { SQL, contentDir, verbose, error, warn } = ctx
  checkXpRules(error)
  const casesDir = join(contentDir, 'cases')
  let ids: string[]
  try {
    ids = parseYaml(await readFile(join(casesDir, 'index.yaml'), 'utf8')) as string[]
  } catch {
    warn('No Academy cases yet (content/cases/index.yaml not found)')
    return 0
  }

  let checked = 0
  for (const id of ids) {
    let c: CaseDef
    try {
      const dir = join(casesDir, id)
      c = parseCase(await readFile(join(dir, 'case.yaml'), 'utf8'), await readFile(join(dir, 'leads.yaml'), 'utf8'), `case ${id}`)
    } catch (e) {
      error(`Case ${id}: ${(e as Error).message}`)
      continue
    }
    checked++
    const where = `Case ${c.number} (${c.id})`
    if (c.id !== id) error(`${where}: id must match its folder name "${id}"`)
    for (const p of caseProblems(c)) error(`${where}: ${p}`)
    for (const l of c.leads) if (l.lesson && !ctx.lessonIds.has(l.lesson)) error(`${where}: lead ${l.id} links to unknown lesson "${l.lesson}"`)
    for (const m of c.manual) for (const lesson of m.lessons) if (!ctx.lessonIds.has(lesson)) error(`${where}: manual card ${m.id} links to unknown lesson "${lesson}"`)

    let practice: Uint8Array
    let hidden: Uint8Array
    try {
      practice = await buildDataset(SQL, join(contentDir, 'datasets', c.dataset.file))
      hidden = await buildDataset(SQL, join(contentDir, 'datasets', c.dataset.hiddenFile))
    } catch (e) {
      error(`${where}: dataset could not be built: ${(e as Error).message}. Run npm run case-data.`)
      continue
    }
    const run = (bytes: Uint8Array, sql: string): QueryResult & { truncated: boolean } => {
      const db = new SQL.Database(bytes)
      try {
        return runLastStatement(db, sql)
      } finally {
        db.close()
      }
    }

    checkTables(c, (sql) => run(practice, sql), where, error)
    checkAssertions(c, run, practice, hidden, where, verbose, error)
    checkLeads(c, run, practice, hidden, where, verbose, error, warn)
    if (ctx.python) checkPythonSolutions(c, ctx.python, SQL, practice, hidden, run, where, verbose, error)
    else if (c.leads.some((l) => l.python)) warn(`${where}: Python didn't start, so the pandas solutions were not checked`)

    // Scripted plays: the scoring must reward good reasoning and punish bad, and the debrief must say why.
    for (const play of c.tests.plays) {
      const cracked = play.cracked === 'all' ? c.leads.filter((l) => !l.secret).map((l) => l.id) : play.cracked
      const score = scoreCase(c, { cracked, board: play.board, verdict: play.verdict })
      const parts = score.dimensions.map((d) => `${d.label} ${d.score}/${d.max}`).join(', ')
      if ((play.expect.min !== undefined && score.total < play.expect.min) || (play.expect.max !== undefined && score.total > play.expect.max)) {
        error(`${where}: play "${play.name}" scores ${score.total}, expected ${play.expect.min ?? 0}–${play.expect.max ?? 100} (${parts})`)
      } else if (verbose) {
        console.log(`${where}: play "${play.name}": ${score.total} (${score.grade}): ${parts}`)
      }
      // The play must be possible in the app: the verdict opens only after verdictMinLeads core leads.
      const coreCracked = c.leads.filter((l) => l.core && cracked.includes(l.id)).length
      if (coreCracked < c.scoring.verdictMinLeads) {
        error(`${where}: play "${play.name}" cracks ${coreCracked} core leads, but the verdict needs ${c.scoring.verdictMinLeads}`)
      }
      const missed = [...score.dimensions.flatMap((d) => d.missed), score.capped ?? '']
      for (const text of play.missedIncludes) {
        if (!missed.some((m) => m.includes(text))) error(`${where}: play "${play.name}": the debrief never says "${text}"`)
      }
    }
  }
  return checked
}

/** Every table of a dataset as CSV text (file name -> text), as the app gives them to Python. */
function csvFiles(SQL: SqlJsStatic, bytes: Uint8Array, tables: string[]): Record<string, string> {
  const db = new SQL.Database(bytes)
  try {
    const files: Record<string, string> = {}
    for (const t of tables) {
      const r = db.exec(`SELECT * FROM ${t}`)[0]
      files[`${t}.csv`] = toCsv(r?.columns ?? [], (r?.values ?? []) as (string | number | null)[][])
    }
    return files
  } finally {
    db.close()
  }
}

/** Each lead's pandas solution must crack it, on the practice data and the hidden data, as the app checks it. */
function checkPythonSolutions(
  c: CaseDef,
  python: (kind: 'run' | 'check', spec: object) => any,
  SQL: SqlJsStatic,
  practice: Uint8Array,
  hidden: Uint8Array,
  run: (bytes: Uint8Array, sql: string) => QueryResult,
  where: string,
  verbose: boolean,
  error: (msg: string) => void
): void {
  const leads = c.leads.filter((l) => l.python)
  if (leads.length === 0) return
  const tables = c.tables.map((t) => t.name)
  const files = { practice: csvFiles(SQL, practice, tables), hidden: csvFiles(SQL, hidden, tables) }
  const reference = (lead: Lead, bytes: Uint8Array): LeadReference => ({
    solutions: lead.sql.solutions.map((s) => run(bytes, s.query)),
    misconceptions: lead.sql.misconceptions.map((m) => run(bytes, m.query))
  })
  const tablesOf = (code: string, which: 'practice' | 'hidden'): Map<string, QueryResult> | string => {
    const out = python('run', { setup: caseSetup(tables, code), code, files: files[which], caseTables: true })
    if (out.error) return `${out.error.type}: ${out.error.message}`
    const result = new Map<string, QueryResult>()
    for (const v of out.variables as { name: string; given: boolean; table?: PyTableLike }[]) {
      const r = !v.given && v.table ? pyTableResult(v.table) : null
      if (r) result.set(v.name, r)
    }
    return result
  }

  for (const lead of leads) {
    const w = `${where}: lead ${lead.id} (pandas solution)`
    const code = lead.python!.solution
    const mine = tablesOf(code, 'practice')
    if (typeof mine === 'string') {
      error(`${w} fails: ${mine}`)
      continue
    }
    const practiceRef = reference(lead, practice)
    const matched = [...mine].find(([, r]) => matchLead(lead, practiceRef, r).kind === 'match')
    if (!matched) {
      const [name, r] = [...mine].at(-1) ?? ['(none)', null]
      const why = r ? matchLead(lead, practiceRef, r) : null
      error(`${w} doesn't crack the lead (checked "${name}"): ${why?.kind === 'miss' ? why.outcome.message : why?.kind ?? 'no table made'}`)
      continue
    }
    const onHidden = tablesOf(code, 'hidden')
    const hiddenTable = typeof onHidden === 'string' ? null : (onHidden.get(matched[0]) ?? null)
    const outcome = confirmOnHidden(lead, reference(lead, hidden), hiddenTable)
    if (!outcome.pass) error(`${w} cracks the lead on the practice data but not on the hidden data`)
    else if (verbose) console.log(`${w}: cracks it with "${matched[0]}"`)
  }
}

async function buildDataset(SQL: SqlJsStatic, file: string): Promise<Uint8Array> {
  const db = new SQL.Database()
  try {
    db.exec(await readFile(file, 'utf8'))
    return db.export()
  } finally {
    db.close()
  }
}

/** The data dictionary must describe exactly the tables and columns the dataset has. */
function checkTables(c: CaseDef, run: (sql: string) => QueryResult, where: string, error: (msg: string) => void): void {
  const real = new Map<string, string[]>()
  const rows = run(
    "SELECT m.name, p.name FROM sqlite_master AS m JOIN pragma_table_info(m.name) AS p WHERE m.type = 'table' ORDER BY m.name, p.cid"
  ).rows
  for (const [table, column] of rows) real.set(String(table), [...(real.get(String(table)) ?? []), String(column)])
  const documented = new Map(c.tables.map((t) => [t.name, t.columns.map((col) => col.name)]))
  for (const [table, columns] of real) {
    const doc = documented.get(table)
    if (!doc) {
      error(`${where}: table ${table} is not described in "tables"`)
      continue
    }
    for (const col of columns) if (!doc.includes(col)) error(`${where}: column ${table}.${col} is not described`)
    for (const col of doc) if (!columns.includes(col)) error(`${where}: "tables" describes ${table}.${col}, which doesn't exist`)
  }
  for (const table of documented.keys()) if (!real.has(table)) error(`${where}: "tables" describes ${table}, which doesn't exist`)
}

function checkAssertions(
  c: CaseDef,
  run: (bytes: Uint8Array, sql: string) => QueryResult,
  practice: Uint8Array,
  hidden: Uint8Array,
  where: string,
  verbose: boolean,
  error: (msg: string) => void
): void {
  for (const a of c.assertions) {
    for (const [name, bytes, range] of [
      ['practice', practice, a.practice],
      ['hidden', hidden, a.hidden]
    ] as const) {
      if (!range) continue
      let value: unknown
      try {
        value = run(bytes, a.query).rows[0]?.[0]
      } catch (e) {
        error(`${where}: assertion ${a.id} fails to run: ${(e as Error).message}`)
        continue
      }
      if (typeof value !== 'number') {
        error(`${where}: assertion ${a.id} must return a number, got ${JSON.stringify(value)} (${name} data)`)
        continue
      }
      const ok =
        (range.equals === undefined || Math.abs(value - range.equals) <= 0.005) &&
        (range.min === undefined || value >= range.min) &&
        (range.max === undefined || value <= range.max)
      if (!ok) error(`${where}: on the ${name} data, "${a.description}" is not true: the query gives ${value} (${JSON.stringify(range)})`)
      else if (verbose) console.log(`${where}: assertion ${a.id} (${name}): ${Math.round(value * 10000) / 10000}`)
    }
  }
}

function checkLeads(
  c: CaseDef,
  run: (bytes: Uint8Array, sql: string) => QueryResult & { truncated: boolean },
  practice: Uint8Array,
  hidden: Uint8Array,
  where: string,
  verbose: boolean,
  error: (msg: string) => void,
  warn: (msg: string) => void
): void {
  const tryRun = (bytes: Uint8Array, sql: string, what: string): QueryResult | null => {
    try {
      const r = run(bytes, sql)
      if (r.truncated) error(`${what}: returns more than 5,000 rows, which the checker can't compare in full`)
      return { columns: r.columns, rows: r.rows }
    } catch (e) {
      error(`${what}: fails: ${(e as Error).message}`)
      return null
    }
  }
  const references = (lead: Lead, bytes: Uint8Array, name: string): LeadReference => ({
    solutions: lead.sql.solutions.map((s, i) => tryRun(bytes, s.query, `${where}: lead ${lead.id} solution ${i + 1} (${name} data)`)),
    misconceptions: lead.sql.misconceptions.map((m, i) => tryRun(bytes, m.query, `${where}: lead ${lead.id} misconception ${i + 1} (${name} data)`))
  })
  const refs = new Map(c.leads.map((l) => [l.id, { practice: references(l, practice, 'practice'), hidden: references(l, hidden, 'hidden') }]))

  /** The app's full check: crack on the practice data, then confirm on the hidden data. */
  const cracks = (lead: Lead, query: string): { pass: boolean; message: string } => {
    const r = refs.get(lead.id)!
    const actual = run(practice, query)
    const match = matchLead(lead, r.practice, actual)
    if (match.kind !== 'match') return { pass: false, message: match.kind === 'miss' ? match.outcome.message : match.feedback }
    let hiddenActual: QueryResult | null = null
    try {
      hiddenActual = run(hidden, query)
    } catch {
      // Fails on the hidden data: not cracked, as in the app.
    }
    const outcome = confirmOnHidden(lead, r.hidden, hiddenActual)
    return { pass: outcome.pass, message: outcome.message }
  }

  for (const lead of c.leads) {
    const w = `${where}: lead ${lead.id}`
    const r = refs.get(lead.id)!
    const options = leadCheckOptions(lead)

    for (const [i, solution] of r.practice.solutions.entries()) {
      if (!solution) continue
      if (solution.rows.length === 0) warn(`${w}: solution ${i + 1} returns no rows`)
      if (verbose) console.log(`${w}: solution ${i + 1}: ${solution.rows.length} rows, columns ${solution.columns.join(', ')}`)
      // The answer must not depend on how rows happen to be stored.
      for (const [name, bytes, expected] of [
        ['practice', practice, solution],
        ['hidden', hidden, r.hidden.solutions[i]]
      ] as const) {
        if (!expected) continue
        const reversed = run(bytes, `PRAGMA reverse_unordered_selects = ON;\n${lead.sql.solutions[i]!.query}`)
        if (!checkResult(expected, reversed, options).pass) error(`${w}: solution ${i + 1} depends on row storage order on the ${name} data (a tie?)`)
      }
      // The hidden data must change the answer, or typed-in values would pass.
      const hiddenAnswer = r.hidden.solutions[i]
      if (lead.sql.hiddenData && hiddenAnswer && checkResult(solution, hiddenAnswer, options).pass) {
        warn(`${w}: solution ${i + 1} gives the same result on the hidden data, so typed-in values would pass`)
      }
      // Two leads must never share an answer, or one query would crack both by accident.
      for (const other of c.leads) {
        if (other.id === lead.id) continue
        for (const otherSolution of refs.get(other.id)!.practice.solutions) {
          if (otherSolution && compareResult(otherSolution, solution, leadCheckOptions(other)).pass) {
            error(`${w}: solution ${i + 1} also cracks lead ${other.id}`)
          }
        }
      }
    }
    // A misconception must not look like a correct answer.
    for (const [i, m] of r.practice.misconceptions.entries()) {
      if (!m) continue
      if (matchLead(lead, { solutions: r.practice.solutions, misconceptions: [] }, m).kind === 'match') {
        error(`${w}: misconception ${i + 1} gives a correct answer`)
      } else if (verbose) {
        console.log(`    misconception ${i + 1} recognized`)
      }
    }
    for (const query of lead.sql.tests.accept) {
      try {
        const outcome = cracks(lead, query)
        if (!outcome.pass) error(`${w}: should ACCEPT "${query}" but says: ${outcome.message}`)
      } catch (e) {
        error(`${w}: accept query errors: "${query}": ${(e as Error).message}`)
      }
    }
    for (const query of [...lead.sql.tests.reject, ...lead.sql.misconceptions.map((m) => m.query)]) {
      try {
        const outcome = cracks(lead, query)
        if (outcome.pass) error(`${w}: should REJECT "${query.trim()}", but it cracks the lead`)
        else if (verbose) console.log(`    rejects "${query.trim().slice(0, 70)}": ${outcome.message.slice(0, 90)}`)
      } catch {
        // A query that errors doesn't crack the lead, which is fine.
      }
    }
  }
}
