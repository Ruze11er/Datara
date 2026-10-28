// Content formats and parsers for SQL levels and lessons.
// Used by the app and by scripts/verify-content.ts.

import { parse as parseYaml } from 'yaml'

// ---------- SQL levels ----------

export interface SqlLevel {
  /** Stable ID used to save progress. Never change it once published. */
  id: string
  title: string
  /** Skills practised, e.g. ["WHERE", "AND"]. Used for "topics to revisit". */
  concepts: string[]
  /** Lesson to review for this level. */
  lesson?: string
  /** Tables the task uses (shown first in the table list). */
  tables: string[]
  task: string
  starter: string
  solution: string
  orderMatters: boolean
  checkColumnNames: boolean
  /** From gentle nudge to near-solution. */
  hints: string[]
  /** Why the solution works. Shown after solving. */
  explanation: string
  tests: { accept: string[]; reject: string[] }
}

export interface SqlChapter {
  id: string
  title: string
  description: string
  /** Level IDs in play order. The last one is the chapter's milestone level. */
  levels: string[]
}

/** Chapters look the same in every lab. */
export type Chapter = SqlChapter

// ---------- Python levels ----------

export interface PythonLevel {
  id: string
  title: string
  concepts: string[]
  lesson?: string
  task: string
  /** "Given data": code that runs before the learner's code. Shown read-only. */
  setup: string
  starter: string
  solution: string
  /** Variable names compared with the reference solution. */
  expect: string[]
  /** Compare printed output with the reference solution. */
  checkOutput: boolean
  /**
   * Test calls for function levels, e.g. "apply_discount(100, 0.2)". Each is evaluated against the
   * learner's code and the solution, and the return values are compared.
   */
  calls: string[]
  /**
   * Other versions of the given data. The learner's code must also give the same
   * answers as the solution on these, so typing in the answer directly won't pass.
   */
  variants: string[]
  /**
   * Data files (name -> text) placed in Python's in-memory folder before the code runs,
   * e.g. products.csv for pd.read_csv("products.csv"). Shown to the learner under "Files".
   */
  files: Record<string, string>
  /** Compare DataFrame/Series rows in any order (e.g. when merge or groupby methods may order rows differently). */
  ignoreRowOrder: boolean
  hints: string[]
  explanation: string
  tests: { accept: string[]; reject: string[] }
}

const DEFAULT_PY_STARTER = '# Write your code below, then press Check.\n'

export function parsePythonLevel(text: string, where: string): PythonLevel {
  const raw = parseYaml(text) as Record<string, unknown>
  const tests = (raw.tests ?? {}) as Record<string, unknown>
  const level: PythonLevel = {
    id: requireString(raw, 'id', where),
    title: requireString(raw, 'title', where),
    concepts: stringList(raw, 'concepts'),
    lesson: typeof raw.lesson === 'string' ? raw.lesson : undefined,
    task: requireString(raw, 'task', where),
    setup: typeof raw.setup === 'string' ? raw.setup.trimEnd() : '',
    starter: typeof raw.starter === 'string' ? raw.starter : DEFAULT_PY_STARTER,
    solution: requireString(raw, 'solution', where),
    expect: stringList(raw, 'expect'),
    checkOutput: raw.checkOutput === true,
    calls: stringList(raw, 'calls'),
    variants: stringList(raw, 'variants'),
    files: fileMap(raw.files, where),
    ignoreRowOrder: raw.ignoreRowOrder === true,
    hints: stringList(raw, 'hints'),
    explanation: requireString(raw, 'explanation', where),
    tests: { accept: stringList(tests, 'accept'), reject: stringList(tests, 'reject') }
  }
  if (level.expect.length === 0 && !level.checkOutput && level.calls.length === 0) {
    throw new Error(`${where}: a Python level needs "expect" variables, "calls", or checkOutput: true`)
  }
  return level
}

function fileMap(value: unknown, where: string): Record<string, string> {
  if (value === undefined) return {}
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${where}: "files" must map file names to their text`)
  }
  const files: Record<string, string> = {}
  for (const [name, text] of Object.entries(value)) {
    if (!/^[\w-]+\.[\w]+$/.test(name)) throw new Error(`${where}: file name "${name}" must be a plain name like data.csv`)
    if (typeof text !== 'string') throw new Error(`${where}: file "${name}" must contain text`)
    files[name] = text
  }
  return files
}

const DEFAULT_STARTER = '-- Write your query below, then press Check.\n'

function requireString(obj: Record<string, unknown>, key: string, where: string): string {
  const v = obj[key]
  if (typeof v !== 'string' || v.trim() === '') throw new Error(`${where}: "${key}" must be a non-empty text`)
  return v.trim()
}

function stringList(obj: Record<string, unknown>, key: string): string[] {
  const v = obj[key]
  if (v === undefined) return []
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) throw new Error(`"${key}" must be a list of text`)
  // trimEnd only: leading spaces matter in Python code.
  return v.map((x: string) => x.trimEnd())
}

export function parseSqlLevel(text: string, where: string): SqlLevel {
  const raw = parseYaml(text) as Record<string, unknown>
  const tests = (raw.tests ?? {}) as Record<string, unknown>
  return {
    id: requireString(raw, 'id', where),
    title: requireString(raw, 'title', where),
    concepts: stringList(raw, 'concepts'),
    lesson: typeof raw.lesson === 'string' ? raw.lesson : undefined,
    tables: stringList(raw, 'tables'),
    task: requireString(raw, 'task', where),
    starter: typeof raw.starter === 'string' ? raw.starter : DEFAULT_STARTER,
    solution: requireString(raw, 'solution', where),
    orderMatters: raw.orderMatters === true,
    checkColumnNames: raw.checkColumnNames === true,
    hints: stringList(raw, 'hints'),
    explanation: requireString(raw, 'explanation', where),
    tests: { accept: stringList(tests, 'accept'), reject: stringList(tests, 'reject') }
  }
}

export function parseSqlChapters(text: string): SqlChapter[] {
  const raw = parseYaml(text) as Record<string, unknown>[]
  return raw.map((c, i) => ({
    id: requireString(c, 'id', `chapter ${i + 1}`),
    title: requireString(c, 'title', `chapter ${i + 1}`),
    description: requireString(c, 'description', `chapter ${i + 1}`),
    levels: stringList(c, 'levels')
  }))
}

// ---------- Lessons ----------

export interface LessonSource {
  id: number
  title: string
  author?: string
  publisher: string
  url: string
  /** Date the source was checked, YYYY-MM-DD. */
  accessed: string
  /** True once someone confirmed the page supports what the lesson says. */
  verified: boolean
}

export interface QuizQuestion {
  question: string
  options: string[]
  /** Index of the correct option. */
  answer: number
  explanation: string
}

export interface Lesson {
  id: string
  title: string
  summary: string
  minutes: number
  /** SQL level IDs to practise after this lesson. */
  practice: string[]
  sources: LessonSource[]
  quiz: QuizQuestion[]
  /** Markdown. Citations are written as [^1], matching a source id. */
  body: string
}

export interface LessonModule {
  id: string
  title: string
  lessons: string[]
}

export interface LessonCategory {
  id: string
  title: string
  description: string
  modules: LessonModule[]
}

export function parseLesson(text: string, where: string): Lesson {
  const match = text.replace(/^﻿/, '').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!match) throw new Error(`${where}: lesson must start with a --- front-matter block`)
  const meta = parseYaml(match[1] ?? '') as Record<string, unknown>
  const sources = (meta.sources ?? []) as Record<string, unknown>[]
  const quiz = (meta.quiz ?? []) as Record<string, unknown>[]

  return {
    id: requireString(meta, 'id', where),
    title: requireString(meta, 'title', where),
    summary: requireString(meta, 'summary', where),
    minutes: typeof meta.minutes === 'number' ? meta.minutes : 5,
    practice: stringList(meta, 'practice'),
    sources: sources.map((s, i) => ({
      id: typeof s.id === 'number' ? s.id : i + 1,
      title: requireString(s, 'title', `${where} source ${i + 1}`),
      author: typeof s.author === 'string' ? s.author : undefined,
      publisher: requireString(s, 'publisher', `${where} source ${i + 1}`),
      url: requireString(s, 'url', `${where} source ${i + 1}`),
      accessed: String(s.accessed ?? ''),
      verified: s.verified === true
    })),
    quiz: quiz.map((q, i) => ({
      question: requireString(q, 'question', `${where} quiz ${i + 1}`),
      options: stringList(q, 'options'),
      answer: typeof q.answer === 'number' ? q.answer : -1,
      explanation: requireString(q, 'explanation', `${where} quiz ${i + 1}`)
    })),
    body: (match[2] ?? '').trim()
  }
}

export function parseLessonIndex(text: string): LessonCategory[] {
  return parseYaml(text) as LessonCategory[]
}

/** Citation numbers used in a lesson body, e.g. [^1] [^2] -> [1, 2]. */
export function citationsInBody(body: string): number[] {
  const withoutCode = body.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '')
  return [...new Set([...withoutCode.matchAll(/\[\^(\d+)\]/g)].map((m) => Number(m[1])))]
}
