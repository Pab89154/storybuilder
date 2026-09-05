# StoryBuilder

Browser-based story generator for children (up to 12 years). Stories are generated online via the OpenAI API; guest data stays in the browser (IndexedDB) and signed-in stories sync with Supabase.

The interface is available in **English**, **Spanish**, **Mandarin Chinese**, **Arabic**, **French**, and **German**.

## Features

- Generate stories in **English**, **Spanish**, **Mandarin Chinese**, **Arabic**, **French**, or **German**
- Structured **character bible** (name, good/bad, boy/girl, age, superpowers)
- ~**1000 word** stories generated in chunks with progress tracking
- **Generate**, **Continue**, **Regenerate paragraph**, and **manual edit**
- **Sidebar history** (ChatGPT-style) with search
- **Export to TXT**
- All data stored locally in your browser (no accounts)

## Requirements

- **Node.js 20+**
- Modern desktop or mobile browser with **internet access**
- `VITE_OPENAI_API_KEY` set for local and production builds

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Share on your local network (team testing)

```bash
npm run dev:lan
```

Then open the Network URL shown in the terminal (e.g. `http://192.168.x.x:5173`) from other devices on the same Wi‑Fi.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on localhost |
| `npm run dev:lan` | Dev server accessible on LAN |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

## AI model

Story generation uses **OpenAI** (`gpt-4o-mini`) over the network. There is no local/offline model.

## Data & privacy

- Guest stories stay in **IndexedDB** on your device
- Signed-in stories sync with **Supabase** (encrypted)
- Story prompts are sent to OpenAI to generate text
- Clearing browser data deletes guest stories on that device

## Project structure

```
src/
├── components/     # UI (layout, story)
├── db/             # Dexie / IndexedDB
├── hooks/          # useStories, useLLM, useGeneration
├── lib/llm/        # OpenAI engine, prompts, generation
├── lib/export/     # TXT export
├── store/          # Zustand state
└── types/          # TypeScript types
```

## License

MIT

## Feedback email setup (maintainers)

The app includes a **Feedback** button in the sidebar. When a user submits feedback, it opens a pre-filled GitHub Issue. A GitHub Actions workflow (`.github/workflows/feedback-email.yml`) emails **pmolinasamayoa@icloud.com** when a new feedback issue is created.

### One-time GitHub secrets

1. Create an [Apple ID app-specific password](https://appleid.apple.com) (Sign-In and Security → App-Specific Passwords).
2. In the GitHub repo, go to **Settings → Secrets and variables → Actions** and add:
   - `FEEDBACK_SMTP_USER` — your iCloud email (e.g. `pmolinasamayoa@icloud.com`)
   - `FEEDBACK_SMTP_PASSWORD` — the app-specific password (not your Apple ID password)

### Test

1. Open the app and click **Feedback** in the sidebar.
2. Fill in a message and click **Continue on GitHub**.
3. Submit the issue on GitHub.
4. Confirm the **Feedback email notification** workflow runs and the email arrives.

## Authentication setup

StoryBuilder uses Supabase Auth (email/password) with client-side encryption.

### Required environment variables

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_OR_PUBLISHABLE_KEY
```

For GitHub Pages builds, `.github/workflows/deploy-pages.yml` derives the base
path from the repository name. For this repository it resolves to:

```bash
VITE_BASE_PATH=/storybuilder/
```

Add repository secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Do not
use a Supabase `service_role` or secret key in either browser-facing variable.

### Supabase Dashboard → Authentication → URL configuration

Add these so password-reset links work:

- **Site URL:** `https://storybuilder.pw/`
- **Redirect URLs:**
  - `http://localhost:5173/**`
  - `http://localhost:5175/**`
  - `https://storybuilder.pw/**`
  - `https://storybuilder.pw/reset-password`
  - `https://www.storybuilder.pw/**`
  - `https://pab89154.github.io/storybuilder/**` (optional while Pages still runs)
  - `https://pab89154.github.io/storybuilder/reset-password`

The production build copies `index.html` to `404.html` so deep links like `/reset-password` work on GitHub Pages. Render uses an SPA rewrite instead (`render.yaml`).

### Supabase Dashboard → Authentication → Providers → Email

Turn **Confirm email** off. Sign-up then returns a session immediately, so new
users go straight into the app without checking their inbox.

### Deploy on Render + custom domain

StoryBuilder is a static Vite SPA. Use the Blueprint in `render.yaml`:

1. Push `render.yaml` to `main`, then open
   [Blueprint deploy](https://dashboard.render.com/blueprint/new?repo=https://github.com/Pab89154/storybuilder).
2. Set secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (same values as GitHub Pages).
   Keep `VITE_BASE_PATH=/` for `storybuilder.pw` (root hosting — not `/storybuilder/`).
3. After the service is live, note its `*.onrender.com` hostname.
4. In Render → **Settings → Custom Domains**, confirm `storybuilder.pw` and
   `www.storybuilder.pw` (declared in the Blueprint; DNS still required).
5. At your DNS provider:

| Host | Type | Value |
|------|------|--------|
| `@` (apex) | A (or ALIAS/ANAME) | Render’s apex target from the Dashboard |
| `www` | CNAME | `<your-service>.onrender.com` |

If DNS is on Cloudflare, you can CNAME-flatten `@` to `<your-service>.onrender.com`.
Remove any `AAAA` records for the domain. Then click **Verify** in Render and wait for TLS.
