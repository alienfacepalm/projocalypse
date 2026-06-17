let suspended = 0

export function suspendDevMirrorAutoBackup(): void {
  suspended += 1
}

export function resumeDevMirrorAutoBackup(): void {
  suspended = Math.max(0, suspended - 1)
}

export function isDevMirrorAutoBackupSuspended(): boolean {
  return suspended > 0
}
