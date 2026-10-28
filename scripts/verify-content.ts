// Checks all learning content before it ships. Run with: npm run verify
//
// SQL levels: every reference solution runs, every "accept" query passes the
// checker, and every "reject" query fails it.
// Lessons: every citation [^n] has a source, every source is cited and verified,
// and every "practice" link points to a real level.
//
// Runs directly with Node (no build step): Node strips the TypeScript types.

import { readdir, readFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import initSqlJs from 'sql.js'
import { loadPyodide } from 'pyodide'
import {
  citationsInBody,
  parsePythonLevel,
  parseLesson,
  parseLessonIndex,
  parseSqlChapters,
  parseSqlLevel
} from '../src/shared/content.ts'
import {
  checkHiddenResult,
  checkResult,
  type CheckOptions,
  type CheckOutcome,
  type QueryResult
} from '../src/shared/sqlCheck.ts'
import { runLastStatement } from '../src/shared/sqlRun.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const contentDir = join(root, 'content')
const verbose = process.argv.includes('--verbose')

const errors: string[] = []
const warnings: string[] = []
const error = (msg: string): void => void errors.push(msg)
const warn = (msg: string): void => void warnings.push(msg)

// ---------- SQL levels ----------

const SQL = await initSqlJs()
async function buildDataset(file: string): Promise<Uint8Array> {
  const db = new SQL.Database()
  db.exec(await readFile(join(contentDir, 'datasets', file), 'utf8'))
  const bytes = db.export()
  db.close()
  return bytes
}
const storeBytes = await buildDataset('store.sql')
const hiddenBytes = await buildDataset('store-hidden.sql')

function run(query: string, bytes: Uint8Array = storeBytes): QueryResult {
  const db = new SQL.Database(bytes)
  try {
    const { columns, rows } = runLastStatement(db, query)
    return { columns, rows }
  } finally {
    db.close()
  }
}

/**
 * Runs the query with SQLite reading every table in reverse order. If the result changes, it depends on
 * how rows happen to be stored: usually a tie at a LIMIT cut-off, or ORDER BY on a column with equal values.
 * Another correct query could then break the tie differently and be marked wrong.
 */
const runReversed = (query: string, bytes: Uint8Array): QueryResult =>
  run(`PRAGMA reverse_unordered_selects = ON;\n${query}`, bytes)

/** True if the numbers only go up (or stay equal), or only go down: the column the rows are probably sorted by. */
function isSortedColumn(values: QueryResult['rows'][number]): boolean {
  if (values.some((v) => typeof v !== 'number')) return false
  const nums = values as number[]
  const up = nums.every((v, i) => i === 0 || v >= nums[i - 1]!)
  const down = nums.every((v, i) => i === 0 || v <= nums[i - 1]!)
  return up || down
}

/**
 * Looks for ties that would make "top N" answers ambiguous. SQLite breaks ORDER BY ties using the selected
 * values, so the pragma check above can't see them. Instead: when the solution ends in LIMIT n, fetch one more
 * row, find the numeric columns the rows are sorted by, and see whether rows n and n+1 have the same value there.
 * Returns a description of the tie, or null.
 */
function limitTie(query: string, bytes: Uint8Array): string | null {
  const match = /\bLIMIT\s+(\d+)\s*;?\s*$/i.exec(query)
  if (!match) return null
  const n = Number(match[1])
  const { columns, rows } = run(query.slice(0, match.index) + `LIMIT ${n + 1}`, bytes)
  if (rows.length <= n || n === 0) return null
  for (let c = 0; c < columns.length; c++) {
    const values = rows.map((r) => r[c] ?? null)
    if (isSortedColumn(values) && values[n - 1] === values[n]) {
      return `rows ${n} and ${n + 1} both have ${columns[c]} = ${values[n]}`
    }
  }
  return null
}

/** The same two-step check the app does: practice data first, then the hidden shop. */
function fullCheck(
  query: string,
  expected: QueryResult,
  hiddenExpected: QueryResult | null,
  options: CheckOptions
): CheckOutcome {
  const outcome = checkResult(expected, run(query), options)
  if (!outcome.pass || !hiddenExpected) return outcome
  let hiddenActual: QueryResult | null = null
  try {
    hiddenActual = run(query, hiddenBytes)
  } catch {
    // Treated like the app: a query that fails on the hidden data doesn't pass.
  }
  return checkHiddenResult(hiddenExpected, hiddenActual, options)
}

const levelDir = join(contentDir, 'sql-levels')
const chapters = parseSqlChapters(await readFile(join(levelDir, 'chapters.yaml'), 'utf8'))
const levelFiles = (await readdir(levelDir)).filter((f) => f.endsWith('.yaml') && f !== 'chapters.yaml')
const levels = new Map<string, ReturnType<typeof parseSqlLevel>>()

for (const file of levelFiles) {
  try {
    const level = parseSqlLevel(await readFile(join(levelDir, file), 'utf8'), file)
    if (level.id !== basename(file, '.yaml')) error(`${file}: id "${level.id}" must match the file name`)
    levels.set(level.id, level)
  } catch (e) {
    error(`${file}: ${(e as Error).message}`)
  }
}

const inChapters = new Set<string>()
for (const chapter of chapters) {
  for (const id of chapter.levels) {
    if (inChapters.has(id)) error(`Level "${id}" appears in more than one chapter`)
    inChapters.add(id)
    if (!levels.has(id)) error(`Chapter ${chapter.id} lists "${id}", but there is no file for it`)
  }
}
for (const id of levels.keys()) if (!inChapters.has(id)) warn(`Level "${id}" is not in any chapter`)

let levelNumber = 0
for (const chapter of chapters) {
  for (const id of chapter.levels) {
    levelNumber++
    const level = levels.get(id)
    if (!level) continue
    const where = `Level ${levelNumber} (${id})`
    const options = { orderMatters: level.orderMatters, checkColumnNames: level.checkColumnNames }

    let expected: QueryResult
    try {
      expected = run(level.solution)
    } catch (e) {
      error(`${where}: the reference solution fails: ${(e as Error).message}`)
      continue
    }
    if (expected.rows.length === 0) warn(`${where}: the solution returns no rows`)
    if (level.hints.length !== 3) warn(`${where}: has ${level.hints.length} hints (3 recommended)`)
    if (verbose) console.log(`${where}: ${expected.rows.length} rows, columns: ${expected.columns.join(', ')}`)

    let hiddenExpected: QueryResult | null = null
    if (level.hiddenData) {
      try {
        hiddenExpected = run(level.solution, hiddenBytes)
        if (expected.rows.length > 0 && hiddenExpected.rows.length === 0) {
          warn(`${where}: the solution returns no rows on the hidden data, so the hidden check proves little`)
        }
      } catch (e) {
        error(`${where}: the reference solution fails on the hidden data: ${(e as Error).message}`)
      }
    }

    // Ties: the answer must not depend on the order rows happen to be stored in.
    for (const [name, bytes, answer] of [
      ['practice', storeBytes, expected],
      ['hidden', hiddenBytes, hiddenExpected]
    ] as const) {
      if (!answer) continue
      const reversed = checkResult(answer, runReversed(level.solution, bytes), options)
      if (!reversed.pass) {
        error(
          `${where}: on the ${name} data the solution's result depends on row storage order (a tie?). ` +
            `Add a tie-breaker to the ORDER BY${name === 'hidden' ? ', or set hiddenData: false' : ''}.`
        )
      }
      const tie = limitTie(level.solution, bytes)
      if (tie) {
        error(
          `${where}: on the ${name} data there's a tie at the LIMIT cut-off (${tie}). Another correct query could ` +
            `pick a different row. Add a tie-breaker to the task and solution${name === 'hidden' ? ', or set hiddenData: false' : ''}.`
        )
      }
    }

    for (const query of level.tests.accept) {
      try {
        const outcome = fullCheck(query, expected, hiddenExpected, options)
        if (!outcome.pass) error(`${where}: should ACCEPT "${query}" but says: ${outcome.message}`)
      } catch (e) {
        error(`${where}: accept query errors: "${query}": ${(e as Error).message}`)
      }
    }
    for (const query of level.tests.reject) {
      try {
        const outcome = fullCheck(query, expected, hiddenExpected, options)
        if (outcome.pass) error(`${where}: should REJECT "${query}", but it passes`)
        else if (verbose) console.log(`    rejects "${query}": ${outcome.message}`)
      } catch {
        // A query that errors is rejected, which is fine.
      }
    }
  }
}

// ---------- Python levels ----------

const pyDir = join(contentDir, 'python-levels')
const pyLevels = new Map<string, ReturnType<typeof parsePythonLevel>>()
let pyChapterCount = 0

try {
  const pyChapters = parseSqlChapters(await readFile(join(pyDir, 'chapters.yaml'), 'utf8'))
  pyChapterCount = pyChapters.length
  for (const file of (await readdir(pyDir)).filter((f) => f.endsWith('.yaml') && f !== 'chapters.yaml')) {
    try {
      const level = parsePythonLevel(await readFile(join(pyDir, file), 'utf8'), file)
      if (level.id !== basename(file, '.yaml')) error(`${file}: id "${level.id}" must match the file name`)
      if (levels.has(level.id)) error(`${file}: id "${level.id}" is also used by a SQL level`)
      pyLevels.set(level.id, level)
    } catch (e) {
      error(`${file}: ${(e as Error).message}`)
    }
  }
  const listed = new Set<string>()
  for (const chapter of pyChapters) {
    for (const id of chapter.levels) {
      if (listed.has(id)) error(`Python level "${id}" appears in more than one chapter`)
      listed.add(id)
      if (!pyLevels.has(id)) error(`Python chapter ${chapter.id} lists "${id}", but there is no file for it`)
    }
  }
  for (const id of pyLevels.keys()) if (!listed.has(id)) warn(`Python level "${id}" is not in any chapter`)

  // The same checker the app uses, running in Pyodide under Node.
  // Packages (pandas) load from the same bundled wheels the app uses, never the internet.
  const pyodide = await loadPyodide({ packageBaseUrl: join(root, 'src', 'renderer', 'public', 'pyodide') + '/' })
  const allPythonCode = [...pyLevels.values()]
    .flatMap((l) => [l.setup, l.solution, ...l.variants, ...l.tests.accept, ...l.tests.reject])
    .join('\n')
  await pyodide.loadPackagesFromImports(allPythonCode, { messageCallback: () => undefined })
  const checkerNs = pyodide.globals.get('dict')()
  pyodide.runPython(await readFile(join(root, 'src', 'shared', 'python', 'datara_check.py'), 'utf8'), {
    globals: checkerNs
  })
  const handle = checkerNs.get('handle') as (kind: string, spec: string) => string
  const call = (kind: 'run' | 'check', spec: object) => JSON.parse(handle(kind, JSON.stringify(spec)))

  let n = 0
  for (const chapter of pyChapters) {
    for (const id of chapter.levels) {
      n++
      const level = pyLevels.get(id)
      if (!level) continue
      const where = `Python level ${n} (${id})`
      const spec = {
        setup: level.setup,
        solution: level.solution,
        expect: level.expect,
        checkOutput: level.checkOutput,
        variants: level.variants,
        calls: level.calls,
        files: level.files,
        ignoreRowOrder: level.ignoreRowOrder
      }
      try {
        const solved = call('run', { setup: level.setup, code: level.solution, files: level.files })
        if (solved.error) {
          error(`${where}: the solution fails: ${solved.error.type}: ${solved.error.message}`)
          continue
        }
        const names = new Set((solved.variables as { name: string }[]).map((v) => v.name))
        for (const name of level.expect) if (!names.has(name)) error(`${where}: the solution never creates "${name}"`)
        if (level.checkOutput && !String(solved.output).trim()) error(`${where}: checkOutput is on, but the solution prints nothing`)
        if (verbose) console.log(`${where}: output ${JSON.stringify(String(solved.output).slice(0, 60))}`)

        const self = call('check', { ...spec, code: level.solution })
        if (!self.pass) error(`${where}: the solution does not pass its own check: ${self.message}`)
        if (level.hints.length !== 3) warn(`${where}: has ${level.hints.length} hints (3 recommended)`)

        for (const code of level.tests.accept) {
          const r = call('check', { ...spec, code })
          if (!r.pass) error(`${where}: should ACCEPT ${JSON.stringify(code)} but says: ${r.message}`)
        }
        for (const code of level.tests.reject) {
          const r = call('check', { ...spec, code })
          if (r.pass) error(`${where}: should REJECT ${JSON.stringify(code)}, but it passes`)
          else if (verbose) console.log(`    rejects ${JSON.stringify(code).slice(0, 70)}: ${r.message}`)
        }
      } catch (e) {
        error(`${where}: checker crashed: ${(e as Error).message}`)
      }
    }
  }
  checkerNs.destroy()
} catch (e) {
  if ((e as NodeJS.ErrnoException).code === 'ENOENT') warn('No Python levels yet (content/python-levels/chapters.yaml not found)')
  else error(`Python levels: ${(e as Error).message}`)
}

// ---------- Lessons ----------

const lessonDir = join(contentDir, 'lessons')
const lessonIds = new Set<string>()
try {
  const index = parseLessonIndex(await readFile(join(lessonDir, 'index.yaml'), 'utf8'))
  const listed = index.flatMap((c) => c.modules.flatMap((m) => m.lessons))

  for (const id of listed) {
    let text: string
    try {
      text = await readFile(join(lessonDir, `${id}.md`), 'utf8')
    } catch {
      error(`Lesson index lists "${id}", but content/lessons/${id}.md does not exist`)
      continue
    }
    try {
      const lesson = parseLesson(text, `${id}.md`)
      lessonIds.add(lesson.id)
      if (lesson.id !== id) error(`${id}.md: id "${lesson.id}" must match the file name`)

      const cited = citationsInBody(lesson.body)
      const sourceIds = new Set(lesson.sources.map((s) => s.id))
      for (const n of cited) if (!sourceIds.has(n)) error(`${id}: cites [^${n}] but has no source ${n}`)
      for (const s of lesson.sources) {
        if (!cited.includes(s.id)) warn(`${id}: source ${s.id} is never cited in the text`)
        if (!s.verified) error(`${id}: source ${s.id} ("${s.title}") is not verified yet`)
        if (!/^https:\/\//.test(s.url)) error(`${id}: source ${s.id} URL must start with https://`)
      }
      if (lesson.sources.length === 0) warn(`${id}: has no sources`)

      for (const [i, q] of lesson.quiz.entries()) {
        if (q.answer < 0 || q.answer >= q.options.length) error(`${id}: quiz question ${i + 1} has an invalid answer index`)
      }
      for (const levelId of lesson.practice) {
        if (!levels.has(levelId) && !pyLevels.has(levelId)) error(`${id}: practice link "${levelId}" is not a real level`)
      }
    } catch (e) {
      error(`${id}.md: ${(e as Error).message}`)
    }
  }
} catch {
  warn('No lessons yet (content/lessons/index.yaml not found)')
}

for (const level of [...levels.values(), ...pyLevels.values()]) {
  if (level.lesson && lessonIds.size > 0 && !lessonIds.has(level.lesson)) {
    error(`Level ${level.id}: lesson "${level.lesson}" does not exist`)
  }
}

// ---------- Report ----------

for (const w of warnings) console.log(`WARN   ${w}`)
for (const e of errors) console.log(`ERROR  ${e}`)
console.log(
  `\nChecked ${levels.size} SQL levels (${chapters.length} chapters), ${pyLevels.size} Python levels ` +
    `(${pyChapterCount} chapters) and ${lessonIds.size} lessons: ${errors.length} errors, ${warnings.length} warnings.`
)
process.exit(errors.length > 0 ? 1 : 0)
