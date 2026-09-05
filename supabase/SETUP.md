# Supabase setup for StoryBuilder

## 1. Run the database migration

In [Supabase Dashboard](https://supabase.com/dashboard/project/ujsxxvyhuutdttpfolqm/sql/new), open the **SQL Editor** and run the full contents of:

`supabase/migrations/20260711000000_auth_stories_sharing.sql`

This creates encrypted story tables, user encryption keys, share links, and RLS policies.

## 2. Configure Auth

In **Authentication → Providers**, keep **Email** enabled and disable other providers.

Recommended in **Authentication → Providers → Email**:

- Disable **Confirm email** so new accounts can sign in immediately

In **Authentication → URL Configuration**:

- Set **Site URL** to `https://storybuilder.pw/` (or `http://localhost:5173` for local dev)
- Add redirect URLs:
  - `http://localhost:5173/**`
  - `https://storybuilder.pw/**`
  - `https://www.storybuilder.pw/**`
  - `https://<your-github-username>.github.io/<repo-name>/**` (optional)

## 3. Environment variables

Copy `.env.example` to `.env` and set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SERVICE_ROLE_KEY` (local scripts / edge functions only — never in frontend)

For GitHub Pages, add these repository **Secrets** (Settings → Secrets and variables → Actions):

- `VITE_SUPABASE_URL` — your project URL
- `VITE_SUPABASE_ANON_KEY` — your publishable anon key

The deploy workflow (`.github/workflows/deploy-pages.yml`) passes them into `npm run build`.

## 4. OpenAI story generation (required)

Deploy the edge function in `supabase/functions/openai-chat/` (already in the repo).

In **Project Settings → Edge Functions → Secrets**, add:

- `OPENAI_API_KEY` — your real OpenAI secret key (`sk-…`)

Do **not** put this key in `VITE_*` or Render frontend env vars. The browser calls
`/functions/v1/openai-chat`, which talks to OpenAI server-side (avoids CORS and keeps the key private).

## 5. Recovery key email (optional)

Deploy the edge function in `supabase/functions/send-recovery-email/` and set:

- `RESEND_API_KEY`
- `RECOVERY_FROM_EMAIL`

Without this, recovery keys are still shown in the app after signup; users should save them.

## 6. GitHub Pages base path

If the app is not served from the domain root, set `VITE_BASE_PATH` in your deploy environment (e.g. `/pablete-starter/`).
