import { useState } from 'react'
import { Link } from 'react-router'
import { NotebookPen, Search } from 'lucide-react'
import { Card, Page } from '../../components/Page'
import { allNotes } from '../../lib/notes'
import { useProgress } from '../../lib/ProgressContext'

export default function NotesPage() {
  const { progress } = useProgress()
  const [query, setQuery] = useState('')
  const notes = allNotes(progress)
  const q = query.trim().toLowerCase()
  const shown = q ? notes.filter((n) => `${n.title} ${n.text}`.toLowerCase().includes(q)) : notes

  return (
    <Page title="Notes" subtitle="Everything you've written in My notes on lessons and levels.">
      {notes.length === 0 ? (
        <Card className="text-center text-slate-500">
          <NotebookPen size={28} className="mx-auto text-slate-300" aria-hidden />
          <p className="mt-2">
            No notes yet. Open <b>My notes</b> on any lesson or level to write down what you learned.
          </p>
        </Card>
      ) : (
        <>
          <label className="mb-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-surface px-3 py-2">
            <Search size={16} className="text-slate-400" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your notes"
              aria-label="Search your notes"
              className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
          </label>
          {shown.length === 0 && <p className="text-sm text-slate-500">No notes match “{query}”.</p>}
          <ul className="space-y-3">
            {shown.map((note) => (
              <li key={note.key}>
                <Card>
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-xs font-medium text-brand-700">{note.source}</span>
                    <Link to={note.href} className="font-semibold text-slate-900 hover:underline">
                      {note.title}
                    </Link>
                    <span className="ml-auto text-xs text-slate-400">
                      {new Date(note.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <p className="mt-2 text-sm whitespace-pre-wrap text-slate-700">{note.text}</p>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </Page>
  )
}
