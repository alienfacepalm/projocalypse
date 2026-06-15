import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { countPlanItems, parsePlanFiles } from '@projocalypse/plan'
import {
  DEFAULT_SECTIONS,
  boardPath,
  buildPendingFromPlan,
  linkPath,
  pendingPath,
  planCachePath,
  resolveProjocalypsePaths,
  validateBoardSnapshot,
  validatePackageLink,
  validateWorkspaceConfig,
  type PackageRegistryEntry,
  type WorkspaceConfig,
} from '@projocalypse/core'
import {
  expandGlobs,
  findPackageDir,
  findRepoRoot,
  packageHasPmScripts,
  readTextIfExists,
  writeJsonFile,
} from './util.js'

export interface LoadedPackageContext {
  root: string
  packageName: string
  workspace: WorkspaceConfig
  entry: PackageRegistryEntry
  planItems: ReturnType<typeof parsePlanFiles>['items']
}

export function loadWorkspace(root: string): WorkspaceConfig | null {
  const path = resolveProjocalypsePaths(root).workspace
  const text = readTextIfExists(path)
  if (!text) return null
  return validateWorkspaceConfig(JSON.parse(text))
}

export function loadPackageContext(root: string, packageName: string): LoadedPackageContext {
  const workspace = loadWorkspace(root)
  if (!workspace) {
    throw new Error('Missing .projocalypse/workspace.json — run projocalypse init first.')
  }
  const entry = workspace.packages[packageName]
  if (!entry) {
    throw new Error(`Package ${packageName} is not registered in workspace.json.`)
  }

  const files = expandGlobs(root, entry.planGlobs)
  const parsed = parsePlanFiles(
    files.map((path) => ({ path: path.replace(/\\/g, '/'), content: readTextIfExists(path) ?? '' })),
    {
      defaultSection: entry.defaultSection ?? entry.sections?.[0],
      doneSection: entry.doneSection ?? entry.sections?.[entry.sections.length - 1],
    },
  )

  return {
    root,
    packageName,
    workspace,
    entry,
    planItems: parsed.items,
  }
}

export function cachePlan(root: string, packageName: string, ctx: LoadedPackageContext): void {
  const paths = resolveProjocalypsePaths(root)
  writeJsonFile(planCachePath(paths, packageName), {
    packageName,
    generatedAt: new Date().toISOString(),
    files: expandGlobs(root, ctx.entry.planGlobs),
    items: ctx.planItems,
    summary: countPlanItems(ctx.planItems),
  })
}

export function loadBoardSnapshot(root: string, packageName: string) {
  const paths = resolveProjocalypsePaths(root)
  const text = readTextIfExists(boardPath(paths, packageName))
  if (!text) return null
  return validateBoardSnapshot(JSON.parse(text))
}

export function loadPackageLink(root: string, packageName: string) {
  const paths = resolveProjocalypsePaths(root)
  const text = readTextIfExists(linkPath(paths, packageName))
  if (!text) return null
  return validatePackageLink(JSON.parse(text))
}

export function existingPlanIdsFromBoard(root: string, packageName: string): Set<string> {
  const board = loadBoardSnapshot(root, packageName)
  const ids = new Set<string>()
  if (!board) return ids
  for (const task of board.tasks) {
    if (task.planItemId) ids.add(task.planItemId)
  }
  return ids
}

export function integrationChecks(root: string, packageName: string, entry: PackageRegistryEntry) {
  const pkgDir = findPackageDir(root, packageName)
  const packageJsonPath = pkgDir ? join(pkgDir, 'package.json') : null
  const embedStub = entry.embed?.app
    ? readTextIfExists(join(root, entry.embed.app, 'src', 'projocalypse-embed.tsx'))
    : null

  return {
    hasLink: loadPackageLink(root, packageName) !== null,
    hasEmbedMount: Boolean(embedStub) || !entry.embed,
    hasPmScripts: packageJsonPath ? packageHasPmScripts(packageJsonPath) : false,
  }
}

export function defaultRegistryEntry(packageDir: string, root: string): PackageRegistryEntry {
  const rel = packageDir.replace(/\\/g, '/').replace(root.replace(/\\/g, '/'), '').replace(/^\//, '')
  const planGlobs = [
    `${rel}/doc/PLAN/**/*.md`,
    `${rel}/doc/PLAN/*.md`,
    `doc/PLAN/${rel.split('/').pop()?.toUpperCase() ?? 'APP'}.md`,
  ]
  return {
    planGlobs,
    defaultSection: DEFAULT_SECTIONS[0],
    doneSection: DEFAULT_SECTIONS[DEFAULT_SECTIONS.length - 1],
    sections: [...DEFAULT_SECTIONS],
  }
}

export function ensureProjocalypseDirs(root: string): void {
  const paths = resolveProjocalypsePaths(root)
  for (const dir of [paths.root, paths.linksDir, paths.boardDir, paths.pendingDir, paths.planCacheDir]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  }
}

export function writePending(root: string, packageName: string, pending: ReturnType<typeof buildPendingFromPlan>): string {
  const paths = resolveProjocalypsePaths(root)
  const out = pendingPath(paths, packageName)
  writeJsonFile(out, pending)
  return out
}

export function resolveTargetPackages(root: string, packageFlag?: string, all?: boolean): string[] {
  const workspace = loadWorkspace(root)
  if (!workspace) throw new Error('Missing workspace.json')
  if (packageFlag) return [packageFlag]
  if (all) return Object.keys(workspace.packages)
  throw new Error('Specify --package <name> or --all')
}

export { findRepoRoot, resolveProjocalypsePaths, pendingPath, buildPendingFromPlan }
