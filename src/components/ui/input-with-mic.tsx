import { Input } from '@/components/ui/input'
import type { Language } from '@/types/story'
import type { ComponentProps } from 'react'

type InputWithMicProps = ComponentProps<typeof Input> & {
  language?: Language
}

export function InputWithMic({ language: _language, ...props }: InputWithMicProps) {
  return <Input {...props} />
}
