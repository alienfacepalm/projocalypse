#!/usr/bin/env node
/**
 * Refresh Talemail MVP board JSON from the talemail repo (when present) and
 * copy into public/imports/ as an optional mirror for manual file access.
 *
 * Usage:
 *   node scripts/sync-talemail-import.mjs
 *   pnpm import:talemail
 */

import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')
const importsDir = resolve(repoRoot, 'imports')
const publicDir = resolve(repoRoot, 'public/imports')
const bundleName = 'talemail-mvp-projocalypse-import.json'
const talemailGenerator = resolve(repoRoot, '../talemail/scripts/generate-projocalypse-mvp-board.mjs')

mkdirSync(importsDir, { recursive: true })
mkdirSync(publicDir, { recursive: true })

if (existsSync(talemailGenerator)) {
  const result = spawnSync('node', [talemailGenerator], { stdio: 'inherit', cwd: resolve(repoRoot, '../talemail') })
  if (result.status !== 0) process.exit(result.status ?? 1)
} else {
  console.warn('Talemail repo not found — using existing imports/%s', bundleName)
}

const source = resolve(importsDir, bundleName)
if (!existsSync(source)) {
  console.error('Missing %s — run generate-projocalypse-mvp-board.mjs in talemail first.', source)
  process.exit(1)
}

copyFileSync(source, resolve(publicDir, bundleName))
console.log('Synced %s → public/imports/%s', source, bundleName)
