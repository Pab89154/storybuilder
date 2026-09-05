export type LlmBackend = 'openai'

/** Progress while connecting to OpenAI. */
export interface LoadProgress {
  progress: number
  text: string
}

/** Chat engine used by story generation / translation (OpenAI only). */
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
