---
name: projocalypse-plan-sync
description: Keep embedded Projocalypse aligned with master plan markdown — gap analysis, pm:sync, checkbox updates, drift fixes. Use when editing doc/PLAN, shipping features, sprint board drift, pm:gap failures, or syncing plan to tasks in a monorepo host.
---

# Projocalypse plan sync (ongoing)

## When to use

- User edits `doc/PLAN/**` or asks to sync plan and sprint board.
- `pnpm pm:gap` reports `MISSING_ON_BOARD`, `STATUS_MISMATCH`, `SECTION_DRIFT`, or `MISSING_FROM_PLAN`.
- Feature is done and plan checkboxes need updating.
- PR touches plan markdown in a host monorepo with Projocalypse embed.

**One-time embed setup** → use `projocalypse-sprint-setup` instead.

## Read first

1. `.projocalypse/workspace.json` — package name, `planGlobs`, `sections`, `doneSection`
2. Plan files matched by `planGlobs` for the target package
3. `doc/MONOREPO.md` — plan format and file bridge

## Resolve package name

- User may name the app (`@talemail/web`, `@tabocalypse/ui`).
- If unclear, list `workspace.json` packages or run `pnpm pm:status --all`.

## Standard loop

```bash
pnpm pm:plan --package <name>    # parse + cache plan
pnpm pm:gap --package <name>     # compare plan vs .projocalypse/board/
pnpm pm:sync --package <name>    # write .projocalypse/pending/<slug>.json
```

After sync with new upserts:

- Commit pending JSON if the repo tracks it for CI/embed.
- User reloads embed route so browser imports pending tasks (once per upsert batch).

## Adding plan items

1. Pick next id: scan existing `pm:PM-###` in plan files; increment (e.g. `PM-044`).
2. Add line under correct heading with section metadata if needed.
3. Run plan → gap → sync.
4. Verify `MISSING_ON_BOARD` cleared for that id.

## Completing work (plan is master for Done)

1. Set plan line to `[x]` and `<!-- pm:section=Done -->` (or package done section).
2. If board snapshot exists and gap shows `STATUS_MISMATCH`, ensure board task is completed or re-export snapshot from embed.
3. Re-run gap until no blocking issues for the ids you touched.

## Board-led updates

When the user completed work only on the board:

1. Read gap output for `STATUS_MISMATCH` / `SECTION_DRIFT`.
2. Update matching plan markdown to reflect board state **or** ask user which source wins.
3. Default: **plan checkbox** defines Done; **board column** defines active sprint placement for open items.

## Multi-package monorepos

- Sync one package at a time with `--package`.
- Root `pnpm pm:gap --all` for overview; CI often uses `--fail-on MISSING_ON_BOARD,STATUS_MISMATCH`.

## Success criteria

- `pnpm pm:gap --package <name>` has no blocking gaps the user cares about.
- Every open plan item with an id appears on the board (or is intentionally deferred with user ack).
- Done items are `[x]` in plan and completed on board when snapshot exists.

## Related

- Rule: `projocalypse-plan-sync.mdc` (applies on plan file edits)
- Rule: `projocalypse-host-monorepo.mdc` (embed + registry)
- CI / automation: `templates/cursor/automations/PLAN-GAP-WORKFLOW.md`
