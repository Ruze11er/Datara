// Remembers the window's size, position, and maximized / full-screen state between launches.
// Stored in window-state.json next to progress.json (in the app's userData folder).

import { app, screen, type BrowserWindow, type Rectangle } from 'electron'
import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export interface WindowState {
  bounds?: Rectangle
  maximized: boolean
  fullScreen: boolean
}

const file = () => join(app.getPath('userData'), 'window-state.json')

/** The first launch opens maximized, so the app fills the screen. */
const FIRST_LAUNCH: WindowState = { maximized: true, fullScreen: false }

/** True if at least part of the rectangle is on a connected screen (a monitor may have been unplugged). */
function isVisible(bounds: Rectangle): boolean {
  return screen.getAllDisplays().some(({ workArea: a }) => {
    const overlapX = Math.min(bounds.x + bounds.width, a.x + a.width) - Math.max(bounds.x, a.x)
    const overlapY = Math.min(bounds.y + bounds.height, a.y + a.height) - Math.max(bounds.y, a.y)
    return overlapX >= 100 && overlapY >= 50
  })
}

export function loadWindowState(): WindowState {
  try {
    const raw = JSON.parse(readFileSync(file(), 'utf8')) as Partial<WindowState>
    const b = raw.bounds
    const bounds =
      b && [b.x, b.y, b.width, b.height].every((n) => typeof n === 'number' && Number.isFinite(n)) && isVisible(b)
        ? b
        : undefined
    return { bounds, maximized: raw.maximized === true, fullScreen: raw.fullScreen === true }
  } catch {
    return FIRST_LAUNCH
  }
}

/**
 * Saves the state whenever the window closes. The normal size and the maximized flag are tracked
 * separately and ignore changes made while in full screen, so leaving full screen next time returns to
 * the window the learner had before (e.g. maximized), not a copy of the full-screen size.
 */
export function trackWindowState(win: BrowserWindow, initial: WindowState): void {
  let maximized = initial.maximized
  let normalBounds = initial.bounds ?? win.getBounds()
  const inNormalState = () => !win.isFullScreen() && !win.isMaximized() && !win.isMinimized()

  win.on('maximize', () => {
    if (!win.isFullScreen()) maximized = true
  })
  win.on('unmaximize', () => {
    if (!win.isFullScreen()) maximized = false
  })
  const rememberBounds = () => {
    if (inNormalState()) normalBounds = win.getBounds()
  }
  win.on('resize', rememberBounds)
  win.on('move', rememberBounds)

  win.on('close', () => {
    const fullScreen = win.isFullScreen()
    const state: WindowState = {
      bounds: normalBounds,
      maximized: fullScreen ? maximized : win.isMaximized(),
      fullScreen
    }
    try {
      const tmp = `${file()}.tmp`
      writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8')
      renameSync(tmp, file())
    } catch {
      // Not important enough to bother the learner about; the window just opens with defaults next time.
    }
  })
}
