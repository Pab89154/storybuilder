export type ModelTier = 'primary' | 'fallback'
export type LlmBackend = 'openai' | 'webllm'

/** Progress shape shared by WebLLM downloads and instant OpenAI ready. */
export interface LoadProgress {
  progress: number
  text: string
}

/**
 * Minimal chat engine used by story generation / translation.
 * Backed by OpenAI (online) or WebLLM (local) depending on env.
 */
export interface ChatEngine {
  readonly backend: LlmBackend
  readonly modelId: string
  completeText(
    systemPrompt: string,
    userPrompt: string,
    maxTokens?: number,
    temperature?: number,
  ): Promise<string>
  streamCompletion(
    systemPrompt: string,
    userPrompt: string,
    onToken: (token: string) => void,
    signal?: AbortSignal,
    temperature?: number,
    maxTokens?: number,
  ): Promise<string>
  interruptGenerate(): Promise<void>
}
