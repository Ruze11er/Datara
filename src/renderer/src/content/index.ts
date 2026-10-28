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
import storeHiddenSql from '@content/datasets/store-hidden.sql?raw'
import caseIndexText from '@content/cases/index.yaml?raw'
import { parse as parseYaml } from 'yaml'
import { parseCase } from '@shared/cases/parse'
import type { CaseDef } from '@shared/cases/types'
import type { SqlDataset } from '../engines/sql/types'

// ---------- Practice database ----------

export const STORE_DATASET = { id: 'store', setupSql: storeSql }
/** Same tables, different data. Only used to check answers (see checkHiddenResult). */
export const STORE_HIDDEN_DATASET = { id: 'store-hidden', setupSql: storeHiddenSql }

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

// ---------- Data Detective Academy cases ----------

const caseFiles = import.meta.glob<string>('@content/cases/*/case.yaml', { query: '?raw', import: 'default', eager: true })
const leadFiles = import.meta.glob<string>('@content/cases/*/leads.yaml', { query: '?raw', import: 'default', eager: true })
// Case datasets are a few MB each, so they are not bundled into the app's main code: each is loaded when its case opens.
const caseDatasetFiles = import.meta.glob<string>('@content/datasets/cases/*.sql', { query: '?raw', import: 'default' })

const fileIn = <T>(files: Record<string, T>, suffix: string): T | undefined =>
  Object.entries(files).find(([path]) => path.endsWith(suffix))?.[1]

/** Every case, in play order (content/cases/index.yaml). */
export const cases: CaseDef[] = (parseYaml(caseIndexText) as string[]).flatMap((id) => {
  const caseText = fileIn(caseFiles, `/cases/${id}/case.yaml`)
  const leadsText = fileIn(leadFiles, `/cases/${id}/leads.yaml`)
  return caseText && leadsText ? [parseCase(caseText, leadsText, `case ${id}`)] : []
})

const casesById = new Map(cases.map((c) => [c.id, c]))
export const getCase = (id: string): CaseDef | undefined => casesById.get(id)

export interface CaseDatasets {
  /** What the learner investigates. */
  practice: SqlDataset
  /** Same tables, different numbers: only used to confirm answers, so typed-in values fail. */
  hidden: SqlDataset
}

const loadedDatasets = new Map<string, Promise<CaseDatasets>>()

/** Loads a case's practice and hidden datasets (once). */
export function loadCaseDatasets(c: CaseDef): Promise<CaseDatasets> {
  let loading = loadedDatasets.get(c.id)
  if (!loading) {
    const load = async (file: string, id: string): Promise<SqlDataset> => {
      const loader = fileIn(caseDatasetFiles, `/datasets/${file}`)
      if (!loader) throw new Error(`The data for this case (${file}) is missing.`)
      return { id, setupSql: await loader() }
    }
    loading = Promise.all([load(c.dataset.file, c.dataset.id), load(c.dataset.hiddenFile, `${c.dataset.id}-hidden`)])
      .then(([practice, hidden]) => ({ practice, hidden }))
      .catch((err) => {
        loadedDatasets.delete(c.id)
        throw err
      })
    loadedDatasets.set(c.id, loading)
  }
  return loading
}
