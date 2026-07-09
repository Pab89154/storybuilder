import { Textarea } from '@/components/ui/textarea'
import { FieldWithMic } from '@/components/ui/field-with-mic'
import type { Language } from '@/types/story'
import type { ComponentProps } from 'react'

type TextareaWithMicProps = ComponentProps<typeof Textarea> & {
  language: Language
}

export function TextareaWithMic({
  language,
  value,
  onChange,
  className,
  ...props
}: TextareaWithMicProps) {
  const stringValue = typeof value === 'string' || typeof value === 'number' ? String(value ?? '') : ''

  return (
    <FieldWithMic
      language={language}
      value={stringValue}
      onTranscript={(next) => {
        onChange?.({
          target: { value: next },
          currentTarget: { value: next },
        } as React.ChangeEvent<HTMLTextAreaElement>)
      }}
    >
      <Textarea value={value} onChange={onChange} className={className} {...props} />
    </FieldWithMic>
  )
}
