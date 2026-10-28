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
import { scoreCase } from '../src/shared/cases/scoring.ts'
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
}

/** Checks all cases and returns how many were checked. */
export async function verifyCases(ctx: CaseCheckContext): Promise<number> {
  const { SQL, contentDir, verbose, error, warn } = ctx
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

    // Scripted plays: the scoring must reward good reasoning and punish bad.
    for (const play of c.tests.plays) {
      const cracked = play.cracked === 'all' ? c.leads.filter((l) => !l.secret).map((l) => l.id) : play.cracked
      const score = scoreCase(c, { cracked, board: play.board, verdict: play.verdict })
      const parts = score.dimensions.map((d) => `${d.label} ${d.score}/${d.max}`).join(', ')
      if ((play.expect.min !== undefined && score.total < play.expect.min) || (play.expect.max !== undefined && score.total > play.expect.max)) {
        error(`${where}: play "${play.name}" scores ${score.total}, expected ${play.expect.min ?? 0}–${play.expect.max ?? 100} (${parts})`)
      } else if (verbose) {
        console.log(`${where}: play "${play.name}": ${score.total} (${score.grade}): ${parts}`)
      }
    }
  }
  return checked
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
