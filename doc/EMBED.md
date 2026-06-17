# Embedding Projocalypse

Projocalypse is designed to run **standalone** (full sidebar, multi-project) or **embedded** inside a host application such as [Talemail](https://github.com/alienfacepalm/talemail). The host owns navigation and branding; Projocalypse owns task workflow inside a single **host project**.

For **why** to embed PM in any repo and how developers stay aligned across machines (git, file bridge, browser sync, roadmap P2P), see **[EMBED-STRATEGY.md](./EMBED-STRATEGY.md)**.

## Mental model

| Concept | Standalone | Embedded (e.g. Talemail) |
|---------|------------|---------------------------|
| **Host project** | User picks/creates PM projects | One fixed Dexie `Project` per host entity (book, series, etc.) |
| **Developers** | Roster per project (`Developer.projectId`) | Same — team is per host project, not global |
| **Active developer** | `localStorage` key per project | Same — who is acting on this device for this host project |
| **Bootstrap** | Master Developer dialog when a project has zero developers | Host mounts with `hostProjectId`; user bootstraps that project only |
| **Sidebar / nav** | Full Projocalypse chrome | `hideSidebar` / `hideProjectSwitcher` — host provides shell |
| **Branding** | `Projocalypse` wordmark | `productName` / `tagline` from host |
| **Appearance** | Global (`localStorage` `projocalypse-appearance`) | Host-global — follows host theme or user preference |
| **View mode** | Per project (`view-mode-{projectId}`) | Per host project |
| **Export / import** | Full DB backup from Settings | Prefer `exportProjectData(hostProjectId)` for host-scoped backup |
| **Browser sync** | Origin-wide mirror + sync file (namespaced per host package) | Same — scoped by `packageName` / `storageNamespace` |

## Mounting API

```tsx
import { configureProjocalypseStorage } from '@projocalypse/react/configure'
import { ProjocalypseApp } from '@projocalypse/react'

configureProjocalypseStorage({ packageName: '@talemail/web' })

// Talemail (example)
<ProjocalypseApp
  embed={{
    embedded: true,
    hostProjectId: talemailBook.projocalypseProjectId,
    packageName: '@talemail/web',
    productName: talemailBook.title,
    tagline: 'Production tasks',
    hideSidebar: true,
    hideProjectSwitcher: true,
  }}
/>
```

`configureProjocalypseStorage` must be imported **before** `ProjocalypseApp` so each host package gets its own IndexedDB (`pm-tool--talemail__web`) when multiple embeds share one browser origin.

### Storage isolation (multiple submodules / hosts)

IndexedDB and `localStorage` mirrors are keyed by **storage namespace**:

| Source (first match wins) | Example namespace | Dexie DB name |
|---------------------------|-------------------|---------------|
| `configureProjocalypseStorage({ storageNamespace })` | `my-host` | `pm-tool--my-host` |
| `configureProjocalypseStorage({ packageName })` / `embed.packageName` | `@talemail/web` → `talemail__web` | `pm-tool--talemail__web` |
| `VITE_PROJOCALYPSE_STORAGE_NAMESPACE` (host `.env`) | `tabocalypse__web` | `pm-tool--tabocalypse__web` |
| Standalone default | `default` | `pm-tool` (legacy) |

Dev mirror files write to the **host repo** when Vite uses `devMirrorPlugin({ viteRoot, mirrorRoot: hostRoot })` or `PROJOCALYPSE_MIRROR_ROOT=../..` — see [MONOREPO.md](./MONOREPO.md).

`EmbedProvider` reads `EmbedConfig` from `src/lib/embed.ts`. Defaults match standalone (`STANDALONE_EMBED_CONFIG`).

### Required host integration steps

1. **Create or link a Projocalypse `Project`** in IndexedDB when the host entity is created (same origin as the embed).
2. **Pass `hostProjectId`** so developers, bootstrap, assignment, and settings scope correctly.
3. **Route** to `/project/{hostProjectId}` or rely on `hostProjectId` alone (scope does not require the route when embedded).
4. **Export/import** — use `exportProjectData(hostProjectId)` / validate with `sliceExportForProject` so backups do not leak other PM projects on the same origin.

## Data scoping rules (enforced in code)

- `Developer.projectId` — required; Dexie v6 index `projectId`.
- `bootstrapMasterDeveloper(projectId, name)` — empty roster **for that project only**; first person becomes **Master Developer**.
- `createDeveloper(actor, projectId, …)` — **Master** or **Lead** actors may add teammates; leads can only add **Developer** role.
- `setTaskAssignee` — assignee `projectId` must match task `projectId`.
- `deleteProject` — cascades developers for that project.
- Active session — `projocalypse-active-developer:{projectId}` in `localStorage`.

### Developer roles (per project)

| Role | Add teammates | Remove / edit roster | Create/delete projects | Assign tasks |
|------|---------------|----------------------|------------------------|--------------|
| **Master** | yes (any role) | yes | yes | yes |
| **Lead** | yes (Developer only) | no (self name only) | no | yes |
| **Developer** | no | no (self name only) | no | yes |

Legacy global developers (pre-v6) migrate to the first project by `sortOrder` on upgrade.

## Settings: host-global vs project-local

| Setting | Scope |
|---------|--------|
| Light/dark + accent palette | **Host-global** (document / `html` theme) |
| List/board view mode | **Per project** |
| Active developer | **Per project** |
| Developer roster & permissions | **Per project** |
| Browser sync file link | **Per storage namespace** on the origin |
| Full export/import in sidebar | **Whole DB** (embedded hosts should call project-scoped export) |

## UI surfaces safe to embed

- `ProjectView` at `/project/:projectId` — list/board + task panel
- `TaskDetailPanel` — mounted in `AppShell`; works without sidebar when `hideSidebar`
- `ConfirmProvider` / `useConfirm()` — no `window.confirm`
- `DeveloperBootstrapDialog` — per-project; copy uses `productName`

## UI surfaces that assume standalone

- **My Tasks** — cross-project; hide or omit route when embedded
- **Global search** — searches all projects on origin
- **Sidebar project list** — hidden via `hideProjectSwitcher`
- **Full export/import** in Settings — replaces entire DB; not host-safe without wrapping

## Talemail gaps (for integration team)

- [x] Host package entry: `@projocalypse/react` + `@projocalypse/cli`
- [x] Plan parser + gap analysis + pending sync file bridge — see [MONOREPO.md](./MONOREPO.md)
- [ ] Create/link `Project` when a Talemail book is created; store `projocalypseProjectId` on host model
- [ ] Mount point in Talemail shell with `embed` config + serve `/.projocalypse/pending/`
- [ ] Decide sync strategy: shared `projocalypse-sync.json` per user vs per book (see [EMBED-STRATEGY.md](./EMBED-STRATEGY.md))
- [ ] Theme: map Talemail tokens to `applyDocumentTheme` or inherit host CSS variables
- [ ] Hide `/my-tasks` and global search in embedded routes
- [x] CI contract test: embed mount + bootstrap + task CRUD scoped to `hostProjectId`

## Related files

| Area | Path |
|------|------|
| Embed config & helpers | `src/lib/embed.ts` |
| React context | `src/context/embed-context.tsx` |
| Active developer (per project) | `src/context/active-developer-context.tsx` |
| App entry | `src/App.tsx` (`embed` prop) |
| Schema migration | `src/db/schema.ts` v6 |
| Project export | `src/lib/export-import.ts` → `exportProjectData` |

See also [EMBED-STRATEGY.md](./EMBED-STRATEGY.md), [MONOREPO.md](./MONOREPO.md), [README.md](../README.md), and `.cursor/rules/projocalypse-embed.mdc`.
