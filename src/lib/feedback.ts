const FEEDBACK_REPO = 'Pab89154/storybuilder'
const FEEDBACK_TITLE = '[Feedback] StoryBuilder'

export interface FeedbackPayload {
  message: string
  contact?: string
}

export function buildFeedbackIssueUrl({ message, contact }: FeedbackPayload): string {
  const body = [
    '**Message:**',
    message.trim(),
    '',
    '**Contact (optional):**',
    contact?.trim() || 'Not provided',
    '',
    '**App version:**',
    import.meta.env.VERSION ?? 'unknown',
    '**User agent:**',
    navigator.userAgent,
  ].join('\n')

  const params = new URLSearchParams({
    title: FEEDBACK_TITLE,
    body,
  })

  return `https://github.com/${FEEDBACK_REPO}/issues/new?${params.toString()}`
}

export function openFeedbackIssue(payload: FeedbackPayload): void {
  const url = buildFeedbackIssueUrl(payload)
  window.open(url, '_blank', 'noopener,noreferrer')
}
