import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { applyNightModeClass, readNightMode, writeNightMode } from '@/lib/nightMode'

interface NightModeContextValue {
  nightMode: boolean
  toggleNightMode: () => void
}

const NightModeContext = createContext<NightModeContextValue | null>(null)

export function NightModeProvider({ children }: { children: ReactNode }) {
  const [nightMode, setNightMode] = useState(readNightMode)

  useLayoutEffect(() => {
    applyNightModeClass(nightMode)
  }, [nightMode])

  const toggleNightMode = useCallback(() => {
    setNightMode((prev) => {
      const next = !prev
      writeNightMode(next)
      return next
    })
  }, [])

  const value = useMemo(() => ({ nightMode, toggleNightMode }), [nightMode, toggleNightMode])

  return <NightModeContext.Provider value={value}>{children}</NightModeContext.Provider>
}

export function useNightMode() {
  const ctx = useContext(NightModeContext)
  if (!ctx) throw new Error('useNightMode must be used within NightModeProvider')
  return ctx
}
