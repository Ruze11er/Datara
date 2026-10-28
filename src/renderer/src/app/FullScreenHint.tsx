import { useEffect, useState } from 'react'
import { useFullScreen } from '../lib/fullScreen'

const SHOW_MS = 2500

/**
 * A short "Press F11 to exit" note whenever the app goes full screen, including when it reopens in full
 * screen, so there's always an obvious way out.
 */
export function FullScreenHint() {
  const { fullScreen } = useFullScreen()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!fullScreen) {
      setVisible(false)
      return
    }
    setVisible(true)
    const timer = window.setTimeout(() => setVisible(false), SHOW_MS)
    return () => window.clearTimeout(timer)
  }, [fullScreen])

  if (!visible) return null
  return (
    <div
      role="status"
      className="pointer-events-none fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-code px-4 py-2 text-sm text-code-fg shadow-lg"
    >
      Full screen. Press <kbd className="rounded border border-white/30 px-1.5 font-sans text-xs">F11</kbd> to exit.
    </div>
  )
}
