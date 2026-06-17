import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { analyzeGap, formatGapReport, gapReportHasBlocking } from '@projocalypse/gap'
import { countPlanItems } from '@projocalypse/plan'
import { buildPendingFromPlan, resolveProjocalypsePaths } from '@projocalypse/core'
import {
  cachePlan,
  existingPlanIdsFromBoard,
  findRepoRoot,
  integrationChecks,
  loadBoardSnapshot,
  loadPackageContext,
  loadPackageLink,
  loadWorkspace,
  resolveTargetPackages,
  writePending,
} from '../context.js'
import { flagBool, flagString, type parseArgs } from '../util.js'

type Args = ReturnType<typeof parseArgs>

export async function runGap(args: Args): Promise<void> {
  const root = findRepoRoot(flagString(args.flags, 'root') ?? process.cwd())
  const packages = resolveTargetPackages(root, flagString(args.flags, 'package'), flagBool(args.flags, 'all'))
  const failOn = flagString(args.flags, 'fail-on')
  const failCodes = failOn ? new Set(failOn.split(',').map((s) => s.trim())) : undefined

  let exitCode = 0
  for (const packageName of packages) {
    const ctx = loadPackageContext(root, packageName)
    cachePlan(root, packageName, ctx)
    const board = loadBoardSnapshot(root, packageName)
    const checks = integrationChecks(root, packageName, ctx.entry)

    const report = analyzeGap({
      packageName,
      planItems: ctx.planItems,
      board,
      registryEntry: ctx.entry,
      ...checks,
    })

    console.log(formatGapReport(report))
    console.log('---')

    if (gapReportHasBlocking(report, failCodes)) exitCode = 1
  }

  if (exitCode !== 0) process.exitCode = exitCode
}

export async function runPlan(args: Args): Promise<void> {
  const root = findRepoRoot(flagString(args.flags, 'root') ?? process.cwd())
  const sub = args.positional[0] ?? 'parse'
  if (sub !== 'parse') throw new Error(`Unknown plan subcommand: ${sub}`)

  const packageName = flagString(args.flags, 'package')
  if (!packageName) throw new Error('Missing --package')

  const ctx = loadPackageContext(root, packageName)
  cachePlan(root, packageName, ctx)
  const summary = countPlanItems(ctx.planItems)

  console.log(`${packageName} — ${summary.total} plan items (${summary.done} done, ${summary.open} open)`)
  for (const item of ctx.planItems) {
    const status = item.done ? 'x' : ' '
    console.log(`  [${status}] ${item.id}  ${item.title}  (${item.section ?? '-'})`)
  }
}

export async function runSync(args: Args): Promise<void> {
  const root = findRepoRoot(flagString(args.flags, 'root') ?? process.cwd())
  const packages = resolveTargetPackages(root, flagString(args.flags, 'package'), flagBool(args.flags, 'all'))
  const dryRun = flagBool(args.flags, 'dry-run')

  for (const packageName of packages) {
    const ctx = loadPackageContext(root, packageName)
    const packageLink = loadPackageLink(root, packageName)
    const existing = existingPlanIdsFromBoard(root, packageName)

    const pending = buildPendingFromPlan(packageName, ctx.planItems, ctx.entry, {
      hostProjectId: packageLink?.hostProjectId ?? null,
      seedPolicy: 'merge-new-only',
      existingPlanIds: existing,
    })

    console.log(`${packageName} — ${pending.upserts.length} pending upsert(s)`)
    if (dryRun) {
      for (const upsert of pending.upserts) {
        console.log(`  ${upsert.planItemId}  ${upsert.title} → ${upsert.sectionName}`)
      }
      continue
    }

    const out = writePending(root, packageName, pending)
    console.log(`  wrote ${out}`)
    console.log('  browser: fetch pending from /.projocalypse/pending/ on embed mount')
  }
}

export async function runStatus(args: Args): Promise<void> {
  const root = findRepoRoot(flagString(args.flags, 'root') ?? process.cwd())
  const workspace = loadWorkspace(root)
  if (!workspace) {
    console.log('Not initialized — run projocalypse init')
    return
  }

  const packages = resolveTargetPackages(root, flagString(args.flags, 'package'), flagBool(args.flags, 'all'))

  for (const packageName of packages) {
    const entry = workspace.packages[packageName]
    if (!entry) continue
    let planSummary = { done: 0, open: 0, total: 0 }
    try {
      const ctx = loadPackageContext(root, packageName)
      planSummary = countPlanItems(ctx.planItems)
    } catch {
      // plan not readable
    }
    const board = loadBoardSnapshot(root, packageName)
    const link = loadPackageLink(root, packageName)
    const checks = integrationChecks(root, packageName, entry)

    console.log(packageName)
    console.log(`  link: ${link?.hostProjectId ?? '(none)'}`)
    console.log(`  plan: ${planSummary.done}/${planSummary.total} done`)
    console.log(`  board snapshot: ${board?.tasks.length ?? 0} tasks`)
    console.log(`  scripts: ${checks.hasPmScripts ? 'ok' : 'missing'}`)
    console.log(`  embed: ${checks.hasEmbedMount ? 'ok' : 'missing'}`)
  }
}

export async function runDoctor(args: Args): Promise<void> {
  const root = findRepoRoot(flagString(args.flags, 'root') ?? process.cwd())
  const workspace = loadWorkspace(root)
  let ok = true

  console.log(`Projocalypse doctor — ${root}`)

  if (!workspace) {
    console.log('  ✗ missing .projocalypse/workspace.json')
    ok = false
  } else {
    console.log(`  ✓ workspace.json (${Object.keys(workspace.packages).length} packages)`)
  }

  const paths = resolveProjocalypsePaths(root)
  for (const label of ['linksDir', 'boardDir', 'pendingDir', 'planCacheDir'] as const) {
    const path = paths[label]
    console.log(`  ${existsSync(path) ? '✓' : '✗'} ${path}`)
    if (!existsSync(path)) ok = false
  }

  const rootPkg = join(root, 'package.json')
  if (existsSync(rootPkg)) {
    const pkg = JSON.parse((await import('node:fs')).readFileSync(rootPkg, 'utf8')) as {
      scripts?: Record<string, string>
    }
    const hasRootPm = Boolean(pkg.scripts?.['pm:doctor'])
    console.log(`  ${hasRootPm ? '✓' : '✗'} root pm:* scripts`)
    if (!hasRootPm) ok = false
  }

  if (!ok) process.exitCode = 1
  else console.log('\nAll checks passed.')
}

export async function runBoardExport(args: Args): Promise<void> {
  const packageName = flagString(args.flags, 'package')
  if (!packageName) throw new Error('Missing --package')
  console.log(
    'board export writes .projocalypse/board/ from the browser.\n' +
      'Use writeBoardSnapshot() from @projocalypse/core in the host app after loading tasks.',
  )
}
