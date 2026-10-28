import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'
import { basicSetup } from 'codemirror'
import { Compartment, EditorState, Prec, type Extension } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { indentWithTab } from '@codemirror/commands'
import { HighlightStyle, indentUnit, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
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

// Colours come from CSS variables (styles.css), so the editor follows the light/dark theme
// without being rebuilt.
const editorTheme = EditorView.theme({
  '&': { height: '100%', backgroundColor: 'var(--color-surface)', color: 'var(--color-slate-800)' },
  '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.6' },
  '.cm-content': { padding: '12px 0', caretColor: 'var(--color-slate-900)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--color-slate-900)' },
  '.cm-gutters': {
    backgroundColor: 'var(--color-slate-50)',
    borderRight: '1px solid var(--color-slate-200)',
    color: 'var(--color-slate-400)'
  },
  '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--color-brand-50) 50%, transparent)' },
  '.cm-activeLineGutter': { backgroundColor: 'var(--color-brand-50)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'color-mix(in srgb, var(--color-brand-500) 30%, transparent)'
  },
  '.cm-matchingBracket, &.cm-focused .cm-matchingBracket': {
    backgroundColor: 'color-mix(in srgb, var(--color-brand-500) 25%, transparent)',
    outline: 'none'
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-slate-200)',
    color: 'var(--color-slate-800)'
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--color-brand-600)',
    color: '#ffffff'
  },
  '.cm-panels': { backgroundColor: 'var(--color-slate-50)', color: 'var(--color-slate-800)' },
  '&.cm-focused': { outline: 'none' }
})

const highlightStyle = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.definitionKeyword, t.moduleKeyword], color: 'var(--syn-keyword)' },
  { tag: [t.string, t.special(t.string)], color: 'var(--syn-string)' },
  { tag: [t.number, t.bool, t.null, t.atom], color: 'var(--syn-number)' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: 'var(--syn-comment)', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: 'var(--syn-function)' },
  { tag: [t.operator, t.punctuation], color: 'var(--syn-operator)' },
  { tag: [t.typeName, t.className, t.standard(t.name)], color: 'var(--syn-type)' }
])

const fontTheme = (size: number) => EditorView.theme({ '&': { fontSize: `${size}px` } })

function languageSupport(language: 'sql' | 'python', schema?: Record<string, string[]>): Extension {
  if (language === 'python') {
    // Python code is indented with 4 spaces.
    return [python(), indentUnit.of('    '), EditorState.tabSize.of(4)]
  }
  // Long one-line queries wrap instead of scrolling sideways. (Python is left unwrapped so
  // indentation stays easy to read.)
  return [sql({ dialect: SQLite, schema, upperCaseKeywords: true }), EditorView.lineWrapping]
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
          syntaxHighlighting(highlightStyle),
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
