import type { Priority } from './types.js'

export type { Priority }

export interface PlanItemSource {
  file: string
  line: number
}

export interface PlanItem {
  id: string
  title: string
  done: boolean
  section: string | null
  priority: Priority
  /** Body text from pm:description metadata or indented lines under the checkbox. */
  description?: string
  source: PlanItemSource
}

export interface ParsePlanOptions {
  defaultSection?: string
  doneSection?: string
}

export interface ParsePlanResult {
  items: PlanItem[]
  files: string[]
}

const PLAN_ID_RE = /\bpm:([A-Z][A-Z0-9_-]*\d+)\b/i
const META_SECTION_RE = /pm:section=([^\s]+)/i
const META_PRIORITY_RE = /pm:priority=(none|low|medium|high)/i
const META_DESCRIPTION_RE = /pm:description=([\s\S]*?)(?=\s+pm:|\s*-->)/i
const CHECKBOX_RE = /^(\s*)[-*+]\s+\[([ xX])\]\s+(.+)$/

function parsePriority(raw: string | null): Priority {
  if (!raw) return 'none'
  const lower = raw.toLowerCase()
  if (lower === 'low' || lower === 'medium' || lower === 'high') return lower
  return 'none'
}

function extractPlanId(text: string): string | null {
  const match = PLAN_ID_RE.exec(text)
  return match ? match[1]!.toUpperCase() : null
}

function extractMeta(text: string): {
  section: string | null
  priority: Priority
  description: string | null
} {
  const sectionMatch = META_SECTION_RE.exec(text)
  const priorityMatch = META_PRIORITY_RE.exec(text)
  const descriptionMatch = META_DESCRIPTION_RE.exec(text)
  return {
    section: sectionMatch?.[1] ?? null,
    priority: parsePriority(priorityMatch?.[1] ?? null),
    description: descriptionMatch?.[1]?.trim() ?? null,
  }
}

function collectContinuationLines(
  lines: string[],
  startIndex: number,
  checkboxIndent: string,
): string {
  const body: string[] = []

  for (let index = startIndex + 1; index < lines.length; index++) {
    const line = lines[index]!
    if (line.trim() === '') {
      if (body.length > 0) body.push('')
      continue
    }

    if (CHECKBOX_RE.test(line) || /^#{1,6}\s/.test(line.trim())) break

    const blockquote = /^\s*>\s?(.*)$/.exec(line)
    if (blockquote) {
      body.push(blockquote[1]!.trim())
      continue
    }

    if (line.startsWith(`${checkboxIndent} `) || line.startsWith(`${checkboxIndent}\t`)) {
      body.push(line.slice(checkboxIndent.length).trim())
      continue
    }

    if (/^\s{2,}\S/.test(line)) {
      body.push(line.trim())
      continue
    }

    break
  }

  return body.join('\n').trim()
}

function cleanTitle(text: string): string {
  return text
    .replace(PLAN_ID_RE, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(META_SECTION_RE, '')
    .replace(META_PRIORITY_RE, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** Parse markdown plan files into stable plan items (pm:ID checkboxes). */
export function parsePlanMarkdown(
  content: string,
  filePath: string,
  options: ParsePlanOptions = {},
): PlanItem[] {
  const lines = content.split(/\r?\n/)
  let currentSection = options.defaultSection ?? null
  const items: PlanItem[] = []

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!
    const lineNumber = index + 1

    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line.trim())
    if (headingMatch) {
      currentSection = headingMatch[2]!.trim()
      continue
    }

    const checkboxMatch = CHECKBOX_RE.exec(line)
    if (!checkboxMatch) continue

    const checkboxIndent = checkboxMatch[1]!
    const done = checkboxMatch[2]!.toLowerCase() === 'x'
    const rawText = checkboxMatch[3]!
    const id = extractPlanId(rawText)
    if (!id) continue

    const meta = extractMeta(rawText)
    const title = cleanTitle(rawText)
    if (!title) continue

    let section = meta.section ?? currentSection
    if (done && options.doneSection && !meta.section) {
      section = options.doneSection
    }

    const bodyDescription = collectContinuationLines(lines, index, checkboxIndent)
    const description = meta.description ?? (bodyDescription || undefined)

    items.push({
      id,
      title,
      done,
      section,
      priority: meta.priority,
      ...(description ? { description } : {}),
      source: { file: filePath, line: lineNumber },
    })
  }

  return items
}

export function parsePlanFiles(
  files: { path: string; content: string }[],
  options: ParsePlanOptions = {},
): ParsePlanResult {
  const items: PlanItem[] = []
  const paths: string[] = []

  for (const file of files) {
    paths.push(file.path)
    items.push(...parsePlanMarkdown(file.content, file.path, options))
  }

  const byId = new Map<string, PlanItem>()
  for (const item of items) {
    byId.set(item.id, item)
  }

  return {
    items: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id)),
    files: paths,
  }
}

export function countPlanItems(items: PlanItem[]): { done: number; open: number; total: number } {
  const done = items.filter((item) => item.done).length
  return { done, open: items.length - done, total: items.length }
}
