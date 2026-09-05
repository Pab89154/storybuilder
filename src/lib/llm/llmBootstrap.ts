let autoInitStarted = false

/** Connects to OpenAI once per session when the app opens. */
export function ensureLLMAutoInit(loadModel: () => Promise<void>): void {
  if (autoInitStarted) return
  autoInitStarted = true
  void loadModel()
}
