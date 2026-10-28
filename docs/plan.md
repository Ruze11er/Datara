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
| 4. Extras | Playground, full Progress page, review queue, dark mode, hidden-test datasets for SQL (catch hard-coded answers, as Python variants already do), charts, notes | Built; awaiting owner review. Batches: (1) hidden SQL test shop + tie detection in verify: built; (2) Playground (SQL + Python with shop CSVs) and spaced review queue: built; (3) dark mode + Progress page activity (streaks, calendar, recently completed): built; (4) Table/Chart view for results + personal notes with a Notes page: built |
| 5. Web (optional) | Static website build with browser storage | |
| 6. Data Detective Academy | Investigation game: cases built from leads, evidence, a detective board, a verdict and a debrief, plus XP, ranks and achievements (see below) | In progress. M1 (case engine, Case #001 data, verify checks): built; M2 (Academy page, case file with Briefing, Field Manual, Evidence Room and Investigation Lab, lead matching, evidence, autosave): built; M3 (Detective Board, Verdict with pushback, Case Closed debrief, Python mode in the lab): built |

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

## Data Detective Academy (Phase 6)

Agreed 2026-10-28. A new "Academy" area where the learner solves business mysteries with SQL and Python.

**Loop:** Briefing → Field Manual (short concept cards linking to cited lessons) → Evidence Room (tables with
descriptions, documents) → Investigation Lab → Detective Board → Verdict (with stakeholder pushback) → Case Closed
(debrief + rewards). Investigation is non-linear: every query run is compared with all open **leads**; a match
cracks the lead, creates an evidence card from the learner's own result, and can unlock new leads or documents.

| Topic | Decision |
|---|---|
| Grading | Results, never text. Leads use the SQL checker (plus hidden data); reasoning is graded through structured actions (board links, verdict choices, pushback). The written summary is self-checked against a model answer |
| Case rating | 0–100 from evidence (20), data quality (10), reasoning (20), verdict (25), recommendation (15), limitations (10). Distinguished ≥ 90, Solid ≥ 70, Provisional ≥ 50 |
| Hints | Never lower the rating; they only affect the "Unassisted" medal and bonus XP |
| XP | Derived from progress (lab levels, lessons and cases count, retroactively). Rank promotions also require closing cases |
| Unlocking | Case #001 is open from day one ("recommended training" note); later cases unlock by closing the previous one |
| Tone | Serious detective noir for the story; tasks, hints and explanations stay plain and beginner-friendly |
| Look | Case-file style inside the existing design system (follows light/dark). Sound off by default; Motion setting |
| Data | Each case has its own seeded dataset plus a hidden variant (`content/datasets/cases/`), generated by `scripts/generate-case-data.mjs`. Story claims are pinned by `assertions` that verify checks on both |

**Milestones:** M1 case engine + Case #001 data + verify (no UI) · M2 playable investigation (Academy route,
Briefing, Evidence Room, SQL lab with lead matching, evidence, autosave) · M3 board, verdict, debrief, Python leads ·
M4 XP, ranks, achievements, rewards screen, modes · M5 case-file styling, transitions, sound, Motion setting,
accessibility, docs.

**Case #001 The Missing Revenue** (Copperleaf Home, fictional): September revenue reads −32% vs August. The CEO
blames the 1 September marketing change. Truth: a week-long payment-retry bug duplicated August orders
(inflated baseline, a contributor), and the three best-selling kitchen appliances were out of stock from
2 September (the cause). Channels the campaign never touched fell as much as the total; last September was flat.

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
- Day-to-day launching: the Desktop/Start menu shortcut from npm run shortcut opens the latest build
  (run npm run build after changes). The logo lives in build/ and is regenerated with npm run icons.
