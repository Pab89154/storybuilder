import { AlertTriangle } from 'lucide-react'
import { useUiT } from '@/i18n/context'
import { useLLM } from '@/hooks/useLLM'

export function WebGPUWarning() {
  const t = useUiT()
  const { isReady, hasWebGPU } = useLLM()

  if (!isReady || hasWebGPU) return null

  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-medium">{t('webgpu.title')}</p>
        <p className="mt-0.5 text-amber-800">{t('webgpu.body')}</p>
      </div>
    </div>
  )
}
