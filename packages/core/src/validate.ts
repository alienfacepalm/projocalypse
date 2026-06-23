import type { PlanItem } from '@projocalypse/plan'
import type {
  BoardSnapshot,
  BoardTaskSnapshot,
  PackageLink,
  PackageRegistryEntry,
  PendingSync,
  PendingTaskUpsert,
  WorkspaceConfig,
} from './types.js'
import { BOARD_SNAPSHOT_VERSION, PACKAGE_LINK_VERSION, PENDING_SYNC_VERSION, WORKSPACE_VERSION } from './types.js'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireString(obj: Record<string, unknown>, key: string, label: string): string {
  const value = obj[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string.`)
  }
  return value
}

export function validateWorkspaceConfig(raw: unknown): WorkspaceConfig {
  if (!isObject(raw)) throw new Error('workspace.json must be an object.')
  if (raw.version !== WORKSPACE_VERSION) {
    throw new Error(`Unsupported workspace version (${String(raw.version)}).`)
  }
  if (!isObject(raw.packages)) throw new Error('workspace.json packages must be an object.')

  const packages: Record<string, PackageRegistryEntry> = {}
  for (const [name, entryRaw] of Object.entries(raw.packages)) {
    if (!isObject(entryRaw)) throw new Error(`packages.${name} must be an object.`)
    const planGlobsRaw = entryRaw.planGlobs
    if (!Array.isArray(planGlobsRaw) || planGlobsRaw.some((g) => typeof g !== 'string')) {
      throw new Error(`packages.${name}.planGlobs must be a string array.`)
    }
    const entry: PackageRegistryEntry = {
      planGlobs: planGlobsRaw as string[],
    }
    if (entryRaw.defaultSection !== undefined) {
      entry.defaultSection = requireString(entryRaw, 'defaultSection', `packages.${name}.defaultSection`)
    }
    if (entryRaw.doneSection !== undefined) {
      entry.doneSection = requireString(entryRaw, 'doneSection', `packages.${name}.doneSection`)
    }
    if (entryRaw.sections !== undefined) {
      if (!Array.isArray(entryRaw.sections) || entryRaw.sections.some((s) => typeof s !== 'string')) {
        throw new Error(`packages.${name}.sections must be a string array.`)
      }
      entry.sections = entryRaw.sections as string[]
    }
    if (entryRaw.standaloneOnly !== undefined) {
      if (typeof entryRaw.standaloneOnly !== 'boolean') {
        throw new Error(`packages.${name}.standaloneOnly must be boolean.`)
      }
      entry.standaloneOnly = entryRaw.standaloneOnly
    }
    if (entryRaw.embed !== undefined) {
      if (!isObject(entryRaw.embed)) throw new Error(`packages.${name}.embed must be an object.`)
      entry.embed = {}
      if (entryRaw.embed.app !== undefined) {
        entry.embed.app = requireString(entryRaw.embed, 'app', `packages.${name}.embed.app`)
      }
      if (entryRaw.embed.route !== undefined) {
        entry.embed.route = requireString(entryRaw.embed, 'route', `packages.${name}.embed.route`)
      }
      if (entryRaw.embed.hostEntityField !== undefined) {
        entry.embed.hostEntityField = requireString(
          entryRaw.embed,
          'hostEntityField',
          `packages.${name}.embed.hostEntityField`,
        )
      }
    }
    packages[name] = entry
  }

  return { version: WORKSPACE_VERSION, packages }
}

export function validatePackageLink(raw: unknown): PackageLink {
  if (!isObject(raw)) throw new Error('Package link must be an object.')
  if (raw.version !== PACKAGE_LINK_VERSION) {
    throw new Error(`Unsupported link version (${String(raw.version)}).`)
  }
  return {
    version: PACKAGE_LINK_VERSION,
    packageName: requireString(raw, 'packageName', 'packageName'),
    hostProjectId: requireString(raw, 'hostProjectId', 'hostProjectId'),
    hostEntityId:
      raw.hostEntityId === null || raw.hostEntityId === undefined
        ? null
        : requireString(raw, 'hostEntityId', 'hostEntityId'),
    lastSyncedAt: requireString(raw, 'lastSyncedAt', 'lastSyncedAt'),
  }
}

export function validateBoardSnapshot(raw: unknown): BoardSnapshot {
  if (!isObject(raw)) throw new Error('Board snapshot must be an object.')
  if (raw.version !== BOARD_SNAPSHOT_VERSION) {
    throw new Error(`Unsupported board snapshot version (${String(raw.version)}).`)
  }
  if (!Array.isArray(raw.tasks)) throw new Error('Board snapshot tasks must be an array.')

  const tasks: BoardTaskSnapshot[] = (raw.tasks as unknown[]).map((taskRaw, index) => {
    if (!isObject(taskRaw)) throw new Error(`tasks[${index}] must be an object.`)
    return {
      id: requireString(taskRaw, 'id', `tasks[${index}].id`),
      planItemId:
        taskRaw.planItemId === null || taskRaw.planItemId === undefined
          ? null
          : requireString(taskRaw, 'planItemId', `tasks[${index}].planItemId`),
      title: requireString(taskRaw, 'title', `tasks[${index}].title`),
      completed: typeof taskRaw.completed === 'boolean' ? taskRaw.completed : false,
      sectionName: requireString(taskRaw, 'sectionName', `tasks[${index}].sectionName`),
      priority:
        taskRaw.priority === 'low' ||
        taskRaw.priority === 'medium' ||
        taskRaw.priority === 'high' ||
        taskRaw.priority === 'none'
          ? taskRaw.priority
          : 'none',
    }
  })

  return {
    version: BOARD_SNAPSHOT_VERSION,
    packageName: requireString(raw, 'packageName', 'packageName'),
    hostProjectId: requireString(raw, 'hostProjectId', 'hostProjectId'),
    exportedAt: requireString(raw, 'exportedAt', 'exportedAt'),
    tasks,
  }
}

export function validatePendingSync(raw: unknown): PendingSync {
  if (!isObject(raw)) throw new Error('Pending sync must be an object.')
  if (raw.version !== PENDING_SYNC_VERSION) {
    throw new Error(`Unsupported pending sync version (${String(raw.version)}).`)
  }
  if (!Array.isArray(raw.sections)) throw new Error('Pending sync sections must be an array.')
  if (!Array.isArray(raw.upserts)) throw new Error('Pending sync upserts must be an array.')

  const upserts: PendingTaskUpsert[] = (raw.upserts as unknown[]).map((itemRaw, index) => {
    if (!isObject(itemRaw)) throw new Error(`upserts[${index}] must be an object.`)
    return {
      planItemId: requireString(itemRaw, 'planItemId', `upserts[${index}].planItemId`),
      title: requireString(itemRaw, 'title', `upserts[${index}].title`),
      completed: typeof itemRaw.completed === 'boolean' ? itemRaw.completed : false,
      sectionName: requireString(itemRaw, 'sectionName', `upserts[${index}].sectionName`),
      priority:
        itemRaw.priority === 'low' ||
        itemRaw.priority === 'medium' ||
        itemRaw.priority === 'high' ||
        itemRaw.priority === 'none'
          ? itemRaw.priority
          : 'none',
      description: typeof itemRaw.description === 'string' ? itemRaw.description : undefined,
    }
  })

  const seedPolicyRaw = raw.seedPolicy
  const seedPolicy =
    seedPolicyRaw === 'skip-if-exists' ||
    seedPolicyRaw === 'replace-sprint-section' ||
    seedPolicyRaw === 'merge-new-only'
      ? seedPolicyRaw
      : 'merge-new-only'

  return {
    version: PENDING_SYNC_VERSION,
    packageName: requireString(raw, 'packageName', 'packageName'),
    hostProjectId:
      raw.hostProjectId === null || raw.hostProjectId === undefined
        ? null
        : requireString(raw, 'hostProjectId', 'hostProjectId'),
    generatedAt: requireString(raw, 'generatedAt', 'generatedAt'),
    seedPolicy,
    sections: raw.sections as string[],
    projectName: typeof raw.projectName === 'string' ? raw.projectName : undefined,
    projectColor: typeof raw.projectColor === 'string' ? raw.projectColor : undefined,
    upserts,
  }
}

export function buildPendingFromPlan(
  packageName: string,
  planItems: PlanItem[],
  entry: PackageRegistryEntry,
  options: {
    hostProjectId?: string | null
    seedPolicy?: PendingSync['seedPolicy']
    existingPlanIds?: Set<string>
  } = {},
): PendingSync {
  const sections = entry.sections ?? ['Backlog', 'Sprint', 'In Review', 'Done']
  const defaultSection = entry.defaultSection ?? sections[0] ?? 'Backlog'
  const doneSection = entry.doneSection ?? sections[sections.length - 1] ?? 'Done'
  const existing = options.existingPlanIds ?? new Set<string>()
  const seedPolicy = options.seedPolicy ?? 'merge-new-only'

  const upserts: PendingTaskUpsert[] = []
  for (const item of planItems) {
    if (seedPolicy === 'merge-new-only' && existing.has(item.id)) continue

    let sectionName = item.section ?? defaultSection
    if (item.done && !item.section) sectionName = doneSection

    const description = item.description?.trim() ?? ''
    upserts.push({
      planItemId: item.id,
      title: item.title,
      completed: item.done,
      sectionName,
      priority: item.priority,
      description,
    })
  }

  return {
    version: PENDING_SYNC_VERSION,
    packageName,
    hostProjectId: options.hostProjectId ?? null,
    generatedAt: new Date().toISOString(),
    seedPolicy,
    sections,
    projectName: packageName,
    projectColor: '#4573D2',
    upserts,
  }
}

export function boardSnapshotFromTasks(
  packageName: string,
  hostProjectId: string,
  tasks: BoardTaskSnapshot[],
): BoardSnapshot {
  return {
    version: BOARD_SNAPSHOT_VERSION,
    packageName,
    hostProjectId,
    exportedAt: new Date().toISOString(),
    tasks,
  }
}
