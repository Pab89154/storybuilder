let autoInitStarted = false

/** Starts the AI backend once per session (OpenAI if configured, else local WebLLM). */
export function ensureLLMAutoInit(loadModel: () => Promise<void>): void {
  if (autoInitStarted) return
  autoInitStarted = true
  void loadModel()
}
