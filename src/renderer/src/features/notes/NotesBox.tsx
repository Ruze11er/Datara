import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronRight, NotebookPen } from 'lucide-react'
import { useProgress } from '../../lib/ProgressContext'
import { withNote, type NoteKey } from '../../lib/notes'

const AUTOSAVE_MS = 600

/** A personal note on a lesson or level, saved automatically with the learner's progress. */
export function NotesBox({ noteKey }: { noteKey: NoteKey }) {
  const { progress, update } = useProgress()
  const saved = progress?.notes[noteKey]?.text ?? ''
  const [open, setOpen] = useState(saved !== '')
  const [text, setText] = useState(saved)
  const [status, setStatus] = useState<'saved' | 'typing'>('saved')
  const pending = useRef<string | null>(null)
  const timer = useRef<number | null>(null)

  const save = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
    const value = pending.current
    pending.current = null
    if (value === null) return
    update((p) => withNote(p, noteKey, value))
    setStatus('saved')
  }, [update, noteKey])

  // Save anything still pending when leaving the page.
  useEffect(() => () => save(), [save])

  const onChange = (value: string) => {
    setText(value)
    setStatus('typing')
    pending.current = value
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(save, AUTOSAVE_MS)
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-surface">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <NotebookPen size={15} className="text-brand-600" aria-hidden />
        My notes
        {!open && saved && <span className="truncate font-normal text-slate-400">· {saved.split('\n')[0]}</span>}
        <ChevronRight
          size={15}
          aria-hidden
          className={`ml-auto shrink-0 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>
      {open && (
        <div className="border-t border-slate-100 px-3 pt-2 pb-2.5">
          <textarea
            value={text}
            onChange={(e) => onChange(e.target.value)}
            onBlur={save}
            rows={5}
            aria-label="My notes"
            placeholder="What did you learn? A tip for yourself, or a question to come back to."
            className="w-full resize-y rounded-md border border-slate-200 bg-surface px-2.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
          />
          <div className="mt-1 flex justify-between text-xs text-slate-400">
            <span>Only on this computer, saved with your progress.</span>
            <span aria-live="polite">{status === 'typing' ? 'Saving…' : text.trim() ? 'Saved' : ''}</span>
          </div>
        </div>
      )}
    </section>
  )
}
