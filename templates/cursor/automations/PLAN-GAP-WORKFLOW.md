# Plan gap workflow (CI + optional Cursor Automation)

Keep the embedded Projocalypse board aligned with git plan markdown in host monorepos.

## CI (recommended)

Add to host `.github/workflows/` (adjust package manager and paths):

```yaml
name: plan-gap
on:
  pull_request:
    paths:
      - '**/doc/PLAN/**'
      - '.projocalypse/**'
  push:
    branches: [main, master]
    paths:
      - '**/doc/PLAN/**'

jobs:
  gap:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm pm:gap --all --fail-on MISSING_ON_BOARD,STATUS_MISMATCH
```

Blocking codes:

- `MISSING_ON_BOARD` — plan has open items not on board; run `pm:sync` and import in embed.
- `STATUS_MISMATCH` — checkbox vs task completion disagree; fix plan or board.

Non-blocking (warn only unless you add to `--fail-on`): `SECTION_DRIFT`, `NO_EMBED`, `NO_SCRIPTS`.

## Cursor Automation (optional)

Use when you want an agent to run after plan changes without manual `/plan-sync`.

**Trigger:** Git — pull request opened/updated, path filter `**/doc/PLAN/**`

**Tools:** Terminal (repo checkout)

**Instructions (paste into automation prompt):**

> This PR touches plan markdown. Read `.projocalypse/workspace.json`. For each affected package, run `pnpm pm:plan`, `pnpm pm:gap`, and `pnpm pm:sync` as needed. Fix `MISSING_ON_BOARD` by syncing; fix `STATUS_MISMATCH` by updating plan checkboxes or explaining board drift. Do not merge plan ids. Summarize gaps left for the author. Follow `projocalypse-plan-sync` skill if present in `.cursor/skills/`.

**To finish in editor:** pick repo, branch, and path filters; enable terminal; install `projocalypse-plan-sync` skill in host `.cursor/skills/`.

## Board snapshots

Gap analysis compares plan to `.projocalypse/board/<slug>.json`. Snapshots are written from the embed via `writeBoardSnapshot()` in `@projocalypse/core`. Without snapshots, gap still catches `MISSING_ON_BOARD` for new plan items but may miss `STATUS_MISMATCH`. Document snapshot export in the host embed integration.

## Pending files in git

Track `.projocalypse/pending/*.json` in git when:

- CI or preview deploys serve static pending for embed import
- Reviewers need to see task upserts in the PR diff

Do not commit browser-only IndexedDB state; only the file bridge paths under `.projocalypse/`.
