import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Copy, Link2, Trash2 } from 'lucide-react'
import { useUiT } from '@/i18n/context'
import {
  buildShareUrl,
  createStoryShare,
  listStoryShares,
  revokeStoryShare,
} from '@/lib/cloud/sharing'
import type { ShareAccessMode, StoryShareRecord } from '@/types/share'
import type { StoryWithDetails } from '@/types/story'

interface ShareStoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  story: StoryWithDetails
  onShared?: () => void
}

export function ShareStoryDialog({ open, onOpenChange, story, onShared }: ShareStoryDialogProps) {
  const t = useUiT()
  const [accessMode, setAccessMode] = useState<ShareAccessMode>('view')
  const [shares, setShares] = useState<StoryShareRecord[]>([])
  const [latestUrl, setLatestUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isWorking, setIsWorking] = useState(false)

  useEffect(() => {
    if (!open) return
    void listStoryShares(story.id)
      .then(setShares)
      .catch(() => setShares([]))
  }, [open, story.id])

  const handleCreateShare = async () => {
    setError(null)
    setIsWorking(true)
    try {
      const { url } = await createStoryShare(story.id, accessMode)
      setLatestUrl(url)
      const nextShares = await listStoryShares(story.id)
      setShares(nextShares)
      onShared?.()
    } catch (shareError) {
      setError(shareError instanceof Error ? shareError.message : t('share.error'))
    } finally {
      setIsWorking(false)
    }
  }

  const handleCopy = async (url: string) => {
    await navigator.clipboard.writeText(url)
  }

  const handleRevoke = async (share: StoryShareRecord) => {
    setIsWorking(true)
    try {
      await revokeStoryShare(share.id, story.id)
      setShares(await listStoryShares(story.id))
      onShared?.()
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : t('share.error'))
    } finally {
      setIsWorking(false)
    }
  }

  const activeShares = shares.filter((share) => !share.isRevoked)

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            {t('share.title')}
          </AlertDialogTitle>
          <AlertDialogDescription>{t('share.description')}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label>{t('share.accessMode')}</Label>
            <Select value={accessMode} onValueChange={(value) => setAccessMode(value as ShareAccessMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">{t('share.viewOnly')}</SelectItem>
                <SelectItem value="edit">{t('share.canEdit')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button disabled={isWorking} onClick={() => void handleCreateShare()}>
            {t('share.createLink')}
          </Button>

          {latestUrl ? (
            <div className="rounded-lg border bg-[var(--color-card)] p-3 text-sm">
              <p className="mb-2 font-medium">{t('share.latestLink')}</p>
              <code className="block break-all text-xs">{latestUrl}</code>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => void handleCopy(latestUrl)}
              >
                <Copy className="mr-2 h-4 w-4" />
                {t('share.copy')}
              </Button>
            </div>
          ) : null}

          {activeShares.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">{t('share.activeLinks')}</p>
              {activeShares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {share.accessMode === 'edit' ? t('share.canEdit') : t('share.viewOnly')}
                    </p>
                    <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                      {buildShareUrl(share.shareToken, '…')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isWorking}
                    aria-label={t('share.revoke')}
                    onClick={() => void handleRevoke(share)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>{t('sidebar.cancel')}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
