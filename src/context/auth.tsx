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
import {
  clearMasterKey,
  clearPersistedMasterKey,
  getMasterKey,
  loadPersistedMasterKey,
  persistMasterKey,
} from '@/lib/crypto/keySession'
import {
  recoverUserEncryption,
  sendRecoveryKeyEmail,
  setupUserEncryption,
  unlockUserEncryption,
} from '@/lib/cloud/encryptionKeys'
import { clearGuestData } from '@/lib/guest/database'
import { setDatabaseAuthMode } from '@/db/database'
import { buildAppUrl } from '@/lib/auth/redirects'
import {
  isSupabaseConfigured,
  supabase,
  supabaseConfigError,
} from '@/lib/supabase/client'

type AuthContextValue = {
  user: User | null
  session: Session | null
  isLoading: boolean
  encryptionReady: boolean
  isAuthenticated: boolean
  isConfigured: boolean
  signIn: (email: string, password: string) => Promise<{ recoveryKey?: string }>
  signUp: (email: string, password: string) => Promise<{ recoveryKey: string; needsEmailConfirmation: boolean }>
  signOut: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  completePasswordReset: (password: string, recoveryKey: string) => Promise<void>
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

  let result: { recoveryKey?: string } = {}
  if (!data) {
    const { recoveryKey } = await setupUserEncryption(password)
    void sendRecoveryKeyEmail(recoveryKey)
    result = { recoveryKey }
  } else {
    await unlockUserEncryption(password)
  }

  const key = getMasterKey()
  if (key) await persistMasterKey(user.id, key)
  return result
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(() => isSupabaseConfigured)
  const [encryptionReady, setEncryptionReady] = useState(false)

  useEffect(() => {
    let mounted = true

    if (!isSupabaseConfigured) {
      if (import.meta.env.DEV) {
        console.warn('[auth] Supabase is unavailable:', supabaseConfigError)
      }
      return
    }

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!mounted) return
      if (error) {
        console.warn('[auth] Failed to restore session')
        setSession(null)
        setUser(null)
        setDatabaseAuthMode('guest')
        setIsLoading(false)
        return
      }

      const restoredUser = data.session?.user ?? null
      if (restoredUser) {
        const key = await loadPersistedMasterKey(restoredUser.id)
        if (!mounted) return
        if (key) {
          setSession(data.session)
          setUser(restoredUser)
          setDatabaseAuthMode('authenticated')
          setEncryptionReady(true)
          setIsLoading(false)
          return
        }
        // Session persisted but the local key is gone (e.g. cleared storage or a
        // new device). Sign out so the user simply logs in again, which unlocks
        // automatically — no separate unlock password step.
        await supabase.auth.signOut()
        if (!mounted) return
        clearMasterKey()
        setDatabaseAuthMode('guest')
      }
      setSession(null)
      setUser(null)
      setIsLoading(false)
    }).catch(() => {
      if (!mounted) return
      console.warn('[auth] Failed to initialize authentication')
      clearMasterKey()
      setSession(null)
      setUser(null)
      setEncryptionReady(false)
      setDatabaseAuthMode('guest')
      setIsLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      if (!nextSession) {
        clearMasterKey()
        setEncryptionReady(false)
        setDatabaseAuthMode('guest')
      } else if (event === 'PASSWORD_RECOVERY') {
        // Keep session for reset-password page; encryption unlock happens there.
        setDatabaseAuthMode('authenticated')
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured for this deployment.')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    try {
      const result = await ensureEncryptionForPassword(password)
      clearGuestData()
      setDatabaseAuthMode('authenticated')
      setEncryptionReady(true)
      setSession(data.session)
      setUser(data.user)
      return result
    } catch (encryptionError) {
      // Avoid leaving a half-authenticated session if encryption unlock fails.
      await supabase.auth.signOut().catch(() => undefined)
      clearMasterKey()
      setEncryptionReady(false)
      setDatabaseAuthMode('guest')
      setSession(null)
      setUser(null)
      throw encryptionError
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured for this deployment.')
    const redirectTo = buildAppUrl()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
    })
    if (error) throw error

    const needsEmailConfirmation = !data.session
    if (data.session) {
      try {
        const { recoveryKey } = await ensureEncryptionForPassword(password)
        clearGuestData()
        setDatabaseAuthMode('authenticated')
        setEncryptionReady(true)
        setSession(data.session)
        setUser(data.user)
        return { recoveryKey: recoveryKey ?? '', needsEmailConfirmation: false }
      } catch (encryptionError) {
        await supabase.auth.signOut().catch(() => undefined)
        clearMasterKey()
        setEncryptionReady(false)
        setDatabaseAuthMode('guest')
        setSession(null)
        setUser(null)
        throw encryptionError
      }
    }

    return { recoveryKey: '', needsEmailConfirmation }
  }, [])

  const signOut = useCallback(async () => {
    const userId = user?.id
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    }
    clearMasterKey()
    clearPersistedMasterKey(userId)
    clearGuestData()
    setDatabaseAuthMode('guest')
    setEncryptionReady(false)
    setSession(null)
    setUser(null)
  }, [user])

  const requestPasswordReset = useCallback(async (email: string) => {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured for this deployment.')
    const redirectTo = buildAppUrl('reset-password')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) throw error
  }, [])

  const completePasswordReset = useCallback(async (password: string, recoveryKey: string) => {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured for this deployment.')
    const {
      data: { user: resetUser },
      error,
    } = await supabase.auth.updateUser({ password })
    if (error) throw error
    await recoverUserEncryption(recoveryKey, password)
    const key = getMasterKey()
    if (key && resetUser) await persistMasterKey(resetUser.id, key)
    setDatabaseAuthMode('authenticated')
    setEncryptionReady(true)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isLoading,
      encryptionReady,
      isAuthenticated: Boolean(user && encryptionReady),
      isConfigured: isSupabaseConfigured,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      completePasswordReset,
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
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
