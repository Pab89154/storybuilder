import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { applyBlindKidModeClass, readBlindKidMode, writeBlindKidMode } from '@/lib/blindKidMode'

interface BlindKidModeContextValue {
  blindKidMode: boolean
  toggleBlindKidMode: () => void
}

const BlindKidModeContext = createContext<BlindKidModeContextValue | null>(null)

export function BlindKidModeProvider({ children }: { children: ReactNode }) {
  const [blindKidMode, setBlindKidMode] = useState(readBlindKidMode)

  useLayoutEffect(() => {
    applyBlindKidModeClass(blindKidMode)
  }, [blindKidMode])

  const toggleBlindKidMode = useCallback(() => {
    setBlindKidMode((prev) => {
      const next = !prev
      writeBlindKidMode(next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ blindKidMode, toggleBlindKidMode }),
    [blindKidMode, toggleBlindKidMode],
  )

  return <BlindKidModeContext.Provider value={value}>{children}</BlindKidModeContext.Provider>
}

export function useBlindKidMode() {
  const ctx = useContext(BlindKidModeContext)
  if (!ctx) throw new Error('useBlindKidMode must be used within BlindKidModeProvider')
  return ctx
}
