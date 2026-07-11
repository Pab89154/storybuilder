import { deleteParagraph, replaceParagraphContent } from '@/db/database'
import type { Paragraph } from '@/types/story'
import { looksLikeRefusal, stripRefusal } from '@/lib/llm/refusal'

export const MAX_GENERATION_CHUNKS = 100

export function shouldStopGenerationLoop(
  wordsSoFar: number,
  targetWordCount: number,
  chunkAttempts: number,
  wordsInLastChunk: number,
): boolean {
  if (chunkAttempts >= MAX_GENERATION_CHUNKS) return true
  if (wordsInLastChunk === 0 && wordsSoFar > 0) return true
  if (wordsSoFar >= targetWordCount * 0.95) return true
  return false
}

export async function finalizeGeneratedParagraph(
  paragraph: Paragraph,
  finalContent: string,
  source: Paragraph['source'] = 'ai',
): Promise<Paragraph | null> {
  // Final safety net: never persist a model refusal as story text.
  const trimmed = stripRefusal(finalContent)
  if (!trimmed || looksLikeRefusal(trimmed)) {
    await deleteParagraph(paragraph.id)
    return null
  }
  await replaceParagraphContent(paragraph.id, trimmed, source)
  return { ...paragraph, content: trimmed, source, updatedAt: Date.now() }
}
