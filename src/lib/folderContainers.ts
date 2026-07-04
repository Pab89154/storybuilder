export const UNCATEGORIZED_KEY = 'uncategorized'

export function containerIdFromFolderId(folderId: string | null): string {
  return folderId ? `container:${folderId}` : `container:${UNCATEGORIZED_KEY}`
}

export function folderIdFromContainerId(containerId: string): string | null {
  if (containerId === `container:${UNCATEGORIZED_KEY}`) return null
  if (containerId.startsWith('container:')) return containerId.slice('container:'.length)
  return null
}

export function isContainerId(id: string): boolean {
  return id.startsWith('container:')
}
