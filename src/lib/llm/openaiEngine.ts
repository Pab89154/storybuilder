import type { ChatEngine } from '@/lib/llm/chatTypes'
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from '@/lib/supabase/client'

const DEFAULT_MODEL = 'gpt-4o-mini'

function chatProxyUrl(): string {
  if (!supabaseUrl) throw new Error('Supabase URL is not configured')
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/openai-chat`
}

export function getOpenAIModelId(): string {
  return DEFAULT_MODEL
}

/** OpenAI is available when Supabase (proxy) is configured. The API key stays server-side. */
export function isOpenAIConfigured(): boolean {
  return isSupabaseConfigured
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
            error?: { message?: string }
          }
          if (json.error?.message) {
            throw new Error(json.error.message)
          }
          const delta = json.choices?.[0]?.delta?.content
          if (delta) yield delta
        } catch (error) {
          if (error instanceof Error && error.message && !error.message.includes('JSON')) {
            throw error
          }
          /* skip malformed chunk */
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

function authHeaders(): HeadersInit {
  if (!supabaseAnonKey) {
    throw new Error('Supabase anon key is not configured')
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${supabaseAnonKey}`,
    apikey: supabaseAnonKey,
  }
}

function mapFetchError(error: unknown): Error {
  if (error instanceof DOMException && error.name === 'AbortError') return error
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return new Error('You are offline. StoryBuilder needs an internet connection.')
  }
  return new Error(
    'Could not reach the story AI service. Check your connection and try again.',
  )
}

export function createOpenAIEngine(): ChatEngine {
  if (!isOpenAIConfigured()) {
    throw new Error('Supabase is not configured — cannot reach the OpenAI proxy.')
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
      let response: Response
      try {
        response = await fetch(chatProxyUrl(), {
          method: 'POST',
          headers: authHeaders(),
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
      } catch (error) {
        throw mapFetchError(error)
      }

      if (!response.ok) {
        const detail = await response.text().catch(() => '')
        throw new Error(
          `AI error ${response.status}: ${detail || response.statusText}`,
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
        let response: Response
        try {
          response = await fetch(chatProxyUrl(), {
            method: 'POST',
            headers: authHeaders(),
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
        } catch (error) {
          throw mapFetchError(error)
        }

        if (!response.ok || !response.body) {
          const detail = await response.text().catch(() => '')
          throw new Error(
            `AI error ${response.status}: ${detail || response.statusText}`,
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
