# Pablete — Personal AI Agent for iPhone

A private, password-protected iPhone app that runs a **small free AI model on your phone** (no API bills).

## Name & logo

- **App name:** Pablete
- **Tagline:** Your private pocket agent
- **Logo:** `assets/pablete-app-icon.png` (in the repo root `.cursor` assets folder — copy it into Xcode)

Alternative names if you prefer something else:
- **Keeper** — emphasizes privacy + password
- **Nook** — cozy personal space
- **Sigil** — private, personal symbol

---

## What you need

1. Mac with **Xcode** installed (Mac App Store, free)
2. iPhone + cable (or Wi‑Fi debugging)
3. Free **Apple ID**
4. iPhone that supports **Apple Intelligence** (for free on-device AI):
   - iPhone 15 Pro or newer, OR
   - iPhone 16 / 16e or newer

If your phone is older, see **Plan B** at the bottom.

---

## Step-by-step: create the app in Xcode

### 1. Install Xcode

1. Open **App Store** on your Mac
2. Search **Xcode** → **Get**
3. Wait for install (~10–15 GB)

### 2. Create a new project

1. Open **Xcode**
2. **File → New → Project**
3. **iOS → App** → Next
4. Fill in:
   - **Product Name:** `Pablete`
   - **Team:** your Apple ID (add it in Xcode → Settings → Accounts if missing)
   - **Organization Identifier:** `com.yourname` (e.g. `com.pablo`)
   - **Interface:** SwiftUI
   - **Language:** Swift
5. Save anywhere (e.g. Desktop)

### 3. Add the source files

Copy every `.swift` file from this folder:

```
ios/PableteAgent/PableteAgent/
```

Into your Xcode project (drag them into the `Pablete` group in the left sidebar). When asked, check **Copy items if needed**.

Replace the default `ContentView.swift` and `PableteApp.swift` if Xcode created ones with the same names.

### 4. Add the app icon

1. Open `assets/pablete-app-icon.png` from this repo
2. In Xcode: click **Assets** → **AppIcon**
3. Drag the image into the **1024×1024** slot

### 5. Enable on-device AI (Apple Intelligence)

1. Select the **Pablete** project (blue icon, top of sidebar)
2. Select the **Pablete** target
3. **Signing & Capabilities** → **+ Capability**
4. Add **Apple Intelligence** (or **Foundation Models** if that’s what Xcode shows)
5. Set **Minimum Deployments** to **iOS 18.4** or newer (whatever Xcode recommends for Foundation Models)

On your iPhone: **Settings → Apple Intelligence & Siri** → turn on Apple Intelligence.

### 6. Run on your iPhone

1. Plug in your iPhone
2. Trust the computer on the phone if prompted
3. In Xcode’s top bar, pick your **iPhone** (not a simulator — simulators may not run the on-device model)
4. Click the **Play** button (▶)

First time only:
- iPhone: **Settings → General → VPN & Device Management** → trust your developer certificate

### 7. Set your password

1. App opens → **Create Password**
2. Enter a password (4+ characters) + confirm
3. You’re in → chat with Pablete

Password is stored in the **iOS Keychain** (secure, not plain text).

---

## How the free AI works

Pablete uses **Apple’s on-device Foundation Models** — a small language model that runs **on your iPhone**:

- **$0** — no API key, no subscription
- **Private** — chats stay on your device
- **Offline** — works without internet (after model is on device)

It’s not as powerful as ChatGPT, but it’s good for:
- Quick questions
- Drafting messages
- Brainstorming
- Personal notes and planning

---

## Plan B: older iPhone (no Apple Intelligence)

If your phone doesn’t support on-device Apple AI:

### Option A — Free API (easiest)

1. Sign up at [console.groq.com](https://console.groq.com) (free tier)
2. Get an API key
3. In `AIService.swift`, set `useCloudFallback = true` and paste your key
4. Uses **Llama 3.1 8B** in the cloud — still $0 within free limits, but needs internet

### Option B — Run AI on your Mac (fully free, local)

1. Install [Ollama](https://ollama.com) on your Mac
2. Run: `ollama pull llama3.2:1b`
3. Point the app at your Mac’s local IP (instructions in `AIService.swift` comments)

---

## Free Apple ID limits

- App works on **your phone only**
- May need **reinstall from Xcode every ~7 days** (free account)
- **$99/year** only if you want App Store publishing

---

## File overview

| File | Purpose |
|------|---------|
| `PableteApp.swift` | App entry point |
| `AppState.swift` | Login / setup flow |
| `KeychainHelper.swift` | Secure password storage |
| `SetupPasswordView.swift` | First-time password creation |
| `LockView.swift` | Password screen |
| `ChatView.swift` | Chat UI |
| `AIService.swift` | On-device AI + optional cloud fallback |

---

## Next features to add later

- Face ID / Touch ID unlock
- Chat history (SwiftData)
- Custom personality (“You are my study coach…”)
- Voice input (Speech framework)
- Home Screen widget
