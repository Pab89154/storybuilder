# Supabase setup for StoryBuilder

## 1. Run the database migration

In [Supabase Dashboard](https://supabase.com/dashboard/project/ujsxxvyhuutdttpfolqm/sql/new), open the **SQL Editor** and run the full contents of:

`supabase/migrations/20260711000000_auth_stories_sharing.sql`

This creates encrypted story tables, user encryption keys, share links, and RLS policies.

## 2. Configure Auth

In **Authentication → Providers**, keep **Email** enabled and disable other providers.

Recommended in **Authentication → Settings**:

- Enable **Confirm email**
- Set **Site URL** to your GitHub Pages URL (or `http://localhost:5173` for local dev)
- Add redirect URLs:
  - `http://localhost:5173/**`
  - `https://<your-github-username>.github.io/<repo-name>/**`

## 3. Environment variables

Copy `.env.example` to `.env` and set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SERVICE_ROLE_KEY` (local scripts / edge functions only — never in frontend)

For GitHub Pages, add these repository **Secrets** (Settings → Secrets and variables → Actions):

- `VITE_SUPABASE_URL` — your project URL
- `VITE_SUPABASE_ANON_KEY` — your publishable anon key

The deploy workflow (`.github/workflows/deploy-pages.yml`) passes them into `npm run build`.

## 4. Recovery key email (optional)

Deploy the edge function in `supabase/functions/send-recovery-email/` and set:

- `RESEND_API_KEY`
- `RECOVERY_FROM_EMAIL`

Without this, recovery keys are still shown in the app after signup; users should save them.

## 5. GitHub Pages base path

If the app is not served from the domain root, set `VITE_BASE_PATH` in your deploy environment (e.g. `/pablete-starter/`).
