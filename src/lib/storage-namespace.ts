import { packageNameToSlug } from '@projocalypse/core'
import type { EmbedConfig } from '@/lib/embed'

export const DEFAULT_STORAGE_NAMESPACE = 'default'
export const LEGACY_DEXIE_DATABASE_NAME = 'pm-tool'

export const DEV_MIRROR_LS_BASE_KEY = 'projocalypseDevMirror'
export const SYNC_MIRROR_BASE_KEY = 'projocalypseSyncMirror'
export const SYNC_CLOUD_BASE_KEY = 'projocalypseSyncCloud'
export const APPEARANCE_LS_BASE_KEY = 'projocalypse-appearance'

let preBootNamespace: string | null = null
let activeNamespace = resolveStorageNamespace()

export interface StorageNamespaceSource {
  storageNamespace?: string | null
  packageName?: string | null
}

/** Call before Projocalypse modules load the database (host embed entry). */
export function configureProjocalypseStorage(source: StorageNamespaceSource): void {
  preBootNamespace = normalizeStorageNamespace(
    source.storageNamespace ?? (source.packageName ? packageNameToSlug(source.packageName) : null),
  )
  activeNamespace = resolveStorageNamespace()
}

export function normalizeStorageNamespace(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '')
}

export function resolveStorageNamespace(source?: StorageNamespaceSource): string {
  const candidates = [
    preBootNamespace,
    normalizeStorageNamespace(source?.storageNamespace),
    source?.packageName ? packageNameToSlug(source.packageName) : null,
    normalizeStorageNamespace(import.meta.env.VITE_PROJOCALYPSE_STORAGE_NAMESPACE),
  ]

  for (const candidate of candidates) {
    if (candidate) return candidate
  }

  return DEFAULT_STORAGE_NAMESPACE
}

export function dexieDatabaseName(namespace = activeNamespace): string {
  return namespace === DEFAULT_STORAGE_NAMESPACE ? LEGACY_DEXIE_DATABASE_NAME : `${LEGACY_DEXIE_DATABASE_NAME}--${namespace}`
}

export function namespacedStorageKey(baseKey: string, namespace = activeNamespace): string {
  return namespace === DEFAULT_STORAGE_NAMESPACE ? baseKey : `${baseKey}--${namespace}`
}

export function activateStorageNamespace(namespace: string): void {
  activeNamespace = namespace
}

export function getActiveStorageNamespace(): string {
  return activeNamespace
}

export function devMirrorLsKey(namespace = activeNamespace): string {
  return namespacedStorageKey(DEV_MIRROR_LS_BASE_KEY, namespace)
}

export function syncMirrorKey(namespace = activeNamespace): string {
  return namespacedStorageKey(SYNC_MIRROR_BASE_KEY, namespace)
}

export function syncCloudKey(namespace = activeNamespace): string {
  return namespacedStorageKey(SYNC_CLOUD_BASE_KEY, namespace)
}

export function appearanceStorageKey(namespace = activeNamespace): string {
  return namespacedStorageKey(APPEARANCE_LS_BASE_KEY, namespace)
}

export function initProjocalypseStorage(embed?: Partial<EmbedConfig>): string {
  const namespace = resolveStorageNamespace(embed)
  activateStorageNamespace(namespace)
  return namespace
}

export function resetStorageNamespaceForTests(): void {
  preBootNamespace = null
  activeNamespace = DEFAULT_STORAGE_NAMESPACE
}
