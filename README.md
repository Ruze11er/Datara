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
| `npm run build` | Type-check and build the app into `out/` |
| `npm start` | Run the built app from `out/` (works even with Smart App Control on) |
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
scripts/       prepare-engines (bundles engines offline), selftest
```

## Security model

- The interface runs sandboxed with no Node.js access; it can only load and save progress.
- Code typed by the learner runs in WebAssembly workers with no access to files or programs.
  Runaway code is stopped after 5 s (SQL) or 10 s (Python).
- A strict Content Security Policy blocks all internet access from the app's pages.
- Links to websites (such as lesson citations) open in your normal browser.
