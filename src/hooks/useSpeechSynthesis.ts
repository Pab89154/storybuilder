import { useCallback, useEffect, useRef, useState } from 'react'
import { speechLanguagePrefix, speechLocaleForLanguage } from '@/lib/speechLocale'
import type { Language } from '@/types/story'

export type SpeechPlaybackStatus = 'idle' | 'speaking' | 'paused'

function pickVoice(language: Language): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  const locale = speechLocaleForLanguage(language)
  const prefix = speechLanguagePrefix(language)
  return (
    voices.find((voice) => voice.lang === locale) ??
    voices.find((voice) => voice.lang.startsWith(prefix)) ??
    null
  )
}

export function useSpeechSynthesis(language: Language) {
  const [status, setStatus] = useState<SpeechPlaybackStatus>('idle')
  const statusRef = useRef<SpeechPlaybackStatus>('idle')

  const setPlaybackStatus = useCallback((next: SpeechPlaybackStatus) => {
    statusRef.current = next
    setStatus(next)
  }, [])

  const isSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window

  const cancel = useCallback(() => {
    if (!isSupported) return
    window.speechSynthesis.cancel()
    setPlaybackStatus('idle')
  }, [isSupported, setPlaybackStatus])

  const speak = useCallback(
    (text: string) => {
      if (!isSupported || !text.trim()) return
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text.trim())
      utterance.lang = speechLocaleForLanguage(language)
      const voice = pickVoice(language)
      if (voice) utterance.voice = voice
      utterance.onend = () => setPlaybackStatus('idle')
      utterance.onerror = () => setPlaybackStatus('idle')
      window.speechSynthesis.speak(utterance)
      setPlaybackStatus('speaking')
    },
    [isSupported, language, setPlaybackStatus],
  )

  const pause = useCallback(() => {
    if (!isSupported) return
    window.speechSynthesis.pause()
    setPlaybackStatus('paused')
  }, [isSupported, setPlaybackStatus])

  const resume = useCallback(() => {
    if (!isSupported) return
    window.speechSynthesis.resume()
    setPlaybackStatus('speaking')
  }, [isSupported, setPlaybackStatus])

  useEffect(() => {
    if (!isSupported) return
    const loadVoices = () => {
      void window.speechSynthesis.getVoices()
    }
    loadVoices()
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
      window.speechSynthesis.cancel()
    }
  }, [isSupported])

  return {
    speak,
    pause,
    resume,
    cancel,
    status,
    statusRef,
    isSupported,
  }
}
