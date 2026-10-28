# Datara: agreed plan

Agreed 2026-10-28.

## Decisions

| Topic | Decision |
|---|---|
| Interface | React + TypeScript + Tailwind, in Electron (electron-vite) |
| Code editor | CodeMirror 6 |
| SQL engine | sql.js (SQLite in WebAssembly), fresh in-memory database for every run |
| Python engine | Pyodide (CPython in WebAssembly) with pandas, bundled for offline use |
| Progress | One JSON file in the app-data folder, written safely by the main process |
| MVP | SQL Lab first; Python Lab in Phase 2 |
| Unlocking | Chapter-based: finish a chapter to unlock the next |
| Content | Claude drafts lessons and levels; the owner reviews them |
| Platform | Windows only (NSIS installer) for now |
| Web version | Possible later as a static site; the code is kept web-ready |

## Phases

| Phase | Scope | Status |
|---|---|---|
| 0. Foundation | Project setup, security, sidebar shell, installer, offline engine checks | Done |
| 1. MVP | SQL Lab (editor, table browser, Run/Check, feedback, hints, stars, autosave), SQL chapters 1–3 (30 levels), 12 lessons, progress, Dashboard, Settings (backup/restore/reset) | Built; content awaiting owner review |
| 2. Python Lab | Python checker (variables + output, hidden-data variants), Variables panel, DataFrame display, Python chapters 1–3 (30 levels), 8 Python lessons | Built; content awaiting owner review |
| 3. Content | SQL to 100 levels, pandas chapters, statistics/spreadsheets/storytelling lessons, quizzes | Built; content awaiting owner review. Batches: (1) SQL ch. 4–6 + 4 lessons: built; (2) SQL ch. 7–8 + 5 lessons: built; (3) SQL ch. 9–10 + 3 lessons: built (SQL Lab complete at 100 levels); (4a) Python ch. 4–5 (functions, cleaning) + 2 lessons: built; (4b) Python ch. 6–7 (pandas) + 4 lessons: built (Python Lab complete at 70 levels); (5) statistics (4), spreadsheets (3), storytelling (3) lessons: built. Totals: 100 SQL levels, 70 Python levels, 48 lessons |
| 4. Extras | Playground, full Progress page, review queue, dark mode, hidden-test datasets for SQL (catch hard-coded answers, as Python variants already do), charts, notes | In progress, in batches: (1) hidden SQL test shop + tie detection in verify: built; (2) Playground (SQL + Python with shop CSVs) and spaced review queue: built; (3) dark mode + Progress page activity (streaks, calendar, recently completed): built |
| 5. Web (optional) | Static website build with browser storage | |

## SQL roadmap (100 levels, 10 chapters; level 10, 20, … are milestone "boss" levels)

1. SELECT, columns, aliases, DISTINCT, simple WHERE
2. AND/OR, IN, BETWEEN, LIKE, IS NULL, ORDER BY, LIMIT
3. COUNT/SUM/AVG/MIN/MAX, ROUND, calculated columns
4. GROUP BY, HAVING
5. INNER JOIN, joining three tables
6. LEFT JOIN, finding missing matches, joins + aggregation
7. CASE, COALESCE, string and date functions
8. Subqueries and CTEs
9. Window functions (ROW_NUMBER, RANK, running totals, LAG)
10. Business cases (top-N per group, month-over-month growth, retention, funnels)

## Python roadmap (about 70 levels, 7 chapters)

Variables and types → lists and dicts → conditions and loops → functions and
string cleaning → lists of records → pandas I (select, filter, sort, describe) →
pandas II (missing values, groupby, merge, new columns).

## Answer checking

- **SQL:** run the learner's query and the reference solution on identical fresh
  databases and compare results (columns, rows, values; order only when the task
  asks for sorting). Any correct query passes. Feedback explains the difference.
- **Python:** hidden checks inspect the variables/DataFrames the learner created.
- **Hints:** three levels (nudge → concept → near-solution), then the solution.
- **Stars:** 3 = no hints, 2 = used hints, 1 = viewed the solution.

## Lesson citations

Every lesson cites its sources: numbered markers in the text plus a Sources list
(title, publisher, URL, date accessed, verified flag). Preferred sources: official
documentation (SQLite, PostgreSQL, Python, pandas), free textbooks (OpenIntro
Statistics, *Python for Data Analysis*), and peer-reviewed papers. Each source is
checked against the live page before it ships. Our own worked examples on the
practice dataset are not cited. A content-check script will fail the build if a
citation marker has no matching source.

## Known caveats

- The practice database is SQLite, which differs slightly from the SQL used at
  many jobs (e.g. date functions). Lessons point this out.
- The installer is not code-signed. With **Smart App Control** turned on (it is on
  this PC), Windows blocks unsigned programs outright, so the installed app may not
  start. Options: turn Smart App Control off, sign the app with a trusted
  certificate (e.g. Azure Trusted Signing), or run it with `npm start`.
  With Smart App Control off, SmartScreen instead shows a warning on first install
  ("More info" → "Run anyway").
- The app currently uses the default Electron icon; a Datara icon is still needed.
