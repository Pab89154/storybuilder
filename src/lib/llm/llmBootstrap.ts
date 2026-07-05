let autoInitStarted = false

/** Starts downloading the AI model once per session when the app opens. */
export function ensureLLMAutoInit(loadModel: () => Promise<void>): void {
  if (autoInitStarted) return
  autoInitStarted = true
  void loadModel()
}
