# Datara

An offline desktop app for learning data analytics: short lessons with cited
sources, a SQL practice game and a Python practice game. No account, no internet
needed after install. Progress is saved on this PC only.

See [docs/plan.md](docs/plan.md) for the agreed plan and roadmap.

## Commands

| Command | What it does |
|---|---|
| `npm install` | Install dependencies (first time only) |
| `npm run dev` | Start the app in development mode with live reload |
| `npm run build` | Type-check, verify all content, and build the app into `out/` |
| `npm run verify` | Check every SQL level and lesson (solutions run, tests pass, citations verified) |
| `npm run dataset` | Regenerate the practice shop (`content/datasets/store.sql`) and the hidden test shop (`store-hidden.sql`) |
| `npm start` | Run the built app from `out/` (works even with Smart App Control on) |
| `npm run shortcut` | Create a **Datara** shortcut on the Desktop and in the Start menu, to open the app with a double-click |
| `npm run icons` | Regenerate the logo and icon files (in `build/`) from `scripts/make-icons.mjs` |
| `npm run selftest` | Open the built app hidden and check the SQL and Python engines |
| `npm run dist` | Build the Windows installer into `dist/` |
| `npm run selftest -- --packaged` | Run the same checks against the packaged app in `dist/win-unpacked` |

The first `dev`/`build` downloads Python's pandas packages (about 8 MB) from the
official Pyodide CDN and verifies their checksums. After that, everything works offline.

## Project layout

```
src/
  main/        Electron main process: window, security, app:// file server, progress file
  preload/     The small, safe API the interface can call (window.datara)
  shared/      Types used by both sides (progress format, API)
  renderer/    The interface (React + TypeScript + Tailwind)
    src/app/       Layout and sidebar
    src/features/  One folder per screen (dashboard, learn, sql-lab, python-lab, progress, settings)
    src/engines/   SQL (sql.js) and Python (Pyodide) engines, each in a background worker
    src/lib/       Progress storage, engine checks
scripts/       prepare-engines, generate-dataset, verify-content, selftest
content/
  datasets/    The practice shop and the hidden test shop used to check answers (generated, do not edit by hand)
  sql-levels/     chapters.yaml (order and chapters) + one .yaml file per level
  python-levels/  same structure as sql-levels
  lessons/        index.yaml (categories and modules) + one .md file per lesson
src/shared/python/datara_check.py   The Python Lab checker (used by the app and by verify)
```

## Adding content

- **A SQL level:** create `content/sql-levels/<id>.yaml` (copy an existing one), add its id to
  `chapters.yaml`, then run `npm run verify`. Add `tests.accept` and `tests.reject` queries so the
  checker is tested too.
- **A Python level:** create `content/python-levels/<id>.yaml`. `setup` is the given data, `expect` lists
  the variables to compare with the solution, `checkOutput: true` compares printed output, and each
  entry in `variants` is alternative given data the learner's code must also handle (so typing in the
  answer can't pass). Optional: `calls` (test calls like `apply_discount(100, 0.2)` for function levels),
  `files` (data files such as `products.csv` for `pd.read_csv`), and `ignoreRowOrder: true` (compare
  pandas tables in any row order). Add `tests.accept` and `tests.reject` code, then run `npm run verify`.
- **A lesson:** create `content/lessons/<id>.md`, add it to `index.yaml`. Cite facts with `[^1]` and list
  each source in the front matter. A source only passes `npm run verify` once `verified: true`, which means
  someone has checked that the page supports the claim.

## Security model

- The interface runs sandboxed with no Node.js access; it can only load and save progress.
- Code typed by the learner runs in WebAssembly workers with no access to files or programs.
  Runaway code is stopped after 5 s (SQL) or 10 s (Python).
- A strict Content Security Policy blocks all internet access from the app's pages.
- Links to websites (such as lesson citations) open in your normal browser.
