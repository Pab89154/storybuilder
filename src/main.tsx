import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from '@/context/auth'
import { BlindKidModeProvider } from '@/context/blindKidMode'
import { NightModeProvider } from '@/context/nightMode'
import { UiLanguageProvider } from '@/i18n/context'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BlindKidModeProvider>
        <NightModeProvider>
          <UiLanguageProvider>
            <App />
          </UiLanguageProvider>
        </NightModeProvider>
      </BlindKidModeProvider>
    </AuthProvider>
  </StrictMode>,
)
