export type ShareAccessMode = 'view' | 'edit'

export interface StoryShareRecord {
  id: string
  storyId: string
  shareToken: string
  accessMode: ShareAccessMode
  isRevoked: boolean
  createdAt: number
  updatedAt: number
}

export interface SharedStorySession {
  shareId: string
  shareToken: string
  shareSecret: string
  accessMode: ShareAccessMode
  canEdit: boolean
}
