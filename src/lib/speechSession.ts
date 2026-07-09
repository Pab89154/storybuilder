type StopListeningFn = () => void

let activeStopListening: StopListeningFn | null = null

export function claimSpeechSession(stop: StopListeningFn): void {
  activeStopListening?.()
  activeStopListening = stop
}

export function releaseSpeechSession(stop: StopListeningFn): void {
  if (activeStopListening === stop) {
    activeStopListening = null
  }
}

export function stopActiveSpeechSession(): void {
  activeStopListening?.()
  activeStopListening = null
}
