---
name: projocalypse-pr-loop
description: Test, fix, commit, push, and open a PR for Projocalypse feature work on a feature branch. Use when shipping completed features or when the user asks for a PR loop.
---

# Projocalypse PR loop

End-to-end ship workflow for **Projocalypse**. Related rules: `projocalypse-feature-ship.mdc`, `projocalypse-branch-commit-pr.mdc`, `projocalypse-git.mdc`.

## When to use

- Feature or fix is complete and user wants it shipped
- User asks for "PR loop", "commit and PR", or similar

## Skip when

- User said WIP, commit only, no PR, or don't push
- Build or lint still failing after fix attempts

## Workflow

1. **Branch check** — `git branch --show-current`. If on `main`/`master` with deliverable work, create `feat/` or `fix/` branch first.

2. **Verify**
   ```bash
   pnpm build
   pnpm lint
   ```
   Fix failures before continuing.

3. **Review** — `git status`, `git diff`, `git log -5` for commit message style.

4. **Commit** — stage relevant files (never secrets); imperative message.

5. **Push** — `git push -u origin HEAD`

6. **PR** — `gh pr create` with Summary + Test plan; return PR URL.

## PR body template

```bash
gh pr create --title "feat: short description" --body "$(cat <<'EOF'
## Summary
- …

## Test plan
- [x] pnpm build
- [x] pnpm lint
EOF
)"
```

## Do not (without user ask)

- Force-push default branch
- Merge PR
- Import backup over live IndexedDB data without confirmation
