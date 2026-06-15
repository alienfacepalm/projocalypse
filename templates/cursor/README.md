# Projocalypse host Cursor templates

Copied to `.cursor/projocalypse-host/` by `pnpm pm:init` (or `projocalypse init`). Merge into the host monorepo so agents keep the embedded sprint board aligned with git plan markdown.

## Install (host monorepo)

```bash
pnpm pm:init   # copies this folder to .cursor/projocalypse-host/
```

Then merge into active Cursor config:

| Template | Copy to |
|----------|---------|
| `projocalypse-host-monorepo.mdc` | `.cursor/rules/projocalypse-host-monorepo.mdc` |
| `projocalypse-plan-sync.mdc` | `.cursor/rules/projocalypse-plan-sync.mdc` |
| `projocalypse-sprint-setup/SKILL.md` | `.cursor/skills/projocalypse-sprint-setup/SKILL.md` |
| `projocalypse-plan-sync/SKILL.md` | `.cursor/skills/projocalypse-plan-sync/SKILL.md` |
| `commands/plan-sync.md` | `.cursor/commands/plan-sync.md` |

Optional: wire [automations/PLAN-GAP-WORKFLOW.md](./automations/PLAN-GAP-WORKFLOW.md) as CI or a Cursor Automation.

## When agents use what

| Situation | Skill / rule |
|-----------|----------------|
| First-time embed, submodule, pm scripts | `projocalypse-sprint-setup` |
| Edit `doc/PLAN/**`, ship features, fix drift | `projocalypse-plan-sync` + `projocalypse-plan-sync.mdc` |
| Any embed / hostProjectId work | `projocalypse-host-monorepo.mdc` |
| User runs `/plan-sync` | `commands/plan-sync.md` |

## Source of truth

**Plan markdown** (`doc/PLAN/**/*.md` with `pm:PM-###` ids) is the master backlog. The embedded Projocalypse board is the sprint execution surface. CLI gap analysis detects drift; `pm:sync` writes pending tasks for the browser.

See [doc/MONOREPO.md](../../doc/MONOREPO.md).
