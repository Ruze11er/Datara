// Launches the built app hidden, runs the engine checks inside it, and prints
// the results. Usage:
//   npm run selftest               -> tests the build in ./out (run `npm run build` first)
//   npm run selftest -- --packaged -> tests the installed-style app in ./dist/win-unpacked

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const packaged = process.argv.includes('--packaged')
const outFile = join(tmpdir(), `datara-selftest-${process.pid}.json`)

let command, args
if (packaged) {
  command = join(root, 'dist', 'win-unpacked', 'Datara.exe')
  args = []
  if (!existsSync(command)) throw new Error('Packaged app not found. Run `npm run dist` first.')
} else {
  command = createRequire(import.meta.url)('electron')
  args = [root]
  if (!existsSync(join(root, 'out', 'main', 'index.js'))) throw new Error('Build not found. Run `npm run build` first.')
}

const env = { ...process.env, DATARA_SELFTEST: '1', DATARA_SELFTEST_OUT: outFile }
delete env.ELECTRON_RENDERER_URL
// Set by VS Code's terminal; it would start Electron as plain Node.js.
delete env.ELECTRON_RUN_AS_NODE

const code = await new Promise((resolve) => {
  const child = spawn(command, args, { env, stdio: 'inherit' })
  const timer = setTimeout(() => child.kill(), 180_000)
  child.on('exit', (c) => {
    clearTimeout(timer)
    resolve(c ?? 1)
  })
})

if (!existsSync(outFile)) {
  console.error(`Self-test produced no results (exit code ${code}).`)
  process.exit(1)
}
const report = JSON.parse(await readFile(outFile, 'utf8'))
await rm(outFile, { force: true })

console.log(`\nDatara self-test (${packaged ? 'packaged app' : 'build in ./out'})`)
for (const r of report.results ?? []) {
  console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.name}  (${(r.ms / 1000).toFixed(1)} s)\n        ${r.detail}`)
}
if (report.error) console.log(`  ERROR ${report.error}`)
console.log(report.ok ? '\nAll checks passed.' : '\nSome checks failed.')
process.exit(report.ok ? 0 : 1)
