# Projocalypse — Cursor AI setup

Adapted from the [talemail](https://github.com/alienfacepalm/talemail) Cursor configuration for this React + Vite + TypeScript frontend (IndexedDB, no backend).

## Project rules (`.cursor/rules/`)

| Rule | Globs | Always apply |
|------|-------|----------------|
| `projocalypse-agent-behavior.mdc` | — | **yes** |
| `projocalypse-git.mdc` | — | **yes** |
| `projocalypse-branch-commit-pr.mdc` | — | **yes** |
| `projocalypse-feature-branches.mdc` | — | **yes** |
| `projocalypse-feature-ship.mdc` | — | **yes** |
| `projocalypse-mission-critical.mdc` | — | **yes** |
| `projocalypse-real-implementation.mdc` | — | **yes** |
| `projocalypse-docs-sync.mdc` | — | **yes** |
| `projocalypse-tests.mdc` | — | **yes** |
| `projocalypse-docs.mdc` | `doc/**`, `README.md`, `.cursor/README.md` | no |
| `projocalypse-typescript.mdc` | `**/*.{ts,tsx}` | no |
| `projocalypse-filenames.mdc` | `src/**` | no |
| `projocalypse-pnpm.mdc` | `package.json`, `pnpm-lock.yaml`, `**/*.{ts,tsx,css}` | no |
| `projocalypse-stack.mdc` | `**/*.{ts,tsx,css}` | no |
| `projocalypse-tailwind-shadcn.mdc` | `src/**/*.{ts,tsx,css}` | no |
| `projocalypse-delete-confirm.mdc` | `src/**/*.{ts,tsx}` | no |

**Behavior:** agents execute clear requests autonomously (no permission prompts); ask only on genuinely ambiguous decisions. Git policy (commits, push, secrets) lives in `projocalypse-git.mdc` only.

## Skills matrix

| Skill | Use when | Don't use when |
|-------|----------|----------------|
| `projocalypse-karpathy-guidelines` | Writing, reviewing, or refactoring **code**; surgical diffs, simplicity, verifiable success criteria | Overriding allow-all with permission prompts |
| `projocalypse-full-review` | End-to-end review on a feature branch: gap analysis, tests, fixes, ship PR | Babysitting existing PR CI only (use `babysit`) |
| `projocalypse-frontend-design` | Building or styling web UI — components, pages, dashboards, polish | Routine bug fixes unrelated to design |

Imported from talemail: **Karpathy** for coding craft; **Anthropic frontend-design** for distinctive UI work; **full-review** workflow adapted as `projocalypse-full-review`.

## Quick start for agents

1. Read [README.md](../README.md) for stack and features.
2. `projocalypse-agent-behavior` + `projocalypse-git` are always on.
3. `projocalypse-stack` + `projocalypse-typescript` + `projocalypse-filenames` + `projocalypse-pnpm` + `projocalypse-tailwind-shadcn` when editing `src/**` or `package.json`.
4. `projocalypse-karpathy-guidelines` for code changes; `projocalypse-frontend-design` for UI polish or new screens.

## Not copied from talemail

Skipped talemail-specific rules/skills: Firebase, email, COPPA, pricing, PDF, monorepo/Turborepo/Melos, Flutter, env-7z, ADRs, docs-audit automations, and backend stack conventions. **pnpm** policy is copied as `projocalypse-pnpm.mdc`. **Docs sync** adapted from `talemail-docs-sync.mdc` + `talemail-docs.mdc` as `projocalypse-docs-sync.mdc` + `projocalypse-docs.mdc`.
