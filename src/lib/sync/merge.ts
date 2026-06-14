/** Entity with id and monotonic updatedAt for last-write-wins merge (Tabocalypse notes pattern). */
export interface MergeableEntity {
  id: string
  updatedAt: number
}

/**
 * Keep whichever of (baseline, incoming) has the greater updatedAt per id.
 * Ties prefer baseline so unsaved local edits win on equal timestamps.
 * Appends baseline-only ids unless tombstoned (deletedAt >= entity updatedAt).
 */
export function mergePreferNewerBaseline<T extends MergeableEntity>(
  baseline: readonly T[],
  incoming: readonly T[],
  tombstones?: Map<string, number>,
): T[] {
  const prevById = new Map(baseline.map((item) => [item.id, item]))
  const incomingIds = new Set(incoming.map((item) => item.id))
  const out: T[] = []

  for (const inc of incoming) {
    const deletedAt = tombstones?.get(inc.id)
    if (deletedAt !== undefined && inc.updatedAt <= deletedAt) continue
    const loc = prevById.get(inc.id)
    if (!loc || loc.updatedAt < inc.updatedAt) {
      out.push(inc)
    } else {
      out.push(loc)
    }
  }

  for (const loc of baseline) {
    if (!incomingIds.has(loc.id)) {
      const deletedAt = tombstones?.get(loc.id)
      if (deletedAt !== undefined && loc.updatedAt <= deletedAt) continue
      out.push(loc)
    }
  }

  return out
}

export function mergeSyncSources<T extends MergeableEntity>(
  cloud: readonly T[] | undefined,
  mirror: readonly T[] | undefined,
): T[] {
  const mirrorList = mirror ?? []
  const cloudList = cloud ?? []
  if (mirrorList.length === 0) return [...cloudList]
  if (cloudList.length === 0) return [...mirrorList]
  return mergePreferNewerBaseline(mirrorList, cloudList)
}
