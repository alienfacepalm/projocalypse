interface Window {
  showOpenFilePicker?: (options?: {
    types?: Array<{ description?: string; accept: Record<string, string[]> }>
    multiple?: boolean
  }) => Promise<FileSystemFileHandle[]>
  showSaveFilePicker?: (options?: {
    suggestedName?: string
    types?: Array<{ description?: string; accept: Record<string, string[]> }>
  }) => Promise<FileSystemFileHandle>
}
