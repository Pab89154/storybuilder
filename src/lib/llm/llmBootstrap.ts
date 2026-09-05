let autoInitStarted = false

/** Connects to Gemini once per session when the app opens. */
export function ensureLLMAutoInit(loadModel: () => Promise<void>): void {
  if (autoInitStarted) return
  autoInitStarted = true
  void loadModel()
}
