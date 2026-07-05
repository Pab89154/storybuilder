import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { NightModeProvider } from '@/context/nightMode'
import { UiLanguageProvider } from '@/i18n/context'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NightModeProvider>
      <UiLanguageProvider>
        <App />
      </UiLanguageProvider>
    </NightModeProvider>
  </StrictMode>,
)
