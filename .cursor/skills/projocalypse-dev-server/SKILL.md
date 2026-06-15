---
name: projocalypse-dev-server
description: >-
  Start, reuse, or tear down the Projocalypse Vite dev server on port 5173 only.
  Use when running pnpm dev, browser QA, Playwright, embed harness testing, or
  when a port conflict blocks local work. Subagents report conflicts to the parent
  instead of starting on 5174+.
---

# Projocalypse dev server (port 5173 only)

**One port: 5173.** `pnpm dev` runs a port check then Vite with `--strictPort` — it **fails** if busy; it never walks to 5174+.

Rule: **`projocalypse-dev-server.mdc`**. Config: `vite.config.ts`, `package.json`, `playwright.config.ts`, `scripts/dev-port.mjs`.

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev:port:check` | Exit 0 if 5173 free; exit 1 + conflict report if busy |
| `pnpm dev:port:status` | JSON status (`port`, `url`, `free`, `owners`) |
| `pnpm dev:port:free` | Stop listeners on **5173** |
| `pnpm dev:port:report` | Human-readable status or conflict block for parent |
| `pnpm dev` | Check port → start Vite on **5173** only |

**Always use `pnpm dev`** — not bare `vite --open`.

## Parent workflow

```
Task Progress:
- [ ] pnpm dev:port:check
- [ ] Reuse http://127.0.0.1:5173/ OR dev:port:free → pnpm dev
- [ ] dev:port:free when user asks to tear down test servers
```

## Subagent / multitask — report on conflict

If **`pnpm dev:port:check`** fails, **stop**. Do not run `pnpm dev`. Return to the parent:

```markdown
## Dev server port conflict

- **Actor:** <subagent name / task description>
- **Port:** 5173 (only port — do not use 5174+)
- **URL:** http://127.0.0.1:5173/
- **Status:** in use by <process names and PIDs from dev:port:status>
- **Action taken:** none — reported to parent

**Parent should:** reuse the existing server, or `pnpm dev:port:free` then `pnpm dev`.
```

Or pipe: `pnpm dev:port:report`

## Reuse vs free

| Signal | Action |
|--------|--------|
| Server already on 5173 | Reuse URL — no second `pnpm dev` |
| Stale Vite on 5173 | `pnpm dev:port:free` → `pnpm dev` |
| Playwright `test:e2e` | `webServer` on 5173, `reuseExistingServer` — no extra dev server |
| Non-Projocalypse app on 5173 | Report to user; do not kill blindly or hop ports |

## Tear down

```bash
pnpm dev:port:free
pnpm dev:port:check
```
