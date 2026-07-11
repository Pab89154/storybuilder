import {
  decryptWithKey,
  deriveKeyFromRecoveryKey,
  encryptWithKey,
  generateShareSecret,
} from '@/lib/crypto/encryption'
import { getShareSecret, rememberShareSecret } from '@/lib/cloud/shareSecrets'
import { getStoryWithDetails, updateStory } from '@/lib/cloud/database'
import { supabase } from '@/lib/supabase/client'
import type { ShareAccessMode, StoryShareRecord } from '@/types/share'
import type { StoryWithDetails } from '@/types/story'
import { generateId } from '@/lib/utils'

type ShareRow = {
  id: string
  story_id: string
  user_id: string
  share_token: string
  access_mode: ShareAccessMode
  encrypted_payload: string
  is_revoked: boolean
  created_at: string
  updated_at: string
}

type SharedPayload = StoryWithDetails

function rowToShare(row: ShareRow): StoryShareRecord {
  return {
    id: row.id,
    storyId: row.story_id,
    shareToken: row.share_token,
    accessMode: row.access_mode,
    isRevoked: row.is_revoked,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  }
}

export function buildShareUrl(shareToken: string, shareSecret: string): string {
  const base = import.meta.env.BASE_URL ?? '/'
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base
  return `${window.location.origin}${normalizedBase}/share/${shareToken}#k=${encodeURIComponent(shareSecret)}`
}

export function readShareSecretFromHash(): string | null {
  const hash = window.location.hash.replace(/^#/, '')
  const params = new URLSearchParams(hash)
  const secret = params.get('k')
  return secret ? decodeURIComponent(secret) : null
}

async function encryptForShare(story: StoryWithDetails, shareSecret: string): Promise<string> {
  const key = await deriveKeyFromRecoveryKey(shareSecret)
  return encryptWithKey(story, key)
}

async function decryptForShare(payload: string, shareSecret: string): Promise<SharedPayload> {
  const key = await deriveKeyFromRecoveryKey(shareSecret)
  return decryptWithKey<SharedPayload>(payload, key)
}

export async function listStoryShares(storyId: string): Promise<StoryShareRecord[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('story_shares')
    .select('*')
    .eq('story_id', storyId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as ShareRow[]).map(rowToShare)
}

export async function createStoryShare(
  storyId: string,
  accessMode: ShareAccessMode,
): Promise<{ url: string; share: StoryShareRecord }> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const story = await getStoryWithDetails(storyId)
  if (!story) throw new Error('Story not found')

  const shareToken = generateId()
  const shareSecret = generateShareSecret()
  const encrypted_payload = await encryptForShare(story, shareSecret)

  const { data, error } = await supabase
    .from('story_shares')
    .insert({
      story_id: storyId,
      user_id: user.id,
      share_token: shareToken,
      access_mode: accessMode,
      encrypted_payload,
      is_revoked: false,
    })
    .select('*')
    .single()
  if (error) throw error

  await updateStory(storyId, { isShared: true })

  const share = rowToShare(data as ShareRow)
  rememberShareSecret(share.id, shareSecret)
  return { url: buildShareUrl(shareToken, shareSecret), share }
}

export async function revokeStoryShare(shareId: string, storyId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('story_shares')
    .update({ is_revoked: true, updated_at: new Date().toISOString() })
    .eq('id', shareId)
    .eq('user_id', user.id)
  if (error) throw error

  const remaining = await listStoryShares(storyId)
  if (!remaining.some((share) => !share.isRevoked)) {
    await updateStory(storyId, { isShared: false })
  }
}

export async function loadSharedStory(
  shareToken: string,
  shareSecret: string,
): Promise<{ story: StoryWithDetails; accessMode: ShareAccessMode; shareId: string } | null> {
  const { data, error } = await supabase
    .from('story_shares')
    .select('*')
    .eq('share_token', shareToken)
    .eq('is_revoked', false)
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  const row = data as ShareRow
  const story = await decryptForShare(row.encrypted_payload, shareSecret)
  return { story, accessMode: row.access_mode, shareId: row.id }
}

export async function saveSharedStory(
  shareId: string,
  story: StoryWithDetails,
  shareSecret: string,
): Promise<void> {
  const encrypted_payload = await encryptForShare(story, shareSecret)
  const { error } = await supabase
    .from('story_shares')
    .update({
      encrypted_payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', shareId)
    .eq('is_revoked', false)
  if (error) throw error
}

export async function syncActiveSharesForStory(storyId: string): Promise<void> {
  const shares = (await listStoryShares(storyId)).filter((share) => !share.isRevoked)
  if (shares.length === 0) return

  const story = await getStoryWithDetails(storyId)
  if (!story) return

  for (const share of shares) {
    const shareSecret = getShareSecret(share.id)
    if (!shareSecret) continue
    const encrypted_payload = await encryptForShare(story, shareSecret)
    const { error } = await supabase
      .from('story_shares')
      .update({
        encrypted_payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', share.id)
      .eq('is_revoked', false)
    if (error) throw error
  }
}
