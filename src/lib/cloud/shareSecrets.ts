const STORAGE_KEY = 'storybuilder-share-secrets'

type ShareSecretMap = Record<string, string>

function readMap(): ShareSecretMap {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as ShareSecretMap
  } catch {
    return {}
  }
}

function writeMap(map: ShareSecretMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

export function rememberShareSecret(shareId: string, shareSecret: string): void {
  const map = readMap()
  map[shareId] = shareSecret
  writeMap(map)
}

export function getShareSecret(shareId: string): string | null {
  return readMap()[shareId] ?? null
}

export function forgetShareSecretsForStory(storyId: string, shareIds: string[]): void {
  const map = readMap()
  for (const shareId of shareIds) {
    delete map[shareId]
  }
  writeMap(map)
  void storyId
}

export function listShareSecrets(): ShareSecretMap {
  return readMap()
}
