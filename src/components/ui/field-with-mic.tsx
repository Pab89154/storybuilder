import { Loader2, Mic, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBlindKidMode } from '@/context/blindKidMode'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import type { SpeechPlaybackStatus } from '@/hooks/useSpeechSynthesis'
import { useUiT } from '@/i18n/context'
import { cn } from '@/lib/utils'
import type { Language } from '@/types/story'
import type { ReactNode } from 'react'

function MicButton({
  language,
  onTranscript,
  className,
}: {
  language: Language
  onTranscript: (text: string) => void
  className?: string
}) {
  const t = useUiT()
  const { startListening, stopListening, isListening, isSupported, error } =
    useSpeechRecognition(language)

  const errorMessage =
    error === 'unsupported'
      ? t('blindKid.speechUnsupported')
      : error === 'not-allowed'
        ? t('blindKid.micPermissionDenied')
        : error === 'no-speech'
          ? t('blindKid.noSpeechHeard')
          : error
            ? t('blindKid.speechError')
            : null

  if (!isSupported) {
    return (
      <span className={cn('text-[10px] text-[var(--color-muted-foreground)]', className)}>
        {t('blindKid.speechUnsupported')}
      </span>
    )
  }

  return (
    <div className={cn('flex shrink-0 flex-col items-end gap-0.5', className)}>
      <Button
        type="button"
        variant={isListening ? 'default' : 'outline'}
        size="icon"
        className="h-8 w-8"
        onClick={() => {
          if (isListening) {
            stopListening()
            return
          }
          startListening({
            onResult: (transcript) => onTranscript(transcript),
          })
        }}
        title={isListening ? t('blindKid.stopDictation') : t('blindKid.startDictation')}
        aria-label={isListening ? t('blindKid.stopDictation') : t('blindKid.startDictation')}
        aria-pressed={isListening}
      >
        {isListening ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
      {isListening ? (
        <span className="text-[10px] font-medium text-[var(--color-primary)]">
          {t('blindKid.listening')}
        </span>
      ) : null}
      {errorMessage && !isListening ? (
        <span className="max-w-[8rem] text-right text-[10px] text-[var(--color-destructive)]">
          {errorMessage}
        </span>
      ) : null}
    </div>
  )
}

function appendTranscript(current: string, transcript: string): string {
  const trimmed = current.trim()
  if (!trimmed) return transcript.trim()
  return `${trimmed} ${transcript.trim()}`
}

export function FieldWithMic({
  language,
  value,
  onTranscript,
  children,
  className,
}: {
  language: Language
  value: string
  onTranscript: (next: string) => void
  children: ReactNode
  className?: string
}) {
  const { blindKidMode } = useBlindKidMode()

  if (!blindKidMode) {
    return <>{children}</>
  }

  return (
    <div className={cn('flex items-start gap-2', className)}>
      <div className="min-w-0 flex-1">{children}</div>
      <MicButton
        language={language}
        onTranscript={(transcript) => onTranscript(appendTranscript(value, transcript))}
      />
    </div>
  )
}

export function ReaderSpeechControls({
  text,
  className,
  compact = false,
  status,
  isSupported,
  onListen,
  onPause,
  onResume,
  onStop,
}: {
  text: string
  className?: string
  compact?: boolean
  status: SpeechPlaybackStatus
  isSupported: boolean
  onListen: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
}) {
  const t = useUiT()
  const { blindKidMode } = useBlindKidMode()

  if (!blindKidMode) return null

  if (!isSupported) {
    return (
      <span className={cn('text-[10px] text-[var(--color-muted-foreground)]', className)}>
        {t('blindKid.ttsUnsupported')}
      </span>
    )
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {status === 'idle' ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={compact ? 'h-7 text-xs' : undefined}
          onClick={onListen}
          disabled={!text.trim()}
        >
          <Mic className="h-3.5 w-3.5" />
          {t('blindKid.listen')}
        </Button>
      ) : null}
      {status === 'speaking' ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={compact ? 'h-7 text-xs' : undefined}
          onClick={onPause}
        >
          {t('blindKid.pause')}
        </Button>
      ) : null}
      {status === 'paused' ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={compact ? 'h-7 text-xs' : undefined}
          onClick={onResume}
        >
          {t('blindKid.resume')}
        </Button>
      ) : null}
      {status !== 'idle' ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={compact ? 'h-7 text-xs' : undefined}
          onClick={onStop}
        >
          <MicOff className="h-3.5 w-3.5" />
          {t('blindKid.stop')}
        </Button>
      ) : null}
    </div>
  )
}
