import type { Section } from '@/models/types'

export function sortableSectionId(sectionId: string): string {
  return `section:${sectionId}`
}

export function sectionIdFromSortableId(id: string): string {
  return id.slice('section:'.length)
}

export function computeSectionReorderUpdates(
  sections: Section[],
  activeSectionId: string,
  overSectionId: string,
): { id: string; sortOrder: number }[] | null {
  if (activeSectionId === overSectionId) return null

  const sorted = [...sections].sort((a, b) => a.sortOrder - b.sortOrder)
  const activeIndex = sorted.findIndex((section) => section.id === activeSectionId)
  const overIndex = sorted.findIndex((section) => section.id === overSectionId)
  if (activeIndex < 0 || overIndex < 0) return null

  const reordered = [...sorted]
  const [moved] = reordered.splice(activeIndex, 1)
  reordered.splice(overIndex, 0, moved!)

  return reordered.map((section, index) => ({ id: section.id, sortOrder: index }))
}
