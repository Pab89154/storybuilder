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
- ~**700 MB** free disk/browser cache for the AI model (one-time download)
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
| **Llama-3.2-1B-Instruct** | ~700 MB |

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

The in-browser 1B model produces good children's stories but will **not match cloud GPT-4 quality**. Use Chrome/Edge with WebGPU for the best speed.

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
