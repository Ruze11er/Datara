// The learner's own notes on lessons and levels.

import type { ProgressData } from '@shared/progress'
import { getLesson, labs, type LabId } from '../content'

export type NoteKey = `lesson:${string}` | `${LabId}:${string}`

export const lessonNoteKey = (lessonId: string): NoteKey => `lesson:${lessonId}`
export const levelNoteKey = (lab: LabId, levelId: string): NoteKey => `${lab}:${levelId}`

/** Returns progress with one note saved (or removed, when the text is blank). */
export function withNote(p: ProgressData, key: NoteKey, text: string): ProgressData {
  const notes = { ...p.notes }
  if (text.trim() === '') delete notes[key]
  else notes[key] = { text, updatedAt: new Date().toISOString() }
  return { ...p, notes }
}

export interface NoteEntry {
  key: string
  /** "Lesson", "SQL Lab", "Python Lab" */
  source: string
  title: string
  href: string
  text: string
  updatedAt: string
}

/** Every note, newest first, with a title and link for where it was written. */
export function allNotes(progress: ProgressData | null): NoteEntry[] {
  const entries: NoteEntry[] = []
  for (const [key, note] of Object.entries(progress?.notes ?? {})) {
    const [kind, id = ''] = key.split(/:(.*)/s)
    if (kind === 'lesson') {
      const lesson = getLesson(id)
      if (lesson) entries.push({ key, source: 'Lesson', title: lesson.title, href: `/learn/${id}`, ...note })
      continue
    }
    const lab = labs.find((l) => l.id === kind)
    const level = lab?.levels.find((l) => l.id === id)
    if (lab && level) {
      entries.push({ key, source: lab.name, title: `Level ${level.number}: ${level.title}`, href: `${lab.path}/${id}`, ...note })
    }
  }
  return entries.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0))
}
