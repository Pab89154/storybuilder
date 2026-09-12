# Supabase setup for StoryBuilder

## 1. Run the database migration

In [Supabase Dashboard](https://supabase.com/dashboard/project/ujsxxvyhuutdttpfolqm/sql/new), open the **SQL Editor** and run the full contents of:

`supabase/migrations/20260711000000_auth_stories_sharing.sql`

This creates encrypted story tables, user encryption keys, share links, and RLS policies.

## 2. Configure Auth (email verification + redirects)

Do **not** use `http://localhost:3000` anywhere. That is Supabase’s empty default and is
why “Verify email address” opens a blank page.

### 2a. URL Configuration (required)

Open [Auth URL Configuration](https://supabase.com/dashboard/project/ujsxxvyhuutdttpfolqm/auth/url-configuration):

| Setting | Value |
|--------|--------|
| **Site URL** | `https://storybuilder.pw/` |

**Redirect URLs** (add all):

- `https://storybuilder.pw/**`
- `https://www.storybuilder.pw/**`
- `https://storybuilder.pw/reset-password`
- `http://localhost:5173/**` (Vite local only — StoryBuilder uses 5173/5175, not 3000)
- `http://localhost:5175/**`

Save. New confirmation / reset emails will land on StoryBuilder, not localhost.

### 2b. Email templates (if links still go to localhost)

Open [Auth Email Templates](https://supabase.com/dashboard/project/ujsxxvyhuutdttpfolqm/auth/templates).

For **Confirm signup** and **Reset password**, ensure the button/link uses
`{{ .ConfirmationURL }}` (Supabase’s built-in confirm link) **or** builds from
`{{ .RedirectTo }}` — not a hard-coded `http://localhost:3000`.

### 2c. Custom SMTP (required for real users)

Supabase’s built-in mailer is for testing only (team emails, ~2/hour). For production,
open [Auth SMTP](https://supabase.com/dashboard/project/ujsxxvyhuutdttpfolqm/auth/smtp)
and enable **Custom SMTP**.

**Option A — Resend (recommended)**

1. Create a free account at [resend.com](https://resend.com) and an API key.
2. Verify a sending domain (or use Resend’s onboarding address for tests).
3. In Supabase SMTP:

| Field | Value |
|------|--------|
| Sender email | e.g. `noreply@yourdomain.com` (must be allowed by Resend) |
| Sender name | `StoryBuilder` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | your Resend API key |

**Option B — iCloud (same app-specific password as Feedback email)**

| Field | Value |
|------|--------|
| Sender email | your full iCloud address |
| Sender name | `StoryBuilder` |
| Host | `smtp.mail.me.com` |
| Port | `587` |
| Username | your full iCloud address |
| Password | [Apple app-specific password](https://appleid.apple.com) |

### 2d. Confirm email toggle

In **Authentication → Providers → Email**:

- **Easiest:** turn **Confirm email** **OFF** so signup works without inbox clicks.
- **If Confirm email stays ON:** complete 2a–2c first, then re-send verification from
  the app while signed up on `https://storybuilder.pw` (so `emailRedirectTo` is correct).

Keep **Email** enabled; disable unused OAuth providers.

## 3. Environment variables

Copy `.env.example` to `.env` and set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SERVICE_ROLE_KEY` (local scripts / edge functions only — never in frontend)

For GitHub Pages, add these repository **Secrets** (Settings → Secrets and variables → Actions):

- `VITE_SUPABASE_URL` — your project URL
- `VITE_SUPABASE_ANON_KEY` — your publishable anon key

The deploy workflow (`.github/workflows/deploy-pages.yml`) passes them into `npm run build`.

## 4. Gemini story generation (required)

Deploy the edge function in `supabase/functions/gemini-chat/` (already in the repo).

In **Project Settings → Edge Functions → Secrets**, add:

- `GEMINI_API_KEY` — your Google AI Studio / Gemini API key

Do **not** put this key in `VITE_*` or Render frontend env vars. The browser calls
`/functions/v1/gemini-chat`, which talks to Gemini server-side (avoids CORS and keeps the key private).

You can remove the old `OPENAI_API_KEY` secret if it is still present.

## 5. Recovery key email (optional)

Deploy the edge function in `supabase/functions/send-recovery-email/` and set:

- `RESEND_API_KEY`
- `RECOVERY_FROM_EMAIL`

Without this, recovery keys are still shown in the app after signup; users should save them.

## 6. GitHub Pages base path

If the app is not served from the domain root, set `VITE_BASE_PATH` in your deploy environment (e.g. `/pablete-starter/`).
