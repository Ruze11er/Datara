import { app, BrowserWindow, dialog } from 'electron'
import { copyFile, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

// Progress is one JSON file in the user's app-data folder
// (e.g. C:\Users\<you>\AppData\Roaming\Datara\progress.json).
// Writes go to a temp file first and are then renamed into place, so a crash
// mid-write can never leave a half-written (corrupt) progress file.

const MAX_BYTES = 5 * 1024 * 1024

const progressPath = (): string => join(app.getPath('userData'), 'progress.json')

function isProgressLike(value: unknown): value is { version: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as { version?: unknown }).version === 'number'
  )
}

export async function loadProgress(): Promise<unknown | null> {
  const file = progressPath()
  let raw: string
  try {
    raw = await readFile(file, 'utf8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }

  try {
    const data: unknown = JSON.parse(raw)
    if (!isProgressLike(data)) throw new Error('Unexpected progress format')
    return data
  } catch {
    // Keep the unreadable file for recovery instead of silently overwriting it.
    const backup = file.replace(/\.json$/, `.corrupt-${Date.now()}.json`)
    await copyFile(file, backup).catch(() => undefined)
    return null
  }
}

let writeQueue: Promise<void> = Promise.resolve()

export function saveProgress(data: unknown): Promise<void> {
  if (!isProgressLike(data)) return Promise.reject(new Error('Refusing to save invalid progress data'))
  const json = JSON.stringify(data, null, 2)
  if (Buffer.byteLength(json) > MAX_BYTES) return Promise.reject(new Error('Progress data is too large'))

  // Run saves one at a time, in order.
  const task = writeQueue.then(() => writeAtomically(progressPath(), json))
  writeQueue = task.catch(() => undefined)
  return task
}

/** Saves a backup copy wherever the user chooses. Returns false if cancelled. */
export async function exportProgress(window: BrowserWindow | null, data: unknown): Promise<boolean> {
  if (!isProgressLike(data)) throw new Error('Nothing valid to export')
  const today = new Date().toISOString().slice(0, 10)
  const options = {
    title: 'Save a backup of your Datara progress',
    defaultPath: join(app.getPath('documents'), `datara-progress-${today}.json`),
    filters: [{ name: 'Datara progress backup', extensions: ['json'] }]
  }
  const result = window ? await dialog.showSaveDialog(window, options) : await dialog.showSaveDialog(options)
  if (result.canceled || !result.filePath) return false
  await writeFile(result.filePath, JSON.stringify(data, null, 2), 'utf8')
  return true
}

/** Reads a backup file the user picks. Returns null if cancelled. Throws if the file isn't a backup. */
export async function importProgress(window: BrowserWindow | null): Promise<unknown | null> {
  const options = {
    title: 'Open a Datara progress backup',
    properties: ['openFile' as const],
    filters: [{ name: 'Datara progress backup', extensions: ['json'] }]
  }
  const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options)
  const file = result.filePaths[0]
  if (result.canceled || !file) return null
  const raw = await readFile(file, 'utf8')
  if (Buffer.byteLength(raw) > MAX_BYTES) throw new Error('That file is too large to be a Datara backup.')
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error('That file is not a Datara backup (it is not valid JSON).')
  }
  if (!isProgressLike(data)) throw new Error('That file is not a Datara backup.')
  return data
}

async function writeAtomically(file: string, contents: string): Promise<void> {
  const temp = `${file}.tmp`
  await writeFile(temp, contents, 'utf8')
  // On Windows, antivirus or indexing can briefly lock the file; retry a few times.
  for (let attempt = 0; ; attempt++) {
    try {
      await rename(temp, file)
      return
    } catch (err) {
      if (attempt >= 4) throw err
      await new Promise((r) => setTimeout(r, 50 * (attempt + 1)))
    }
  }
}
