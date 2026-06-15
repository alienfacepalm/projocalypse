# Projocalypse

A personal project management app inspired by Asana's core workflow. Runs entirely in the browser with **IndexedDB** (via [Dexie.js](https://dexie.org/)) for persistence — no backend, no account required.

## Features

- **Projects** with color labels and default sections (To Do, In Progress, Done)
- **Tasks** with title, description, due date, priority, and completion
- **Subtasks** inside the task detail panel
- **List view** — sections as collapsible groups with inline quick-add
- **Board view** — Kanban columns mapped to sections
- **My Tasks** — incomplete tasks across active projects; smart lists (Today, Upcoming, Overdue) and filters
- **Project filters** — status chips with counts, priority filter, sort (board order, status, priority, title, recently updated), and show completed toggle on project views
- **Export / import** — validated JSON backup from Settings in the sidebar; bundled **Talemail MVP** sprint board import (see [imports/README.md](./imports/README.md))
- **Dark mode** — toggle in Settings; preference saved in `localStorage`
- **Browser sync** — no-server sync across tabs (localStorage mirror) and across devices via a linked sync file in iCloud/Dropbox/Google Drive (File System Access API); conflicts resolved by per-item `updatedAt` (newer wins, ties prefer local)
- **Project archive & delete** — from the project header menu; restore archived projects from the sidebar
- **Global search** — find tasks and projects from the sidebar
- **My Tasks smart lists** — All, Today, Upcoming, Overdue with project and priority filters
- **Reorder** — drag projects in the sidebar; drag sections in list and board views
- **Kanban workflow** — default column names map to status; completing a task or moving it to Done/Shipped marks it complete; moving out of a done column reopens it
- **Section picker** — change a task's section from the task detail panel
- **Board section management** — rename, delete, and add sections on the board

## Getting started

```bash
pnpm install
pnpm dev
```

The dev server opens your default browser automatically (`server.open` in `vite.config.ts` and `vite --open` in the dev script). If it does not open, check you are on branch `feat/browser-sync` (or `master` after PR #3 merges) — other branches lack this config.

## Build

```bash
pnpm build
pnpm preview
```

## Lint

```bash
pnpm lint
```

## Tests

```bash
pnpm test
pnpm test:watch
pnpm test:coverage
```

CI-style gate (tests + build + lint):

```bash
pnpm test:pr
```

## Data storage

All data lives in your browser's IndexedDB under the database name `pm-tool`. Clearing site data for this origin will delete your projects and tasks — use **Export backup** regularly.

### Browser sync (no server)

Projocalypse follows the same offline-first sync pattern as [Tabocalypse](https://github.com/alienfacepalm/tabocalypse): a **local mirror** for immediate reads plus a **cloud layer** for cross-device propagation. Tabocalypse uses the browser extension `storage.sync` API; as a plain web app, Projocalypse uses:

| Layer | Mechanism | Scope |
|-------|-----------|--------|
| **Mirror** | `localStorage` (`projocalypseSyncMirror`) | All tabs on this origin |
| **Cloud** | Linked `projocalypse-sync.json` via File System Access API | Any device sharing that file (e.g. via iCloud Drive, Dropbox, Google Drive) |

Open **Settings → Browser sync** to create or link a sync file. Edits debounce into the mirror and sync file automatically; other tabs pick up mirror changes via the `storage` event; linked files are polled every few seconds when the tab is visible.

Conflicts use **last-write-wins per entity id** by `updatedAt` (same strategy as Tabocalypse notes). Sync slice **version 2** adds **delete tombstones** so deletes propagate across devices; v1 sync files still load (without tombstones).

Backup files use the naming pattern `projocalypse-backup-YYYY-MM-DD.json`. The live sync file is named `projocalypse-sync.json`.

## Environment (optional — board chat)

For the upcoming Gemini-powered board assistant (slash commands like `/add-task`), copy [`.env.example`](./.env.example) to `.env` and set `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/apikey). Optional `GEMINI_MODEL` defaults to `gemini-2.5-flash` (same as Talemail). Restart `pnpm dev` after changing env vars. **Never commit `.env`** — it is gitignored.

## Tech stack

- React 19 + Vite + TypeScript
- Dexie.js + dexie-react-hooks
- Tailwind CSS v4 + shadcn/ui (Radix primitives in `src/components/ui/`)
- @dnd-kit for drag and drop
- react-router-dom

## Keyboard & UX

- Press **Enter** in quick-add fields to create tasks
- Click a task title to open the detail panel
- Toggle **Show completed** in the project toolbar to reveal finished tasks
- List/Board preference is saved per project in `localStorage`
- Light/Dark theme preference is saved in `localStorage` (Settings → Dark mode / Light mode)
