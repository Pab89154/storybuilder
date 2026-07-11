import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const authHeader = request.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  )

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user?.email) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { recoveryKey } = await request.json()
  if (!recoveryKey || typeof recoveryKey !== 'string') {
    return new Response('Missing recoveryKey', { status: 400 })
  }

  const resendKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('RECOVERY_FROM_EMAIL') ?? 'onboarding@resend.dev'

  if (!resendKey) {
    return new Response(JSON.stringify({ ok: true, emailed: false }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: user.email,
      subject: 'Your StoryBuilder recovery key',
      text: `Save this recovery key in a safe place. You will need it if you reset your password.\n\n${recoveryKey}`,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    return new Response(body, { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true, emailed: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
