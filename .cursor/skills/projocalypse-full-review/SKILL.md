---
name: projocalypse-full-review
description: >-
  Full code and plan review for Projocalypse feature branches — align implementation
  with README/features, run scoped tests, fix gaps, add missing tests, ship via PR.
  Use when the user asks for end-to-end review, gap analysis, or merge-ready
  delivery on a feature branch.
---

# Projocalypse full review and ship

**Shortcuts:** `/full-review` in Cursor chat (`.cursor/commands/`).

End-to-end review workflow for a feature branch. Combines Karpathy-style surgical fixes and **`projocalypse-feature-ship.mdc`** delivery.

## When to use

- User requests **full code review**, **plan review**, **find gaps**, **fix errors**, **missing tests**, **commit/push/PR**.
- Before opening or updating a large PR (data model, export/import, views, drag-and-drop).

**Do not use** for babysitting an existing PR's CI/comments only — use **`babysit`** skill instead.

## Read order (plan review)

1. [README.md](../../README.md) — feature list and commands
2. **`projocalypse-stack.mdc`** — stack and architecture expectations
3. **`projocalypse-tests.mdc`** — test requirements for changed behavior
4. **`projocalypse-real-implementation.mdc`** — no mocks in user-facing flows

## Gap checklist (code review)

| Area | Verify |
|------|--------|
| **Data model** | `src/models/types.ts` matches Dexie schema in `src/db/schema.ts` |
| **DB ops** | CRUD in `src/db/operations.ts`; cascades on delete; transactions |
| **Export/import** | `ExportData` version 1; validation errors are user-readable |
| **Routing** | Routes in `App.tsx` match sidebar links and redirects |
| **Views** | List/board toggle persisted; My Tasks sort rules |
| **Drag-and-drop** | `computeTaskReorderUpdates` + `reorderTasks` stay in sync |
| **Docs** | README commands (`pnpm`); backup filename pattern |
| **Tests** | Vitest for pure logic + DB ops; Testing Library for key UI flows |

Common gaps to hunt:

- README still references `npm` instead of `pnpm`
- Export version drift without README update
- Dexie schema change without migration path
- UI that appears to save but skips IndexedDB
- Missing tests for new business rules

## Execution loop

1. **Branch** — `git branch --show-current`; must not be `master`/`main` for deliverable work (**`projocalypse-branch-commit-pr.mdc`**).
2. **Baseline tests** — pick commands from **`projocalypse-feature-ship.mdc`**:

   | Changed paths | Run |
   |---------------|-----|
   | `src/**` (TS/TSX) | `pnpm test:pr` |
   | Docs / `.cursor/**` only | `pnpm lint` if TS touched; otherwise skip |
   | **Unsure** | `pnpm test:pr` |

3. **Fix** — surgical changes only (**`projocalypse-karpathy-guidelines`**); add tests for new behavior (**`projocalypse-tests.mdc`**).
4. **Re-run** failed suites until green.
5. **Ship** (unless user said WIP / no PR):
   - `git add` (never secrets)
   - `git commit` imperative message (`feat:`, `fix:`, `test:`)
   - `git push -u origin HEAD`
   - `gh pr create` or update existing PR with Summary + Test plan

## PR body template

```markdown
## Summary
- …

## Test plan
- [x] pnpm test:pr (or scoped commands)
```

## Output to user

Report:

1. **Plan alignment** — what matched / what was missing
2. **Fixes applied** — bullets with file areas
3. **Tests added/run**
4. **PR URL** (if shipped)
