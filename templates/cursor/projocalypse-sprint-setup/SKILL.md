---
name: projocalypse-sprint-setup
description: Import Projocalypse into a monorepo, sync plan markdown to sprint board, run gap analysis, scaffold pm scripts and embed mount. Use when adding projocalypse submodule, loading sprint from plan, or wiring Talemail/Tabocalypse PM embed.
---

# Projocalypse sprint setup (host monorepo)

## When to use

- User asks to add Projocalypse, embed sprint board, sync plan to tasks, or replace Jira with in-repo PM.
- Host repo uses pnpm / Turborepo / Nx workspaces.

## Read first

1. Host `pnpm-workspace.yaml` and package names
2. `packages/projocalypse/doc/MONOREPO.md`
3. Existing `.projocalypse/workspace.json` if present

## Workflow

1. **Submodule / workspace** — ensure `packages/projocalypse` exists; host depends on `@projocalypse/react` via `workspace:*`.
2. **Init** — from host root: `pnpm exec projocalypse init` (or `pnpm pm:init`).
3. **Registry** — verify `.projocalypse/workspace.json` entry for target `--package` with correct `planGlobs` and `sections`.
4. **Plan ids** — ensure roadmap items use `- [ ] pm:PM-### Title` with optional `<!-- pm:section=Sprint pm:priority=high -->`.
5. **Gap** — `pnpm pm:gap --package <name>`; fix `MISSING_ON_BOARD`, `STATUS_MISMATCH`, `NO_SCRIPTS`, `NO_EMBED`.
6. **Sync** — `pnpm pm:sync --package <name>` writes `.projocalypse/pending/<slug>.json`.
7. **Static serve** — host build copies/serves `.projocalypse/pending/` at `/.projocalypse/pending/`.
8. **Embed** — mount `ProjocalypseApp` with `packageName`, `hostProjectId`, `pendingSyncUrl`, `onProjectLinked`.
9. **Doctor** — `pnpm pm:doctor`.

## Entity link

Store `projocalypseProjectId` on host model (book, workspace). First embed without id triggers setup wizard; persist id via `onProjectLinked`.

## Success criteria

- `pnpm pm:gap --package <name>` shows no blocking gaps (or user accepts drift).
- Embed route loads board; pending tasks import once.
- Plan and board share `pm:ID` keys.

## After setup (ongoing)

Merge **`projocalypse-plan-sync`** skill and rule from `templates/cursor/` into host `.cursor/`. Use that skill whenever plan markdown or sprint drift changes. Optional: CI from `templates/cursor/automations/PLAN-GAP-WORKFLOW.md`.
