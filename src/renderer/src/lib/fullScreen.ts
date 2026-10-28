// Full screen: the desktop window (via the preload API), or the browser's Fullscreen API in a web build.

import { useCallback, useEffect, useState } from 'react'

const desktop = window.datara?.window

export function useFullScreen(): { fullScreen: boolean; toggle: () => void } {
  const [fullScreen, setFullScreen] = useState(false)

  useEffect(() => {
    if (desktop) {
      let alive = true
      void desktop.isFullScreen().then((v) => alive && setFullScreen(v))
      const stop = desktop.onFullScreenChange(setFullScreen)
      return () => {
        alive = false
        stop()
      }
    }
    const onChange = () => setFullScreen(document.fullscreenElement !== null)
    onChange()
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggle = useCallback(() => {
    if (desktop) {
      void desktop.toggleFullScreen().then(setFullScreen)
    } else if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void document.documentElement.requestFullscreen().catch(() => undefined)
    }
  }, [])

  return { fullScreen, toggle }
}
