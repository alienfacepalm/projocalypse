import { countPlanItems, type PlanItem } from '@projocalypse/plan'
import type { BoardSnapshot, GapItem, GapReport, PackageRegistryEntry } from '@projocalypse/core'

export interface AnalyzeGapOptions {
  packageName: string
  planItems: PlanItem[]
  board: BoardSnapshot | null
  registryEntry: PackageRegistryEntry | null
  hasLink: boolean
  hasEmbedMount: boolean
  hasPmScripts: boolean
}

function boardByPlanId(board: BoardSnapshot | null): Map<string, BoardSnapshot['tasks'][number]> {
  const map = new Map<string, BoardSnapshot['tasks'][number]>()
  if (!board) return map
  for (const task of board.tasks) {
    if (task.planItemId) map.set(task.planItemId, task)
  }
  return map
}

function summarizeBoard(board: BoardSnapshot | null): { done: number; open: number; total: number } {
  if (!board) return { done: 0, open: 0, total: 0 }
  const done = board.tasks.filter((t) => t.completed).length
  return { done, open: board.tasks.length - done, total: board.tasks.length }
}

/** Compare plan items against a board snapshot and integration scaffolding. */
export function analyzeGap(options: AnalyzeGapOptions): GapReport {
  const gaps: GapItem[] = []
  const planSummary = countPlanItems(options.planItems)
  const boardSummary = summarizeBoard(options.board)
  const boardMap = boardByPlanId(options.board)

  if (!options.registryEntry) {
    gaps.push({
      code: 'NO_REGISTRY',
      message: `Package ${options.packageName} is not registered in .projocalypse/workspace.json.`,
      blocking: true,
    })
  }

  if (!options.hasLink) {
    gaps.push({
      code: 'NO_LINK',
      message: `No hostProjectId link for ${options.packageName} in .projocalypse/links/.`,
      blocking: true,
    })
  }

  if (options.registryEntry?.embed && !options.hasEmbedMount) {
    gaps.push({
      code: 'NO_EMBED',
      message: `Embed route/mount missing for ${options.packageName} (expected ${options.registryEntry.embed.route ?? 'host route'}).`,
      blocking: false,
    })
  }

  if (!options.hasPmScripts) {
    gaps.push({
      code: 'NO_SCRIPTS',
      message: `package.json is missing pm:* control scripts for ${options.packageName}.`,
      blocking: false,
    })
  }

  for (const item of options.planItems) {
    const boardTask = boardMap.get(item.id)
    if (!boardTask) {
      if (!item.done) {
        gaps.push({
          code: 'MISSING_ON_BOARD',
          planItemId: item.id,
          title: item.title,
          message: `Plan item ${item.id} is open but missing on the board.`,
          source: item.source,
          blocking: true,
        })
      }
      continue
    }

    if (item.done !== boardTask.completed) {
      gaps.push({
        code: 'STATUS_MISMATCH',
        planItemId: item.id,
        title: item.title,
        message: `Plan ${item.done ? 'done' : 'open'} vs board ${boardTask.completed ? 'done' : 'open'} for ${item.id}.`,
        source: item.source,
        blocking: true,
      })
    }

    const expectedSection = item.section ?? options.registryEntry?.defaultSection ?? null
    if (expectedSection && boardTask.sectionName !== expectedSection && !item.done) {
      gaps.push({
        code: 'SECTION_DRIFT',
        planItemId: item.id,
        title: item.title,
        message: `Expected section "${expectedSection}" but board has "${boardTask.sectionName}" for ${item.id}.`,
        source: item.source,
        blocking: false,
      })
    }
  }

  const planIds = new Set(options.planItems.map((item) => item.id))
  if (options.board) {
    for (const task of options.board.tasks) {
      if (task.planItemId && !planIds.has(task.planItemId)) {
        gaps.push({
          code: 'MISSING_FROM_PLAN',
          planItemId: task.planItemId,
          title: task.title,
          message: `Board task ${task.planItemId} has no matching plan item.`,
          blocking: false,
        })
      }
    }
  }

  const blockingCount = gaps.filter((gap) => gap.blocking).length

  return {
    packageName: options.packageName,
    generatedAt: new Date().toISOString(),
    planSummary,
    boardSummary,
    gaps,
    blockingCount,
  }
}

export function formatGapReport(report: GapReport): string {
  const lines: string[] = [
    `${report.packageName} — ${report.gaps.length} gap(s) (${report.blockingCount} blocking)`,
    `Plan: ${report.planSummary.done} done / ${report.planSummary.open} open / ${report.planSummary.total} total`,
    `Board: ${report.boardSummary.done} done / ${report.boardSummary.open} open / ${report.boardSummary.total} total`,
    '',
  ]

  if (report.gaps.length === 0) {
    lines.push('No gaps — plan and board are aligned.')
    return lines.join('\n')
  }

  const byCode = new Map<string, GapItem[]>()
  for (const gap of report.gaps) {
    const list = byCode.get(gap.code) ?? []
    list.push(gap)
    byCode.set(gap.code, list)
  }

  for (const [code, items] of byCode) {
    lines.push(`${code} (${items.length})`)
    for (const item of items) {
      const loc = item.source ? ` (${item.source.file}:${item.source.line})` : ''
      lines.push(`  ${item.planItemId ?? '-'}  ${item.title ?? ''}  ${item.message}${loc}`)
    }
    lines.push('')
  }

  lines.push(`Suggested: pnpm pm:sync --package ${report.packageName}`)
  return lines.join('\n')
}

export function gapReportHasBlocking(
  report: GapReport,
  codes?: Set<string>,
): boolean {
  return report.gaps.some((gap) => {
    if (!gap.blocking) return false
    if (codes && !codes.has(gap.code)) return false
    return true
  })
}
