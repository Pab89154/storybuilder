import type { ChatEngine } from '@/lib/llm/chatTypes'

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

function getOpenAIApiKey(): string | undefined {
  const key = import.meta.env.VITE_OPENAI_API_KEY?.trim()
  return key || undefined
}

export function getOpenAIModelId(): string {
  // Fixed default — no model env var required from the user.
  return 'gpt-4o-mini'
}

export function isOpenAIConfigured(): boolean {
  return Boolean(getOpenAIApiKey())
}

async function* parseSseStream(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      if (signal?.aborted) {
        throw new DOMException('Generation aborted', 'AbortError')
      }
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim()
        if (!data || data === '[DONE]') continue
        try {
          const json = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>
          }
          const delta = json.choices?.[0]?.delta?.content
          if (delta) yield delta
        } catch {
          /* skip malformed chunk */
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export function createOpenAIEngine(): ChatEngine {
  const apiKey = getOpenAIApiKey()
  if (!apiKey) {
    throw new Error('VITE_OPENAI_API_KEY is not set')
  }

  const modelId = getOpenAIModelId()
  let activeAbort: AbortController | null = null

  const engine: ChatEngine = {
    backend: 'openai',
    modelId,

    async interruptGenerate() {
      activeAbort?.abort()
      activeAbort = null
    },

    async completeText(systemPrompt, userPrompt, maxTokens = 1024, temperature = 0.3) {
      const response = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature,
          max_tokens: maxTokens,
          stream: false,
        }),
      })

      if (!response.ok) {
        const detail = await response.text().catch(() => '')
        throw new Error(
          `OpenAI error ${response.status}: ${detail || response.statusText}`,
        )
      }

      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>
      }
      const content = json.choices?.[0]?.message?.content
      return typeof content === 'string' ? content.trim() : ''
    },

    async streamCompletion(
      systemPrompt,
      userPrompt,
      onToken,
      signal,
      temperature = 0.8,
      maxTokens = 1024,
    ) {
      if (signal?.aborted) {
        throw new DOMException('Generation aborted', 'AbortError')
      }

      const localAbort = new AbortController()
      activeAbort = localAbort

      const onExternalAbort = () => localAbort.abort()
      signal?.addEventListener('abort', onExternalAbort, { once: true })

      try {
        const response = await fetch(OPENAI_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          signal: localAbort.signal,
          body: JSON.stringify({
            model: modelId,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature,
            max_tokens: maxTokens,
            stream: true,
          }),
        })

        if (!response.ok || !response.body) {
          const detail = await response.text().catch(() => '')
          throw new Error(
            `OpenAI error ${response.status}: ${detail || response.statusText}`,
          )
        }

        let fullText = ''
        for await (const delta of parseSseStream(response.body, localAbort.signal)) {
          fullText += delta
          onToken(delta)
        }
        return fullText.trim()
      } catch (error) {
        if (localAbort.signal.aborted || signal?.aborted) {
          throw new DOMException('Generation aborted', 'AbortError')
        }
        throw error
      } finally {
        signal?.removeEventListener('abort', onExternalAbort)
        if (activeAbort === localAbort) activeAbort = null
      }
    },
  }

  return engine
}
