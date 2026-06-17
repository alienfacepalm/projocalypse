import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

export function findRepoRoot(start = process.cwd()): string {
  let dir = resolve(start)
  while (true) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml')) || existsSync(join(dir, '.git'))) {
      return dir
    }
    const parent = dirname(dir)
    if (parent === dir) return resolve(start)
    dir = parent
  }
}

export function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

export function writeJsonFile(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

export function readTextIfExists(path: string): string | null {
  if (!existsSync(path)) return null
  return readFileSync(path, 'utf8')
}

function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/\\/g, '/')
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '§§')
    .replace(/\*/g, '[^/]*')
    .replace(/§§/g, '.*')
  return new RegExp(`^${escaped}$`)
}

function walkFiles(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) walkFiles(full, acc)
    else acc.push(full)
  }
  return acc
}

export function expandGlobs(root: string, globs: string[]): string[] {
  const allFiles = walkFiles(root)
  const relFiles = allFiles.map((file) => relative(root, file).replace(/\\/g, '/'))
  const matched = new Set<string>()

  for (const pattern of globs) {
    const normalized = pattern.replace(/\\/g, '/')
    const regex = globToRegex(normalized)
    for (const rel of relFiles) {
      if (regex.test(rel)) matched.add(join(root, rel))
    }
  }

  return [...matched].sort()
}

export interface DiscoveredPackage {
  name: string
  dir: string
  packageJsonPath: string
}

export function discoverWorkspacePackages(root: string): DiscoveredPackage[] {
  const results: DiscoveredPackage[] = []
  const workspaceFile = join(root, 'pnpm-workspace.yaml')
  if (!existsSync(workspaceFile)) return results

  const seen = new Set<string>()
  const queue = [root]

  while (queue.length > 0) {
    const dir = queue.pop()!
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (!statSync(full).isDirectory()) continue
      if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue
      queue.push(full)

      const pkgPath = join(full, 'package.json')
      if (!existsSync(pkgPath)) continue
      try {
        const pkg = readJsonFile<{ name?: string }>(pkgPath)
        if (!pkg.name || seen.has(pkg.name)) continue
        seen.add(pkg.name)
        results.push({ name: pkg.name, dir: full, packageJsonPath: pkgPath })
      } catch {
        // skip invalid package.json
      }
    }
  }

  return results.sort((a, b) => a.name.localeCompare(b.name))
}

export function patchPackageScripts(
  packageJsonPath: string,
  scripts: Record<string, string>,
  force = false,
): boolean {
  const pkg = readJsonFile<{ scripts?: Record<string, string> }>(packageJsonPath)
  pkg.scripts ??= {}
  let changed = false
  for (const [key, value] of Object.entries(scripts)) {
    if (force || !pkg.scripts[key]) {
      pkg.scripts[key] = value
      changed = true
    }
  }
  if (changed) writeJsonFile(packageJsonPath, pkg)
  return changed
}

export function packageHasPmScripts(packageJsonPath: string): boolean {
  if (!existsSync(packageJsonPath)) return false
  const pkg = readJsonFile<{ scripts?: Record<string, string> }>(packageJsonPath)
  const scripts = pkg.scripts ?? {}
  return Boolean(scripts['pm:gap'] && scripts['pm:sync'])
}

export function findPackageDir(root: string, packageName: string): string | null {
  const discovered = discoverWorkspacePackages(root)
  return discovered.find((pkg) => pkg.name === packageName)?.dir ?? null
}

export function parseArgs(argv: string[]): {
  command: string
  flags: Record<string, string | boolean>
  positional: string[]
} {
  const [, , command = 'help', ...rest] = argv
  const flags: Record<string, string | boolean> = {}
  const positional: string[] = []

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]!
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const next = rest[i + 1]
      if (next && !next.startsWith('--')) {
        flags[key] = next
        i++
      } else {
        flags[key] = true
      }
    } else {
      positional.push(arg)
    }
  }

  return { command, flags, positional }
}

export function flagString(flags: Record<string, string | boolean>, key: string): string | undefined {
  const value = flags[key]
  return typeof value === 'string' ? value : undefined
}

export function flagBool(flags: Record<string, string | boolean>, key: string): boolean {
  return flags[key] === true
}
