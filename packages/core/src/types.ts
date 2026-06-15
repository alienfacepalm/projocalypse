export const WORKSPACE_VERSION = 1 as const
export const PENDING_SYNC_VERSION = 1 as const
export const BOARD_SNAPSHOT_VERSION = 1 as const
export const PACKAGE_LINK_VERSION = 1 as const

export interface PackageEmbedConfig {
  app?: string
  route?: string
  hostEntityField?: string
}

export interface PackageRegistryEntry {
  planGlobs: string[]
  defaultSection?: string
  doneSection?: string
  sections?: string[]
  standaloneOnly?: boolean
  embed?: PackageEmbedConfig
}

export interface WorkspaceConfig {
  version: typeof WORKSPACE_VERSION
  packages: Record<string, PackageRegistryEntry>
}

export interface PackageLink {
  version: typeof PACKAGE_LINK_VERSION
  packageName: string
  hostProjectId: string
  hostEntityId?: string | null
  lastSyncedAt: string
}

export interface BoardTaskSnapshot {
  id: string
  planItemId: string | null
  title: string
  completed: boolean
  sectionName: string
  priority: 'none' | 'low' | 'medium' | 'high'
}

export interface BoardSnapshot {
  version: typeof BOARD_SNAPSHOT_VERSION
  packageName: string
  hostProjectId: string
  exportedAt: string
  tasks: BoardTaskSnapshot[]
}

export interface PendingTaskUpsert {
  planItemId: string
  title: string
  completed: boolean
  sectionName: string
  priority: 'none' | 'low' | 'medium' | 'high'
  description?: string
}

export interface PendingSync {
  version: typeof PENDING_SYNC_VERSION
  packageName: string
  hostProjectId: string | null
  generatedAt: string
  seedPolicy: 'merge-new-only' | 'skip-if-exists' | 'replace-sprint-section'
  sections: string[]
  projectName?: string
  projectColor?: string
  upserts: PendingTaskUpsert[]
}

export type GapCode =
  | 'MISSING_ON_BOARD'
  | 'MISSING_FROM_PLAN'
  | 'STATUS_MISMATCH'
  | 'SECTION_DRIFT'
  | 'NO_LINK'
  | 'NO_EMBED'
  | 'NO_SCRIPTS'
  | 'NO_REGISTRY'

export interface GapItem {
  code: GapCode
  planItemId?: string
  title?: string
  message: string
  source?: { file: string; line: number }
  blocking?: boolean
}

export interface GapReport {
  packageName: string
  generatedAt: string
  planSummary: { done: number; open: number; total: number }
  boardSummary: { done: number; open: number; total: number }
  gaps: GapItem[]
  blockingCount: number
}

export const DEFAULT_SECTIONS = ['Backlog', 'Sprint', 'In Review', 'Done'] as const

export const PM_SCRIPT_KEYS = [
  'pm:plan',
  'pm:gap',
  'pm:sync',
  'pm:status',
  'pm:export',
] as const

export const ROOT_PM_SCRIPT_KEYS = ['pm:init', 'pm:doctor', 'pm:gap', 'pm:sync', 'pm:status'] as const
