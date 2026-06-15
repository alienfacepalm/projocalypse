# Embedding Projocalypse

Projocalypse is designed to run **standalone** (full sidebar, multi-project) or **embedded** inside a host application such as [Talemail](https://github.com/alienfacepalm/talemail). The host owns navigation and branding; Projocalypse owns task workflow inside a single **host project**.

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
| **Browser sync** | Origin-wide mirror + sync file | Same mechanism today — **Talemail team** should decide per-host vs per-origin sync |

## Mounting API

```tsx
import App from '@/App'

// Talemail (example)
<App
  embed={{
    embedded: true,
    hostProjectId: talemailBook.projocalypseProjectId,
    productName: talemailBook.title,
    tagline: 'Production tasks',
    hideSidebar: true,
    hideProjectSwitcher: true,
  }}
/>
```

`EmbedProvider` reads `EmbedConfig` from `src/lib/embed.ts`. Defaults match standalone (`STANDALONE_EMBED_CONFIG`).

### Required host integration steps

1. **Create or link a Projocalypse `Project`** in IndexedDB when the host entity is created (same origin as the embed).
2. **Pass `hostProjectId`** so developers, bootstrap, assignment, and settings scope correctly.
3. **Route** to `/project/{hostProjectId}` or rely on `hostProjectId` alone (scope does not require the route when embedded).
4. **Export/import** — use `exportProjectData(hostProjectId)` / validate with `sliceExportForProject` so backups do not leak other PM projects on the same origin.

## Data scoping rules (enforced in code)

- `Developer.projectId` — required; Dexie v6 index `projectId`.
- `bootstrapMasterDeveloper(projectId, name)` — empty roster **for that project only**.
- `createDeveloper(actor, projectId, …)` — actor must belong to `projectId`.
- `setTaskAssignee` — assignee `projectId` must match task `projectId`.
- `deleteProject` — cascades developers for that project.
- Active session — `projocalypse-active-developer:{projectId}` in `localStorage`.

Legacy global developers (pre-v6) migrate to the first project by `sortOrder` on upgrade.

## Settings: host-global vs project-local

| Setting | Scope |
|---------|--------|
| Light/dark + accent palette | **Host-global** (document / `html` theme) |
| List/board view mode | **Per project** |
| Active developer | **Per project** |
| Developer roster & permissions | **Per project** |
| Browser sync file link | **Origin-global** (current implementation) |
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

- [ ] Host package entry: npm/workspace import of `App` + types, or iframe with `postMessage` bridge
- [ ] Create/link `Project` when a Talemail book is created; store `projocalypseProjectId` on host model
- [ ] Mount point in Talemail shell (Flutter web / React admin) with `embed` config
- [ ] Decide sync strategy: shared `projocalypse-sync.json` per user vs per book
- [ ] Theme: map Talemail tokens to `applyDocumentTheme` or inherit host CSS variables
- [ ] Hide `/my-tasks` and global search in embedded routes
- [ ] CI contract test: embed mount + bootstrap + task CRUD scoped to `hostProjectId`

## Related files

| Area | Path |
|------|------|
| Embed config & helpers | `src/lib/embed.ts` |
| React context | `src/context/embed-context.tsx` |
| Active developer (per project) | `src/context/active-developer-context.tsx` |
| App entry | `src/App.tsx` (`embed` prop) |
| Schema migration | `src/db/schema.ts` v6 |
| Project export | `src/lib/export-import.ts` → `exportProjectData` |

See also [README.md](../README.md) and `.cursor/rules/projocalypse-embed.mdc`.
