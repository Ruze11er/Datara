// Generates the datasets for Data Detective Academy cases into content/datasets/cases/.
// Each case has a module in scripts/case-data/ exporting `datasets` (file, title, settings) and `build(settings)`.
// Every case has a practice dataset (what learners investigate) and a hidden one (same story and tables,
// different numbers) used only to check answers, so typed-in values fail.
//
// Seeded, so it always produces exactly the same data. The story each case tells is checked by its
// `assertions` in content/cases/<id>/case.yaml: run `npm run verify` after any change.

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { toSql } from './case-data/tools.mjs'
import * as missingRevenue from './case-data/missing-revenue.mjs'

const CASES = [missingRevenue]

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'content', 'datasets', 'cases')
await mkdir(outDir, { recursive: true })

for (const c of CASES) {
  for (const { file, title, settings } of c.datasets) {
    const tables = c.build(settings)
    const sql = toSql(title, tables)
    await writeFile(join(outDir, file), sql, 'utf8')
    const counts = tables.map((t) => `${t.rows.length} ${t.name}`).join(', ')
    console.log(`[case-data] ${file} (${(sql.length / 1e6).toFixed(2)} MB): ${counts}`)
  }
}
