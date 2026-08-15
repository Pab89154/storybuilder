import {
  BookOpen,
  CircleHelp,
  Lightbulb,
  Lock,
  Pencil,
  RefreshCw,
  Settings2,
  Sparkles,
  Users,
  Wand2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useUiT } from '@/i18n/context'
import { ScrollArea } from '@/components/ui/scroll-area'

const STEPS = [
  { key: '1', Icon: BookOpen },
  { key: '2', Icon: Lightbulb },
  { key: '3', Icon: Users },
  { key: '4', Icon: Settings2 },
  { key: '5', Icon: Wand2 },
  { key: '6', Icon: Pencil },
  { key: '7', Icon: RefreshCw },
  { key: '8', Icon: Lock },
] as const

interface HowToGuideDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HowToGuideDialog({ open, onOpenChange }: HowToGuideDialogProps) {
  const t = useUiT()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="how-to-guide max-h-[min(90vh,44rem)] overflow-hidden sm:max-w-xl" closeLabel={t('guide.close')}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CircleHelp className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
            {t('guide.title')}
          </DialogTitle>
          <DialogDescription>{t('guide.description')}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[min(65vh,32rem)] pr-3">
          <ol className="how-to-guide-steps">
            {STEPS.map(({ key, Icon }) => (
              <li key={key} className="how-to-guide-step">
                <span className="how-to-guide-step-icon" aria-hidden="true">
                  <Icon className="h-4 w-4" strokeWidth={1.85} />
                </span>
                <div className="how-to-guide-step-copy">
                  <h3>{t(`guide.step${key}Title`)}</h3>
                  <p>{t(`guide.step${key}Body`)}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="how-to-guide-note" role="note">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
            <div>
              <h3>{t('guide.troubleTitle')}</h3>
              <p>{t('guide.troubleBody')}</p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
