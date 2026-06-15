/** Slug for filesystem paths derived from package name (@scope/pkg → scope__pkg). */
export function packageNameToSlug(packageName: string): string {
  return packageName.replace(/^@/, '').replace(/\//g, '__')
}

export function slugToDisplayPackage(slug: string): string {
  const parts = slug.split('__')
  if (parts.length === 2) return `@${parts[0]}/${parts[1]}`
  return slug
}

export interface ProjocalypsePaths {
  root: string
  workspace: string
  linksDir: string
  boardDir: string
  pendingDir: string
  planCacheDir: string
}

export function resolveProjocalypsePaths(root: string): ProjocalypsePaths {
  const base = `${root}/.projocalypse`
  return {
    root: base,
    workspace: `${base}/workspace.json`,
    linksDir: `${base}/links`,
    boardDir: `${base}/board`,
    pendingDir: `${base}/pending`,
    planCacheDir: `${base}/plan-cache`,
  }
}

export function linkPath(paths: ProjocalypsePaths, packageName: string): string {
  return `${paths.linksDir}/${packageNameToSlug(packageName)}.json`
}

export function boardPath(paths: ProjocalypsePaths, packageName: string): string {
  return `${paths.boardDir}/${packageNameToSlug(packageName)}.json`
}

export function pendingPath(paths: ProjocalypsePaths, packageName: string): string {
  return `${paths.pendingDir}/${packageNameToSlug(packageName)}.json`
}

export function planCachePath(paths: ProjocalypsePaths, packageName: string): string {
  return `${paths.planCacheDir}/${packageNameToSlug(packageName)}.json`
}

export function pendingPublicUrl(packageName: string): string {
  return `/.projocalypse/pending/${packageNameToSlug(packageName)}.json`
}
