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
import {
  citationsInBody,
  parseLesson,
  parseLessonIndex,
  parseSqlChapters,
  parseSqlLevel
} from '../src/shared/content.ts'
import { checkResult, type QueryResult } from '../src/shared/sqlCheck.ts'
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
const storeSql = await readFile(join(contentDir, 'datasets', 'store.sql'), 'utf8')
const storeBytes = (() => {
  const db = new SQL.Database()
  db.exec(storeSql)
  const bytes = db.export()
  db.close()
  return bytes
})()

function run(query: string): QueryResult {
  const db = new SQL.Database(storeBytes)
  try {
    const { columns, rows } = runLastStatement(db, query)
    return { columns, rows }
  } finally {
    db.close()
  }
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

    for (const query of level.tests.accept) {
      try {
        const outcome = checkResult(expected, run(query), options)
        if (!outcome.pass) error(`${where}: should ACCEPT "${query}" but says: ${outcome.message}`)
      } catch (e) {
        error(`${where}: accept query errors: "${query}": ${(e as Error).message}`)
      }
    }
    for (const query of level.tests.reject) {
      try {
        const outcome = checkResult(expected, run(query), options)
        if (outcome.pass) error(`${where}: should REJECT "${query}", but it passes`)
        else if (verbose) console.log(`    rejects "${query}": ${outcome.message}`)
      } catch {
        // A query that errors is rejected, which is fine.
      }
    }
  }
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
        if (!levels.has(levelId)) error(`${id}: practice link "${levelId}" is not a real level`)
      }
    } catch (e) {
      error(`${id}.md: ${(e as Error).message}`)
    }
  }
} catch {
  warn('No lessons yet (content/lessons/index.yaml not found)')
}

for (const level of levels.values()) {
  if (level.lesson && lessonIds.size > 0 && !lessonIds.has(level.lesson)) {
    error(`Level ${level.id}: lesson "${level.lesson}" does not exist`)
  }
}

// ---------- Report ----------

for (const w of warnings) console.log(`WARN   ${w}`)
for (const e of errors) console.log(`ERROR  ${e}`)
console.log(
  `\nChecked ${levels.size} SQL levels in ${chapters.length} chapters and ${lessonIds.size} lessons: ` +
    `${errors.length} errors, ${warnings.length} warnings.`
)
process.exit(errors.length > 0 ? 1 : 0)
