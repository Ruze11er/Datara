import { runPython } from '../engines/python/pythonEngine'
import { runSql } from '../engines/sql/sqlEngine'
import { EngineTimeoutError } from '../engines/workerClient'
import { cases, loadCaseDatasets } from '../content'
import { compareWithLeads, sqlAttempt } from '../features/academy/caseEngine'

// Quick health checks for the app's engines. Shown in Settings, and run
// automatically by `npm run selftest` against the built app.

export interface CheckResult {
  name: string
  ok: boolean
  detail: string
  ms: number
}

const SAMPLE_TABLE = `
  CREATE TABLE sales (region TEXT, amount INTEGER);
  INSERT INTO sales VALUES ('North', 100), ('South', 250), ('North', 50);
`

async function timed(name: string, fn: () => Promise<string>): Promise<CheckResult> {
  const start = performance.now()
  try {
    const detail = await fn()
    return { name, ok: true, detail, ms: Math.round(performance.now() - start) }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return { name, ok: false, detail, ms: Math.round(performance.now() - start) }
  }
}

function expect(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

export const engineChecks: { name: string; run: () => Promise<CheckResult> }[] = [
  {
    name: 'SQL engine runs a query',
    run: () =>
      timed('SQL engine runs a query', async () => {
        const res = await runSql({
          dataset: { id: 'engine-check', setupSql: SAMPLE_TABLE },
          sql: 'SELECT region, SUM(amount) AS total FROM sales GROUP BY region ORDER BY region'
        })
        expect(JSON.stringify(res.rows) === '[["North",150],["South",250]]', `Unexpected result: ${JSON.stringify(res.rows)}`)
        const version = await runSql({ sql: 'SELECT sqlite_version()' })
        return `SQLite ${version.rows[0]?.[0]}: totals by region are correct`
      })
  },
  {
    name: 'SQL engine stops runaway queries',
    run: () =>
      timed('SQL engine stops runaway queries', async () => {
        const endless = 'WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM n) SELECT COUNT(*) FROM n'
        const stopped = await runSql({ sql: endless }).then(
          () => false,
          (err) => err instanceof EngineTimeoutError
        )
        expect(stopped, 'An endless query was not stopped')
        const after = await runSql({ sql: 'SELECT 1 + 1' })
        expect(after.rows[0]?.[0] === 2, 'The SQL engine did not recover after being stopped')
        return 'Endless query stopped, and the engine recovered'
      })
  },
  {
    // Runs after the runaway-query check on purpose: that restarts the SQL worker, so this also checks that a
    // large case dataset is sent again to the new worker.
    name: 'Academy case data and lead checks',
    run: () =>
      timed('Academy case data and lead checks', async () => {
        const c = cases[0]
        if (!c) throw new Error('No Academy case found')
        const datasets = await loadCaseDatasets(c)
        const lead = c.leads[0]!
        const sql = lead.sql.solutions[0]!.query
        const result = await runSql({ sql, dataset: datasets.practice })
        const solved = await compareWithLeads(c, datasets, sqlAttempt(datasets, sql, result), [lead], lead)
        expect(solved[0]?.kind === 'cracked', `The reference answer did not crack the lead "${lead.title}"`)

        // The same numbers typed in must fail on the hidden data.
        const literal = (v: unknown) =>
          v === null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replaceAll("'", "''")}'`
        const typed = result.rows.map((row) => `SELECT ${row.map(literal).join(', ')}`).join(' UNION ALL ')
        const typedResult = await runSql({ sql: typed, dataset: datasets.practice })
        const caught = await compareWithLeads(c, datasets, sqlAttempt(datasets, typed, typedResult), [lead], lead)
        expect(caught[0]?.kind === 'almost', 'A typed-in answer was not caught by the hidden data')

        // Each query gets a fresh copy of the data, so destructive statements change nothing.
        await runSql({ sql: 'DROP TABLE orders', dataset: datasets.practice })
        const after = await runSql({ sql: 'SELECT COUNT(*) FROM orders', dataset: datasets.practice })
        const orders = Number(after.rows[0]?.[0])
        expect(orders > 0, 'DROP TABLE changed the case data')
        return `Case #${c.number}: ${orders.toLocaleString()} orders; a correct query cracks a lead, a typed-in answer is caught, DROP TABLE changes nothing`
      })
  },
  {
    name: 'Python engine runs pandas (offline)',
    run: () =>
      timed('Python engine runs pandas (offline)', async () => {
        const res = await runPython(
          [
            'import sys',
            'import pandas as pd',
            'df = pd.DataFrame({"region": ["North", "South", "North"], "amount": [100, 250, 50]})',
            'print(df.groupby("region")["amount"].sum().to_dict())',
            'f"Python {sys.version.split()[0]}, pandas {pd.__version__}"'
          ].join('\n')
        )
        expect(res.output.includes("{'North': 150, 'South': 250}"), `Unexpected output: ${res.output}`)
        return `${res.value}: totals by region are correct`
      })
  },
  {
    name: 'Python engine stops endless loops',
    run: () =>
      timed('Python engine stops endless loops', async () => {
        const stopped = await runPython('while True:\n    pass').then(
          () => false,
          (err) => err instanceof EngineTimeoutError
        )
        expect(stopped, 'An endless loop was not stopped')
        const after = await runPython('1 + 1')
        expect(after.value === '2', 'The Python engine did not recover after being stopped')
        return 'Endless loop stopped, and the engine recovered'
      })
  },
  {
    name: 'Internet access is blocked',
    run: () =>
      timed('Internet access is blocked', async () => {
        const reached = await fetch('https://cdn.jsdelivr.net/').then(
          () => true,
          () => false
        )
        expect(!reached, 'The page was able to reach the internet')
        return 'Pages and code cannot contact websites'
      })
  }
]

export async function runAllChecks(): Promise<{ ok: boolean; results: CheckResult[] }> {
  const results: CheckResult[] = []
  for (const check of engineChecks) results.push(await check.run())
  return { ok: results.every((r) => r.ok), results }
}
