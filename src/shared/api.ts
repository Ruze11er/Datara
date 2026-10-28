// The only functions the interface can call in the main process.
// Exposed by the preload script as `window.datara` (desktop build only).

export interface DataraDesktopApi {
  progress: {
    /** Returns null when no progress has been saved yet. */
    load(): Promise<unknown | null>
    save(data: unknown): Promise<void>
    /** Asks where to save a backup copy. Returns false if the user cancelled. */
    exportBackup(data: unknown): Promise<boolean>
    /** Asks for a backup file to open. Returns null if the user cancelled. */
    importBackup(): Promise<unknown | null>
  }
  window: {
    isFullScreen(): Promise<boolean>
    /** Returns the new state: true when the window is now full screen. */
    toggleFullScreen(): Promise<boolean>
    /** Called whenever full screen turns on or off (also via F11). Returns a function that stops listening. */
    onFullScreenChange(listener: (fullScreen: boolean) => void): () => void
  }
}

export const IPC = {
  progressLoad: 'progress:load',
  progressSave: 'progress:save',
  progressExport: 'progress:export',
  progressImport: 'progress:import',
  windowIsFullScreen: 'window:is-full-screen',
  windowToggleFullScreen: 'window:toggle-full-screen',
  /** Main → interface notification. */
  windowFullScreenChanged: 'window:full-screen-changed'
} as const
