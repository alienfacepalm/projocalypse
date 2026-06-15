# Talemail MVP board import

Projocalypse can load the full [Talemail MVP sprint board](https://github.com/alienfacepalm/talemail/blob/master/doc/PLAN/MVP-SPRINT-BOARD.md) as a project with **136 tasks** in sprint sections, with completion status from the plan.

## Import in the app (your browser)

1. Run `pnpm dev` on branch `feat/talemail-board-import` (or after merge).
2. Open **Settings → Import Talemail MVP board** and confirm.
3. You should land on **Talemail** with **136 tasks**. Toggle **Show completed** or filter **Done** to see the Shipped column.

Or visit once:

```
http://localhost:5173/?import=talemail-mvp
```

The board JSON is **bundled in the app** (not fetched at runtime), so import works offline and after refresh.

## Refresh the bundle from Talemail

When the talemail repo is a sibling at `../talemail`:

```bash
pnpm import:talemail
```

Regenerates `imports/talemail-mvp-projocalypse-import.json` from the talemail generator and mirrors it to `public/imports/` (optional copy for manual download; the app bundles `imports/` at build time).

## Manual file import

**Settings → Import backup** → select `imports/talemail-mvp-projocalypse-import.json`.

That replaces **all** Projocalypse data. Prefer **Import Talemail MVP board** to keep other projects.

## Board layout

| Section | Contents |
|---------|----------|
| Shipped — PoC & merged MVP | All **41 completed** tasks (PoC + merged tracks). Descriptions include tags, PR refs, and **Original sprint** when moved from a sprint column |
| Sprint 0–5 | Open / in-progress work only |
| Blocked | External blockers (e.g. release signing) |
| Backlog | Post-MVP deferrals |

Toggle **Show completed** on the project to see shipped tasks.
