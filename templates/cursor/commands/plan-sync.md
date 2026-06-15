# Plan sync

Run the **projocalypse-plan-sync** skill for the package the user is working on (or ask which `--package` from `.projocalypse/workspace.json`).

1. `pnpm pm:plan --package <name>`
2. `pnpm pm:gap --package <name>` — list gaps; fix plan markdown or explain drift
3. `pnpm pm:sync --package <name>` — write pending if upserts needed
4. If plan items were marked done, ensure `[x]` and `pm:section=Done`
5. Summarize remaining gaps and whether embed reload is needed

If not initialized: `pnpm pm:init` and `projocalypse-sprint-setup` skill first.
