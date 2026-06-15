---
name: projocalypse-dev-server
description: >-
  Start, reuse, or tear down the Projocalypse Vite dev server on a single port
  (default 5173). Use when running pnpm dev, browser QA, Playwright, embed
  harness testing, or when a port conflict blocks local work. Subagents report
  conflicts to the parent instead of starting on 5174+.
---

# Projocalypse dev server (single port)

Enforces **one dev server** on port **5173** unless the user explicitly overrides.

Rule: **`projocalypse-dev-server.mdc`**. Config: `vite.config.ts` (`strictPort`), `playwright.config.ts`, `scripts/dev-port.mjs`.

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev:port:check` | Exit 0 if port free; exit 1 + conflict report if busy |
| `pnpm dev:port:status` | JSON status (`port`, `url`, `free`, `owners`) |
| `pnpm dev:port:free` | Stop listeners on the dev port |
| `pnpm dev:port:report` | Human-readable status or conflict block for parent |
| `pnpm dev` | Start Vite (fails if port busy — by design) |

Override (user-approved only): `PROJOCALYPSE_DEV_PORT=5174 pnpm dev`

## Parent workflow

```
Task Progress:
- [ ] pnpm dev:port:check
- [ ] Reuse existing server OR dev:port:free → pnpm dev
- [ ] Browser / Playwright at http://127.0.0.1:5173/
- [ ] dev:port:free when user asks to tear down test servers
```

## Subagent / multitask — report on conflict

If **`pnpm dev:port:check`** fails, **stop**. Do not run `pnpm dev`. Return to the parent:

```markdown
## Dev server port conflict

- **Actor:** <subagent name / task description>
- **Requested port:** 5173
- **URL:** http://127.0.0.1:5173/
- **Status:** in use by <process names and PIDs from dev:port:status>
- **Action taken:** none — reported to parent

**Parent should:** reuse the existing server, run `pnpm dev:port:free` then `pnpm dev`, or apply a user-approved `PROJOCALYPSE_DEV_PORT` override.
```

Or pipe: `pnpm dev:port:report`

## Reuse vs free vs override

| Signal | Action |
|--------|--------|
| Same session, server already running | Reuse URL — no second `pnpm dev` |
| Stale Vite/node on 5173 from prior agent work | `pnpm dev:port:free` → `pnpm dev` |
| Playwright `test:e2e` | Uses `webServer` on 5173 with `reuseExistingServer` — do not start a separate dev server |
| Non-Projocalypse app on 5173 | Report to user; do not kill blindly |

## Tear down

User asks to stop test servers:

```bash
pnpm dev:port:free
pnpm dev:port:check   # verify free
```
