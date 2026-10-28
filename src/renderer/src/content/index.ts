// Loads all learning content (bundled into the app at build time).

import {
  parseLesson,
  parseLessonIndex,
  parsePythonLevel,
  parseSqlChapters,
  parseSqlLevel,
  type Chapter,
  type Lesson,
  type LessonCategory,
  type PythonLevel,
  type SqlLevel
} from '@shared/content'
import sqlChaptersText from '@content/sql-levels/chapters.yaml?raw'
import pythonChaptersText from '@content/python-levels/chapters.yaml?raw'
import lessonIndexText from '@content/lessons/index.yaml?raw'
import storeSql from '@content/datasets/store.sql?raw'

// ---------- Practice database ----------

export const STORE_DATASET = { id: 'store', setupSql: storeSql }

// ---------- Labs (SQL and Python share the same structure) ----------

export type LabId = 'sql' | 'python'

/** Fields every level has, whatever the lab. */
export type BaseLevel = Pick<SqlLevel, 'id' | 'title' | 'concepts' | 'lesson' | 'task' | 'solution' | 'hints' | 'explanation'>

export type Numbered<L> = L & {
  /** 1-based position across all chapters of the lab. */
  number: number
  chapterIndex: number
  isMilestone: boolean
}

export interface Lab<L extends BaseLevel = BaseLevel> {
  id: LabId
  name: string
  /** Route, e.g. "/sql" */
  path: string
  progressKey: 'sqlLevels' | 'pythonLevels'
  chapters: Chapter[]
  levels: Numbered<L>[]
  get(id: string): Numbered<L> | undefined
}

function buildLab<L extends BaseLevel>(
  base: Pick<Lab, 'id' | 'name' | 'path' | 'progressKey'>,
  chaptersText: string,
  levelTexts: Record<string, string>,
  parse: (text: string, where: string) => L
): Lab<L> {
  const byId = new Map<string, L>()
  for (const [path, text] of Object.entries(levelTexts)) {
    const level = parse(text, path)
    byId.set(level.id, level)
  }
  const chapters = parseSqlChapters(chaptersText).map((c) => ({ ...c, levels: c.levels.filter((id) => byId.has(id)) }))
  const levels: Numbered<L>[] = chapters.flatMap((chapter, chapterIndex) =>
    chapter.levels.map((id, i) => ({
      ...(byId.get(id) as L),
      chapterIndex,
      isMilestone: i === chapter.levels.length - 1,
      number: 0
    }))
  )
  levels.forEach((level, i) => (level.number = i + 1))
  const numbered = new Map(levels.map((l) => [l.id, l]))
  return { ...base, chapters, levels, get: (id) => numbered.get(id) }
}

export const sqlLab = buildLab<SqlLevel>(
  { id: 'sql', name: 'SQL Lab', path: '/sql', progressKey: 'sqlLevels' },
  sqlChaptersText,
  import.meta.glob<string>('@content/sql-levels/sql-*.yaml', { query: '?raw', import: 'default', eager: true }),
  parseSqlLevel
)

export const pythonLab = buildLab<PythonLevel>(
  { id: 'python', name: 'Python Lab', path: '/python', progressKey: 'pythonLevels' },
  pythonChaptersText,
  import.meta.glob<string>('@content/python-levels/py-*.yaml', { query: '?raw', import: 'default', eager: true }),
  parsePythonLevel
)

export const labs: Lab[] = [sqlLab, pythonLab]

/** Finds a level in any lab (used by lesson "Practice this" links). */
export function findLevel(id: string): { lab: Lab; level: Numbered<BaseLevel> } | undefined {
  for (const lab of labs) {
    const level = lab.get(id)
    if (level) return { lab, level }
  }
  return undefined
}

// Shorthands used by the SQL Lab.
export type NumberedLevel = Numbered<SqlLevel>
export const sqlChapters = sqlLab.chapters
export const sqlLevels = sqlLab.levels
export const getSqlLevel = sqlLab.get

// ---------- Lessons ----------

const lessonTexts = import.meta.glob<string>('@content/lessons/*.md', {
  query: '?raw',
  import: 'default',
  eager: true
})

const lessonsById = new Map<string, Lesson>()
for (const [path, text] of Object.entries(lessonTexts)) {
  const lesson = parseLesson(text, path)
  lessonsById.set(lesson.id, lesson)
}

export const lessonCategories: LessonCategory[] = parseLessonIndex(lessonIndexText)

export interface LessonPlace {
  lesson: Lesson
  category: LessonCategory
  moduleTitle: string
}

/** Lessons in reading order, with where they sit in the course. */
export const lessonsInOrder: LessonPlace[] = lessonCategories.flatMap((category) =>
  category.modules.flatMap((module) =>
    module.lessons
      .map((id) => lessonsById.get(id))
      .filter((l): l is Lesson => !!l)
      .map((lesson) => ({ lesson, category, moduleTitle: module.title }))
  )
)

const placeById = new Map(lessonsInOrder.map((p) => [p.lesson.id, p]))
export const getLessonPlace = (id: string): LessonPlace | undefined => placeById.get(id)
export const getLesson = (id: string): Lesson | undefined => lessonsById.get(id)
