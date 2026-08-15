# StoryBuilder

Browser-based story generator for children (up to 12 years). Runs **100% in the browser** with no backend — AI inference powered by [WebLLM](https://webllm.mlc.ai/) and local storage via IndexedDB.

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
- **Chrome 113+** or **Edge 113+** (recommended for WebGPU)
- ~**500 MB** free disk/browser cache for the AI model (one-time download)
- Stable internet connection for the **first visit only** (model download)

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

| Model | Size |
|-------|------|
| **Qwen2.5-0.5B-Instruct** | ~500 MB |

The first load shows a download progress bar. The model is cached by the browser for future visits.

WebGPU is used when available for faster inference; the same model runs without it.

### Check WebGPU

Open `chrome://gpu` in Chrome and confirm **WebGPU** is enabled. For best quality and speed, use a browser with WebGPU support.

## Data & privacy

- Stories, characters, and paragraphs are stored in **IndexedDB** on your device
- AI runs locally after the model is downloaded — prompts are not sent to any server
- Data is **not synced** across browsers or devices
- Clearing browser data will delete your stories

## Quality expectations

The in-browser 0.5B model is lighter on phones and produces good children's stories but will **not match cloud GPT-4 quality**. Use Chrome/Edge with WebGPU for the best speed.

## Project structure

```
src/
├── components/     # UI (layout, story, model)
├── db/             # Dexie / IndexedDB
├── hooks/          # useStories, useLLM, useGeneration
├── lib/llm/        # WebLLM engine, prompts, generation
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

- **Site URL:** `https://pab89154.github.io/storybuilder/` (or your production origin)
- **Redirect URLs:**
  - `http://localhost:5173/**`
  - `http://localhost:5175/**`
  - `https://pab89154.github.io/storybuilder/**`
  - `https://pab89154.github.io/storybuilder/reset-password`

The production build copies `index.html` to `404.html` so deep links like `/reset-password` work on GitHub Pages.

### Supabase Dashboard → Authentication → Providers → Email

Turn **Confirm email** off. Sign-up then returns a session immediately, so new
users go straight into the app without checking their inbox.
