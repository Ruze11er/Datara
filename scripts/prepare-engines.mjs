// Copies the SQL (sql.js) and Python (Pyodide) engines into the renderer's
// public folder so the app works fully offline. Pyodide's extra packages
// (pandas and its dependencies) are not on npm, so they are downloaded once
// from the official Pyodide CDN and checked against the lock file's SHA-256.
// Safe to run repeatedly: files that are already present and valid are skipped.

import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = join(root, 'src', 'renderer', 'public')
const nodeModules = join(root, 'node_modules')

// Python packages to bundle. Their dependencies are added automatically.
const PYTHON_PACKAGES = ['pandas']

const exists = async (p) => !!(await stat(p).catch(() => null))
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex')

async function copyAll(fromDir, toDir, files) {
  await mkdir(toDir, { recursive: true })
  for (const f of files) await copyFile(join(fromDir, f), join(toDir, f))
}

async function prepareSqlJs() {
  await copyAll(join(nodeModules, 'sql.js', 'dist'), join(publicDir, 'sqljs'), [
    'sql-wasm.wasm',
    'sql-wasm-browser.wasm'
  ])
  console.log('[engines] sql.js ready')
}

function resolveDeps(lock, names) {
  const seen = new Set()
  const visit = (name) => {
    if (seen.has(name)) return
    const pkg = lock.packages[name]
    if (!pkg) throw new Error(`Pyodide package not found in lock file: ${name}`)
    seen.add(name)
    pkg.depends.forEach(visit)
  }
  names.forEach(visit)
  return [...seen].map((n) => lock.packages[n])
}

async function preparePyodide() {
  const src = join(nodeModules, 'pyodide')
  const out = join(publicDir, 'pyodide')
  await copyAll(src, out, [
    'pyodide.mjs',
    'pyodide.asm.mjs',
    'pyodide.asm.wasm',
    'python_stdlib.zip',
    'pyodide-lock.json'
  ])

  const { version } = JSON.parse(await readFile(join(src, 'package.json'), 'utf8'))
  const lock = JSON.parse(await readFile(join(src, 'pyodide-lock.json'), 'utf8'))
  const cdn = `https://cdn.jsdelivr.net/pyodide/v${version}/full/`

  for (const pkg of resolveDeps(lock, PYTHON_PACKAGES)) {
    const target = join(out, pkg.file_name)
    if ((await exists(target)) && sha256(await readFile(target)) === pkg.sha256) continue

    console.log(`[engines] downloading ${pkg.file_name}`)
    const res = await fetch(cdn + pkg.file_name)
    if (!res.ok) throw new Error(`Download failed (${res.status}) for ${pkg.file_name}`)
    const buf = Buffer.from(await res.arrayBuffer())
    if (sha256(buf) !== pkg.sha256) throw new Error(`Checksum mismatch for ${pkg.file_name}`)
    await writeFile(target, buf)
  }
  console.log(`[engines] Pyodide ${version} ready (Python ${lock.info.python}, packages: ${PYTHON_PACKAGES.join(', ')})`)
}

await prepareSqlJs()
await preparePyodide()
