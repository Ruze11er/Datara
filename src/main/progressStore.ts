import { app } from 'electron'
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
