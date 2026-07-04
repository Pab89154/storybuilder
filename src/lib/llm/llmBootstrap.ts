import { isMobileDevice } from '@/lib/deviceCapabilities'

let autoInitStarted = false

/** Desktop only — mobile loads the model on first Generate to avoid memory reload loops. */
export function shouldAutoInitLLM(): boolean {
  return !isMobileDevice()
}

export function ensureLLMAutoInit(loadModel: () => Promise<void>): void {
  if (autoInitStarted || !shouldAutoInitLLM()) return
  autoInitStarted = true
  void loadModel()
}
