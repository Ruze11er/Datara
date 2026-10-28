import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'
import { basicSetup } from 'codemirror'
import { Compartment, EditorState, Prec, type Extension } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { indentWithTab } from '@codemirror/commands'
import { indentUnit } from '@codemirror/language'
import { sql, SQLite } from '@codemirror/lang-sql'
import { python } from '@codemirror/lang-python'

export interface CodeEditorHandle {
  setValue(text: string): void
  focus(): void
}

interface CodeEditorProps {
  language: 'sql' | 'python'
  initialValue: string
  onChange: (text: string) => void
  /** Ctrl+Enter */
  onRun: () => void
  /** Ctrl+Shift+Enter */
  onCheck: () => void
  /** SQL only: table name -> column names, for autocomplete. */
  schema?: Record<string, string[]>
  fontSize: number
  ref?: Ref<CodeEditorHandle>
}

const editorTheme = EditorView.theme({
  '&': { height: '100%', backgroundColor: '#ffffff' },
  '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.6' },
  '.cm-content': { padding: '12px 0' },
  '.cm-gutters': { backgroundColor: '#f8fafc', borderRight: '1px solid #e2e8f0', color: '#94a3b8' },
  '.cm-activeLine': { backgroundColor: '#f0fdfa80' },
  '.cm-activeLineGutter': { backgroundColor: '#f0fdfa' },
  '&.cm-focused': { outline: 'none' }
})

const fontTheme = (size: number) => EditorView.theme({ '&': { fontSize: `${size}px` } })

function languageSupport(language: 'sql' | 'python', schema?: Record<string, string[]>): Extension {
  if (language === 'python') {
    // Python code is indented with 4 spaces.
    return [python(), indentUnit.of('    '), EditorState.tabSize.of(4)]
  }
  return sql({ dialect: SQLite, schema, upperCaseKeywords: true })
}

export function CodeEditor({ language, initialValue, onChange, onRun, onCheck, schema, fontSize, ref }: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const fontCompartment = useRef(new Compartment())
  // Keep the latest callbacks without rebuilding the editor.
  const callbacks = useRef({ onChange, onRun, onCheck })
  callbacks.current = { onChange, onRun, onCheck }

  useEffect(() => {
    if (!host.current) return
    const shortcuts = Prec.highest(
      keymap.of([
        { key: 'Mod-Enter', run: () => (callbacks.current.onRun(), true) },
        { key: 'Shift-Mod-Enter', run: () => (callbacks.current.onCheck(), true) }
      ])
    )
    view.current = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: initialValue,
        extensions: [
          shortcuts,
          basicSetup,
          keymap.of([indentWithTab]),
          languageSupport(language, schema),
          editorTheme,
          fontCompartment.current.of(fontTheme(fontSize)),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) callbacks.current.onChange(update.state.doc.toString())
          })
        ]
      })
    })
    return () => view.current?.destroy()
    // Created once per mount on purpose; the parent remounts the editor for a new level.
  }, [])

  useEffect(() => {
    view.current?.dispatch({ effects: fontCompartment.current.reconfigure(fontTheme(fontSize)) })
  }, [fontSize])

  useImperativeHandle(ref, () => ({
    setValue(text: string) {
      const v = view.current
      if (v) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: text } })
    },
    focus() {
      view.current?.focus()
    }
  }))

  return <div ref={host} className="h-full overflow-hidden" />
}
