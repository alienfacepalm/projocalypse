import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { WORKSPACE_VERSION, type PackageRegistryEntry } from '@projocalypse/core'
import {
  discoverWorkspacePackages,
  findRepoRoot,
  flagString,
  patchPackageScripts,
  writeJsonFile,
} from '../util.js'
import {
  defaultRegistryEntry,
  ensureProjocalypseDirs,
  loadWorkspace,
  resolveProjocalypsePaths,
} from '../context.js'

function copyDir(src: string, dest: string): void {
  if (!existsSync(src)) return
  mkdirSync(dest, { recursive: true })
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry)
    const destPath = join(dest, entry)
    if (statSync(srcPath).isDirectory()) copyDir(srcPath, destPath)
    else copyFileSync(srcPath, destPath)
  }
}

function detectProjocalypsePackage(root: string): string | null {
  const candidates = [
    join(root, 'packages', 'projocalypse'),
    join(root, 'vendor', 'projocalypse'),
    join(root, 'projocalypse'),
  ]
  for (const path of candidates) {
    if (existsSync(join(path, 'package.json'))) return path
  }
  return null
}

function scaffoldEmbedStub(root: string, appRel: string, packageName: string): void {
  const appDir = join(root, appRel)
  const stubPath = join(appDir, 'src', 'projocalypse-embed.tsx')
  if (existsSync(stubPath)) return
  mkdirSync(join(appDir, 'src'), { recursive: true })
  const content = `import App from '@projocalypse/react'
import type { EmbedConfig } from '@projocalypse/react'

export interface ProjocalypseEmbedProps {
  hostProjectId: string
  productName: string
  hostEntityId?: string
}

/** Mount Projocalypse sprint board for ${packageName}. */
export function ProjocalypseEmbed({ hostProjectId, productName, hostEntityId }: ProjocalypseEmbedProps) {
  const embed: Partial<EmbedConfig> = {
    embedded: true,
    hostProjectId,
    hostEntityId: hostEntityId ?? null,
    packageName: '${packageName}',
    productName,
    tagline: 'Production sprint',
    hideSidebar: true,
    hideProjectSwitcher: true,
    pendingSyncUrl: '/.projocalypse/pending/${packageName.replace(/^@/, '').replace(/\//g, '__')}.json',
  }
  return <App embed={embed} />
}
`
  writeFileSync(stubPath, content, 'utf8')
}

export async function runInit(flags: Record<string, string | boolean>): Promise<void> {
  const root = findRepoRoot(flagString(flags, 'root') ?? process.cwd())
  const dryRun = flags['dry-run'] === true

  console.log(`Projocalypse init — repo root: ${root}`)

  const packages = discoverWorkspacePackages(root)
  if (packages.length === 0) {
    console.warn('No workspace packages discovered. Register packages manually in workspace.json.')
  }

  const workspacePath = resolveProjocalypsePaths(root).workspace
  let workspace = loadWorkspace(root)
  if (!workspace) {
    workspace = { version: WORKSPACE_VERSION, packages: {} }
  }

  for (const pkg of packages) {
    if (pkg.name.startsWith('@projocalypse/')) continue
    if (!workspace.packages[pkg.name]) {
      workspace.packages[pkg.name] = defaultRegistryEntry(pkg.dir, root)
      console.log(`  + registered ${pkg.name}`)
    }
  }

  const projPath = detectProjocalypsePackage(root)
  if (projPath) console.log(`  found Projocalypse at ${projPath}`)

  if (!dryRun) {
    ensureProjocalypseDirs(root)
    writeJsonFile(workspacePath, workspace)

    const rootPkgPath = join(root, 'package.json')
    if (existsSync(rootPkgPath)) {
      patchPackageScripts(rootPkgPath, {
        'pm:init': 'projocalypse init',
        'pm:doctor': 'projocalypse doctor',
        'pm:gap': 'projocalypse gap --all',
        'pm:sync': 'projocalypse sync --all',
        'pm:status': 'projocalypse status --all',
      })
    }

    for (const pkg of packages) {
      if (pkg.name.startsWith('@projocalypse/')) continue
      patchPackageScripts(pkg.packageJsonPath, {
        'pm:plan': `projocalypse plan parse --package ${pkg.name}`,
        'pm:gap': `projocalypse gap --package ${pkg.name}`,
        'pm:sync': `projocalypse sync --package ${pkg.name}`,
        'pm:status': `projocalypse status --package ${pkg.name}`,
        'pm:export': `projocalypse board export --package ${pkg.name}`,
      })
    }

    for (const [name, entry] of Object.entries(workspace.packages) as [string, PackageRegistryEntry][]) {
      if (entry.embed?.app) scaffoldEmbedStub(root, entry.embed.app, name)
    }

    const templatesSrc = join(root, 'packages', 'projocalypse', 'templates', 'cursor')
    if (!existsSync(templatesSrc)) {
      const localTemplates = join(root, 'templates', 'cursor')
      if (existsSync(localTemplates)) {
        copyDir(localTemplates, join(root, '.cursor', 'projocalypse-host'))
        console.log('  copied Cursor host templates to .cursor/projocalypse-host/')
      }
    } else {
      copyDir(templatesSrc, join(root, '.cursor', 'projocalypse-host'))
      console.log('  copied Cursor host templates to .cursor/projocalypse-host/')
    }
  }

  console.log('\nNext steps:')
  console.log('  1. Edit .projocalypse/workspace.json planGlobs if needed')
  console.log('  2. Merge .cursor/projocalypse-host/ → .cursor/rules, skills, commands (see templates/cursor/README.md)')
  console.log('  3. Add pm:ID checkboxes to plan markdown (see doc/MONOREPO.md)')
  console.log('  4. pnpm pm:plan && pnpm pm:gap && pnpm pm:sync')
  console.log('  5. Mount ProjocalypseEmbed in your host app route')
}
