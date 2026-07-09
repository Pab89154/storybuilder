import { Input } from '@/components/ui/input'
import { FieldWithMic } from '@/components/ui/field-with-mic'
import type { Language } from '@/types/story'
import type { ComponentProps } from 'react'

type InputWithMicProps = ComponentProps<typeof Input> & {
  language: Language
}

export function InputWithMic({ language, value, onChange, className, ...props }: InputWithMicProps) {
  const stringValue = typeof value === 'string' || typeof value === 'number' ? String(value ?? '') : ''

  return (
    <FieldWithMic
      language={language}
      value={stringValue}
      onTranscript={(next) => {
        onChange?.({
          target: { value: next },
          currentTarget: { value: next },
        } as React.ChangeEvent<HTMLInputElement>)
      }}
    >
      <Input value={value} onChange={onChange} className={className} {...props} />
    </FieldWithMic>
  )
}
