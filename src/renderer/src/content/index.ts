// Loads all learning content (bundled into the app at build time).

import {
  parseLesson,
  parseLessonIndex,
  parseSqlChapters,
  parseSqlLevel,
  type Lesson,
  type LessonCategory,
  type SqlChapter,
  type SqlLevel
} from '@shared/content'
import chaptersText from '@content/sql-levels/chapters.yaml?raw'
import lessonIndexText from '@content/lessons/index.yaml?raw'
import storeSql from '@content/datasets/store.sql?raw'

// ---------- Practice database ----------

export const STORE_DATASET = { id: 'store', setupSql: storeSql }

// ---------- SQL levels ----------

export interface NumberedLevel extends SqlLevel {
  /** 1-based position across all chapters. */
  number: number
  chapterIndex: number
  isMilestone: boolean
}

const levelTexts = import.meta.glob<string>('@content/sql-levels/sql-*.yaml', {
  query: '?raw',
  import: 'default',
  eager: true
})

const levelsById = new Map<string, SqlLevel>()
for (const [path, text] of Object.entries(levelTexts)) {
  const level = parseSqlLevel(text, path)
  levelsById.set(level.id, level)
}

export const sqlChapters: SqlChapter[] = parseSqlChapters(chaptersText).map((c) => ({
  ...c,
  levels: c.levels.filter((id) => levelsById.has(id))
}))

export const sqlLevels: NumberedLevel[] = sqlChapters.flatMap((chapter, chapterIndex) =>
  chapter.levels.map((id, i) => ({
    ...(levelsById.get(id) as SqlLevel),
    chapterIndex,
    isMilestone: i === chapter.levels.length - 1,
    number: 0
  }))
)
sqlLevels.forEach((level, i) => (level.number = i + 1))

const numberedById = new Map(sqlLevels.map((l) => [l.id, l]))
export const getSqlLevel = (id: string): NumberedLevel | undefined => numberedById.get(id)

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
