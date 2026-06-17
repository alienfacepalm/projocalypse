# Monorepo host integration

Projocalypse embeds inside monorepos (Talemail, Tabocalypse, Turborepo, Nx, pnpm workspaces) as a **git submodule** or workspace package. Plan markdown in git replaces external PM tools; CLI scripts keep plan and sprint board aligned.

**Sync strategy** (git vs IndexedDB, cross-developer layers, P2P roadmap): **[EMBED-STRATEGY.md](./EMBED-STRATEGY.md)**.

## Quick start (host monorepo)

```bash
# Add submodule (example)
git submodule add https://github.com/alienfacepalm/projocalypse packages/projocalypse

# From host repo root
pnpm install
pnpm exec projocalypse init
pnpm pm:plan --package @your/app
pnpm pm:gap --package @your/app
pnpm pm:sync --package @your/app
```

`pnpm pm:init` copies Cursor templates to `.cursor/projocalypse-host/`. Merge into host `.cursor/rules/`, `.cursor/skills/`, and `.cursor/commands/` per [templates/cursor/README.md](../templates/cursor/README.md).

| Template | Purpose |
|----------|---------|
| `projocalypse-host-monorepo.mdc` | Embed, registry, package-scoped PM |
| `projocalypse-plan-sync.mdc` | Plan markdown ↔ board sync on `doc/PLAN/**` edits |
| `projocalypse-sprint-setup` skill | First-time submodule / embed wiring |
| `projocalypse-plan-sync` skill | Ongoing gap fix, checkbox updates, `pm:sync` |
| `commands/plan-sync.md` | Slash command for the sync loop |
| `automations/PLAN-GAP-WORKFLOW.md` | CI + optional Cursor Automation for plan PRs |

## Package layout

| Package | Purpose |
|---------|---------|
| `@projocalypse/plan` | Parse plan markdown → `PlanItem[]` |
| `@projocalypse/core` | Workspace registry, pending sync, board snapshots |
| `@projocalypse/gap` | Gap analysis (plan vs board) |
| `@projocalypse/cli` | `projocalypse` command |
| `@projocalypse/react` | `ProjocalypseApp` + `EmbedConfig` for host apps |

## Registry: `.projocalypse/workspace.json`

Maps **package name** → plan paths, sections, embed route:

```json
{
  "version": 1,
  "packages": {
    "@talemail/web": {
      "planGlobs": ["packages/web/doc/PLAN/**/*.md"],
      "sections": ["Backlog", "Sprint", "In Review", "Done"],
      "embed": {
        "app": "apps/web",
        "route": "/books/:id/sprint",
        "hostEntityField": "projocalypseProjectId"
      }
    }
  }
}
```

## Plan format

Use checkboxes with stable ids:

```markdown
- [ ] pm:PM-043 COPPA consent gate <!-- pm:section=Sprint pm:priority=high -->
- [x] pm:PM-042 Magic link flow <!-- pm:section=Done -->
```

Headings set default section for items below. Metadata comments override section and priority.

## CLI commands

| Command | Description |
|---------|-------------|
| `projocalypse init` | Discover packages, write workspace.json, scaffold pm:* scripts, Cursor templates |
| `projocalypse doctor` | Verify dirs and root scripts |
| `projocalypse plan parse --package <name>` | Parse plan files, cache to `.projocalypse/plan-cache/` |
| `projocalypse gap --package <name>` \| `--all` | Compare plan vs `.projocalypse/board/` snapshot |
| `projocalypse sync --package <name>` | Write `.projocalypse/pending/` for browser import |
| `projocalypse status --package <name>` | Summary of link, plan, board, scripts |

Root scripts (added by `init`): `pm:init`, `pm:doctor`, `pm:gap`, `pm:sync`, `pm:status`.

Per-package scripts: `pm:plan`, `pm:gap`, `pm:sync`, `pm:status`, `pm:export`.

## File bridge (CLI ↔ browser)

IndexedDB is browser-only. CLI writes files the host serves statically:

| Path | Purpose |
|------|---------|
| `.projocalypse/workspace.json` | Package registry |
| `.projocalypse/links/<slug>.json` | packageName → hostProjectId |
| `.projocalypse/board/<slug>.json` | Board snapshot for gap analysis |
| `.projocalypse/pending/<slug>.json` | Tasks for browser import |
| `.projocalypse/plan-cache/<slug>.json` | Parsed plan cache |

Serve pending files at `/.projocalypse/pending/<slug>.json` in the host Vite/app build.

## Embed mount

```tsx
import { configureProjocalypseStorage } from '@projocalypse/react/configure'
import { ProjocalypseApp } from '@projocalypse/react'
import '@projocalypse/react/style.css'

configureProjocalypseStorage({ packageName: '@talemail/web' })

<ProjocalypseApp
  embed={{
    embedded: true,
    hostProjectId: book.projocalypseProjectId,
    hostEntityId: book.id,
    packageName: '@talemail/web',
    productName: book.title,
    hideSidebar: true,
    hideProjectSwitcher: true,
    pendingSyncUrl: '/.projocalypse/pending/talemail__web.json',
    onProjectLinked: (id) => saveProjectId(book.id, id),
  }}
/>
```

### Host Vite: dev mirror in repo root

When Projocalypse is a submodule, point the dev mirror plugin at the **host** repo so `.projocalypse/dev-mirror.json` lives with the parent project:

```ts
import { devMirrorPlugin } from 'projocalypse/vite-plugin-dev-mirror' // or relative path to submodule

export default defineConfig({
  plugins: [
    devMirrorPlugin({
      viteRoot: path.resolve(__dirname, '../projocalypse'),
      mirrorRoot: __dirname,
    }),
  ],
  envPrefix: ['VITE_', 'PROJOCALYPSE_'],
})
```

Set `VITE_PROJOCALYPSE_STORAGE_NAMESPACE` in the host `.env` to the package slug (e.g. `talemail__web`) when not using `configureProjocalypseStorage`.

First mount without `hostProjectId` opens the **host setup wizard** (create project → import pending tasks).

## Gap codes

| Code | Meaning |
|------|---------|
| `MISSING_ON_BOARD` | Open plan item not on board |
| `MISSING_FROM_PLAN` | Board task with plan id not in plan |
| `STATUS_MISMATCH` | Plan checkbox vs task completed disagree |
| `SECTION_DRIFT` | Task in wrong column |
| `NO_LINK` | Missing links file |
| `NO_EMBED` | Embed stub not scaffolded |
| `NO_SCRIPTS` | Missing pm:* scripts |
| `NO_REGISTRY` | Package not in workspace.json |

CI example:

```bash
pnpm pm:gap --all --fail-on MISSING_ON_BOARD,STATUS_MISMATCH
```

## Turborepo / Nx

Add `@projocalypse/cli` build to your pipeline. Host apps depend on `@projocalypse/react` via `workspace:*`.

## Related

- [EMBED-STRATEGY.md](./EMBED-STRATEGY.md) — embedded PM goals, sync layers (today vs roadmap)
- [EMBED.md](./EMBED.md) — embed scoping, developers, export rules
- [README.md](../README.md) — standalone app commands
