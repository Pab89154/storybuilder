import { Textarea } from '@/components/ui/textarea'
import type { Language } from '@/types/story'
import type { ComponentProps } from 'react'

type TextareaWithMicProps = ComponentProps<typeof Textarea> & {
  language?: Language
}

export function TextareaWithMic({ language: _language, ...props }: TextareaWithMicProps) {
  return <Textarea {...props} />
}
