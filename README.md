# Projocalypse

A personal project management app inspired by Asana's core workflow. Runs entirely in the browser with **IndexedDB** (via [Dexie.js](https://dexie.org/)) for persistence — no backend, no account required.

## Features

- **Projects** with color labels and default sections (To Do, In Progress, Done)
- **Tasks** with title, description, due date, priority, and completion
- **Subtasks** inside the task detail panel
- **List view** — sections as collapsible groups with inline quick-add (full section detail for sprint/backlog breakdown)
- **Board view** — three workflow lanes (Not started · In progress · Shipped) grouped from sections and completion status
- **My Tasks** — incomplete tasks across active projects; smart lists (Today, Upcoming, Overdue) and filters
- **Drag and drop** — reorder tasks and move between sections (including empty columns)
- **Export / import** — validated JSON backup from Settings in the sidebar
- **Appearance** — light/dark mode and accent palettes in Settings; saved in `localStorage`
- **Browser sync** — no-server sync across tabs (localStorage mirror) and across devices via a linked sync file in iCloud/Dropbox/Google Drive (File System Access API); conflicts resolved by per-item `updatedAt` (newer wins, ties prefer local)
- **Project archive & delete** — from the project header menu; restore archived projects from the sidebar
- **Global search** — find tasks and projects from the sidebar
- **My Tasks smart lists** — All, Today, Upcoming, Overdue with project and priority filters
- **Developer management** — workspace team roster, Master Developer bootstrap, task assignment, permissions
- **Embed-ready** — mount inside host apps (e.g. Talemail) with `hostProjectId` and configurable chrome; see [doc/EMBED.md](./doc/EMBED.md)
- **Section picker** — change a task's section from the task detail panel
- **Section management** — add, rename, reorder, and delete sections in list view
- **Developers** — team roster in Settings; assign tasks via the task detail panel; initials badges on task rows and My Tasks

## Getting started

```bash
pnpm install
pnpm dev
```

The dev server opens your default browser automatically (`server.open` in `vite.config.ts` and `vite --open` in the dev script).

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

Backup files use the naming pattern `projocalypse-backup-YYYY-MM-DD.json`. **Export format version 2** adds a `developers` array and task `assigneeId`; version 1 backups still import (assignees default to unassigned). The live sync file is named `projocalypse-sync.json` (sync slice version 3 includes developers).

## Tech stack

- React 19 + Vite + TypeScript
- Dexie.js + dexie-react-hooks
- Tailwind CSS v4 + shadcn/ui (Radix primitives in `src/components/ui/`) — see [DESIGN.md](./DESIGN.md) for themes, tokens, and Tabocalypse alignment
- @dnd-kit for drag and drop
- react-router-dom

## Keyboard & UX

- Press **Enter** in quick-add fields to create tasks
- Click a task title to open the detail panel
- Toggle **Show completed** in the project header to reveal finished tasks
- List/Board preference is saved per project in `localStorage`
- Appearance (light/dark + accent palette) is saved in `localStorage` (Settings → Appearance)

## Embedding in host apps

Projocalypse can mount inside another product (e.g. Talemail) with a fixed host project, neutral branding, and optional hidden sidebar. See **[doc/EMBED.md](./doc/EMBED.md)** for `EmbedConfig`, data scoping, and Talemail integration checklist.
