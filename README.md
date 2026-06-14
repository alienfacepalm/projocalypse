# Projocalypse

A personal project management app inspired by Asana's core workflow. Runs entirely in the browser with **IndexedDB** (via [Dexie.js](https://dexie.org/)) for persistence — no backend, no account required.

## Features

- **Projects** with color labels and default sections (To Do, In Progress, Done)
- **Tasks** with title, description, due date, priority, and completion
- **Subtasks** inside the task detail panel
- **List view** — sections as collapsible groups with inline quick-add
- **Board view** — Kanban columns mapped to sections
- **My Tasks** — all incomplete tasks across projects
- **Drag and drop** — reorder tasks and move between sections (including empty columns)
- **Export / import** — validated JSON backup from Settings in the sidebar
- **Project archive & delete** — from the project header menu

## Getting started

```bash
pnpm install
pnpm dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

## Build

```bash
pnpm build
pnpm preview
```

## Lint

```bash
pnpm lint
```

## Data storage

All data lives in your browser's IndexedDB under the database name `pm-tool`. Clearing site data for this origin will delete your projects and tasks — use **Export backup** regularly.

Backup files use the naming pattern `projocalypse-backup-YYYY-MM-DD.json`.

## Tech stack

- React 19 + Vite + TypeScript
- Dexie.js + dexie-react-hooks
- Tailwind CSS v4
- Radix UI primitives
- @dnd-kit for drag and drop
- react-router-dom

## Keyboard & UX

- Press **Enter** in quick-add fields to create tasks
- Click a task title to open the detail panel
- Toggle **Show completed** in the project header to reveal finished tasks
- List/Board preference is saved per project in `localStorage`
