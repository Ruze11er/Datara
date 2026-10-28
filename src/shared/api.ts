// The only functions the interface can call in the main process.
// Exposed by the preload script as `window.datara` (desktop build only).

export interface DataraDesktopApi {
  progress: {
    /** Returns null when no progress has been saved yet. */
    load(): Promise<unknown | null>
    save(data: unknown): Promise<void>
  }
}

export const IPC = {
  progressLoad: 'progress:load',
  progressSave: 'progress:save'
} as const
