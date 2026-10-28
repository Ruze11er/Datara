import { useMemo, type MouseEvent } from 'react'
import { Marked, type TokenizerAndRendererExtension } from 'marked'

// Lesson and level text is written in Markdown. Citations are written as [^1]
// and rendered as small numbered buttons that scroll to the Sources list.

const citation: TokenizerAndRendererExtension = {
  name: 'citation',
  level: 'inline',
  start: (src) => src.indexOf('[^'),
  tokenizer(src) {
    const match = /^\[\^(\d+)\]/.exec(src)
    if (match) return { type: 'citation', raw: match[0], n: Number(match[1]) }
    return undefined
  },
  renderer: (token) =>
    `<sup class="cite"><button type="button" data-cite="${token.n}" aria-label="Source ${token.n}">[${token.n}]</button></sup>`
}

const marked = new Marked({ extensions: [citation], gfm: true })

function render(text: string): string {
  const html = marked.parse(text, { async: false })
  // Website links open in the normal browser (the app window never navigates away).
  return html.replace(/<a href="(https:\/\/[^"]+)"/g, '<a href="$1" target="_blank" rel="noreferrer"')
}

export function Markdown({ text, className = '' }: { text: string; className?: string }) {
  const html = useMemo(() => render(text), [text])

  function onClick(event: MouseEvent<HTMLDivElement>) {
    const target = (event.target as HTMLElement).closest('[data-cite]')
    if (!target) return
    event.preventDefault()
    const el = document.getElementById(`source-${target.getAttribute('data-cite')}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el?.classList.add('source-flash')
    window.setTimeout(() => el?.classList.remove('source-flash'), 1500)
  }

  return <div className={`prose-datara ${className}`} onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />
}
