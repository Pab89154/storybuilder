import { useCallback, useEffect, useRef, useState } from 'react'
import { claimSpeechSession, releaseSpeechSession } from '@/lib/speechSession'
import { speechLocaleForLanguage } from '@/lib/speechLocale'
import type { Language } from '@/types/story'

type SpeechRecognitionCtor = new () => SpeechRecognition

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export type SpeechRecognitionErrorCode =
  | 'unsupported'
  | 'not-allowed'
  | 'no-speech'
  | 'network'
  | 'aborted'
  | 'unknown'

export function useSpeechRecognition(language: Language) {
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<SpeechRecognitionErrorCode | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const stopRef = useRef<(() => void) | null>(null)

  const isSupported = getSpeechRecognitionCtor() !== null

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current
    if (recognition) {
      try {
        recognition.stop()
      } catch {
        /* ignore */
      }
      recognitionRef.current = null
    }
    if (stopRef.current) {
      releaseSpeechSession(stopRef.current)
      stopRef.current = null
    }
    setIsListening(false)
  }, [])

  const startListening = useCallback(
    (options: { onResult: (transcript: string) => void; continuous?: boolean }) => {
      const Ctor = getSpeechRecognitionCtor()
      if (!Ctor) {
        setError('unsupported')
        return
      }

      stopListening()
      setError(null)

      const recognition = new Ctor()
      recognition.lang = speechLocaleForLanguage(language)
      recognition.interimResults = false
      recognition.continuous = options.continuous ?? false
      recognition.maxAlternatives = 1

      const stop = () => {
        try {
          recognition.stop()
        } catch {
          /* ignore */
        }
        recognitionRef.current = null
        if (stopRef.current) {
          releaseSpeechSession(stopRef.current)
          stopRef.current = null
        }
        setIsListening(false)
      }

      stopRef.current = stop
      claimSpeechSession(stop)

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0]?.transcript ?? '')
          .join(' ')
          .trim()
        if (transcript) options.onResult(transcript)
        if (!options.continuous) stop()
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        const code = event.error
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          setError('not-allowed')
        } else if (code === 'no-speech') {
          setError('no-speech')
        } else if (code === 'network') {
          setError('network')
        } else if (code === 'aborted') {
          setError('aborted')
        } else {
          setError('unknown')
        }
        stop()
      }

      recognition.onend = () => {
        if (stopRef.current === stop) {
          releaseSpeechSession(stop)
          stopRef.current = null
        }
        recognitionRef.current = null
        setIsListening(false)
      }

      recognitionRef.current = recognition
      setIsListening(true)

      try {
        recognition.start()
      } catch {
        setError('unknown')
        stop()
      }
    },
    [language, stopListening],
  )

  useEffect(() => () => stopListening(), [stopListening])

  return {
    startListening,
    stopListening,
    isListening,
    isSupported,
    error,
    clearError: () => setError(null),
  }
}
