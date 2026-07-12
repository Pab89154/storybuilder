import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { clearMasterKey } from '@/lib/crypto/keySession'
import {
  recoverUserEncryption,
  sendRecoveryKeyEmail,
  setupUserEncryption,
  unlockUserEncryption,
} from '@/lib/cloud/encryptionKeys'
import { clearGuestData } from '@/lib/guest/database'
import { setDatabaseAuthMode } from '@/db/database'
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client'

type AuthContextValue = {
  user: User | null
  session: Session | null
  isLoading: boolean
  encryptionReady: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<{ recoveryKey: string; needsEmailConfirmation: boolean }>
  signOut: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  completePasswordReset: (password: string, recoveryKey: string) => Promise<void>
  unlockEncryption: (password: string) => Promise<{ recoveryKey?: string }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function ensureEncryptionForPassword(password: string): Promise<{ recoveryKey?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('user_encryption_keys')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) throw error

  if (!data) {
    const { recoveryKey } = await setupUserEncryption(password)
    void sendRecoveryKeyEmail(recoveryKey)
    return { recoveryKey }
  }

  await unlockUserEncryption(password)
  return {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [encryptionReady, setEncryptionReady] = useState(false)

  useEffect(() => {
    let mounted = true

    if (!isSupabaseConfigured) {
      setIsLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setIsLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      if (!nextSession) {
        clearMasterKey()
        setEncryptionReady(false)
        setDatabaseAuthMode('guest')
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured for this deployment.')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    await ensureEncryptionForPassword(password)
    clearGuestData()
    setDatabaseAuthMode('authenticated')
    setEncryptionReady(true)
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured for this deployment.')
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
    })
    if (error) throw error

    const needsEmailConfirmation = !data.session
    if (data.session) {
      const { recoveryKey } = await ensureEncryptionForPassword(password)
      clearGuestData()
      setDatabaseAuthMode('authenticated')
      setEncryptionReady(true)
      return { recoveryKey: recoveryKey ?? '', needsEmailConfirmation: false }
    }

    return { recoveryKey: '', needsEmailConfirmation }
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    clearMasterKey()
    clearGuestData()
    setDatabaseAuthMode('guest')
    setEncryptionReady(false)
  }, [])

  const requestPasswordReset = useCallback(async (email: string) => {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured for this deployment.')
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) throw error
  }, [])

  const completePasswordReset = useCallback(async (password: string, recoveryKey: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
    await recoverUserEncryption(recoveryKey, password)
    setDatabaseAuthMode('authenticated')
    setEncryptionReady(true)
  }, [])

  const unlockEncryption = useCallback(async (password: string) => {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured for this deployment.')
    const result = await ensureEncryptionForPassword(password)
    setDatabaseAuthMode('authenticated')
    setEncryptionReady(true)
    return result
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isLoading,
      encryptionReady,
      isAuthenticated: Boolean(user && encryptionReady),
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      completePasswordReset,
      unlockEncryption,
    }),
    [
      user,
      session,
      isLoading,
      encryptionReady,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      completePasswordReset,
      unlockEncryption,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
