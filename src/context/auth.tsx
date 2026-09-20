import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  rotateOAuthUserEncryption,
  sendRecoveryKeyEmail,
  setupOAuthUserEncryption,
  setupUserEncryption,
  unlockUserEncryption,
  userHasEncryptionKeys,
} from '@/lib/cloud/encryptionKeys'
import { clearGuestData } from '@/lib/guest/database'
import { setDatabaseAuthMode } from '@/db/database'
import { buildAppUrl } from '@/lib/auth/redirects'
import {
  isSupabaseConfigured,
  supabase,
  supabaseConfigError,
} from '@/lib/supabase/client'

type OAuthProvider = 'github'

type AuthContextValue = {
  user: User | null
  session: Session | null
  isLoading: boolean
  encryptionReady: boolean
  isAuthenticated: boolean
  isConfigured: boolean
  signIn: (email: string, password: string) => Promise<{ recoveryKey?: string }>
  signUp: (email: string, password: string) => Promise<{ recoveryKey: string; needsEmailConfirmation: boolean }>
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>
  signOut: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  completePasswordReset: (password: string, recoveryKey: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function hasOAuthIdentity(user: User): boolean {
  const identities = user.identities ?? []
  if (identities.some((identity) => identity.provider === 'github')) {
    return true
  }
  return user.app_metadata?.provider === 'github'
}

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

async function migrateGuestData(): Promise<void> {
  try {
    const { migrateGuestFoldersToCloud } = await import('@/lib/cloud/database')
    await migrateGuestFoldersToCloud()
    clearGuestData()
  } catch (migrationError) {
    console.warn('[auth] Failed to migrate guest collections', migrationError)
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(() => isSupabaseConfigured)
  const [encryptionReady, setEncryptionReady] = useState(false)
  const oauthBootstrapRef = useRef<Promise<void> | null>(null)

  const markReady = useCallback(async (nextSession: Session) => {
    setSession(nextSession)
    setUser(nextSession.user)
    setDatabaseAuthMode('authenticated')
    setEncryptionReady(true)
    await migrateGuestData()
  }, [])

  const bootstrapOAuthSession = useCallback(
    async (nextSession: Session) => {
      if (getMasterKey()) {
        await markReady(nextSession)
        return
      }

      const persisted = await loadPersistedMasterKey(nextSession.user.id)
      if (persisted) {
        await markReady(nextSession)
        return
      }

      const hasKeys = await userHasEncryptionKeys()
      if (!hasKeys) {
        await setupOAuthUserEncryption()
      } else {
        // Local key missing (new browser / cleared storage). Mint a fresh device key
        // so GitHub sign-in never asks for a recovery key.
        await rotateOAuthUserEncryption()
      }
      const key = getMasterKey()
      if (key) await persistMasterKey(nextSession.user.id, key)
      await markReady(nextSession)
    },
    [markReady],
  )

  const runOAuthBootstrap = useCallback(
    (nextSession: Session) => {
      if (!oauthBootstrapRef.current) {
        oauthBootstrapRef.current = bootstrapOAuthSession(nextSession)
          .catch((error) => {
            console.warn('[auth] OAuth encryption bootstrap failed', error)
          })
          .finally(() => {
            oauthBootstrapRef.current = null
          })
      }
      return oauthBootstrapRef.current
    },
    [bootstrapOAuthSession],
  )

  useEffect(() => {
    let mounted = true

    if (!isSupabaseConfigured) {
      if (import.meta.env.DEV) {
        console.warn('[auth] Supabase is unavailable:', supabaseConfigError)
      }
      return
    }

    supabase.auth
      .getSession()
      .then(async ({ data, error }) => {
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
        if (restoredUser && data.session) {
          const key = await loadPersistedMasterKey(restoredUser.id)
          if (!mounted) return
          if (key) {
            setSession(data.session)
            setUser(restoredUser)
            setDatabaseAuthMode('authenticated')
            setEncryptionReady(true)
            setIsLoading(false)
            await migrateGuestData()
            return
          }

          if (hasOAuthIdentity(restoredUser)) {
            await runOAuthBootstrap(data.session)
            if (!mounted) return
            setIsLoading(false)
            return
          }

          // Email session without a local key: sign out so password login unlocks again.
          await supabase.auth.signOut()
          if (!mounted) return
          clearMasterKey()
          setDatabaseAuthMode('guest')
        }
        setSession(null)
        setUser(null)
        setIsLoading(false)
      })
      .catch(() => {
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
      if (!nextSession) {
        setSession(null)
        setUser(null)
        clearMasterKey()
        setEncryptionReady(false)
        setDatabaseAuthMode('guest')
        return
      }

      if (event === 'PASSWORD_RECOVERY') {
        setSession(nextSession)
        setUser(nextSession.user)
        setDatabaseAuthMode('authenticated')
        return
      }

      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (getMasterKey()) {
          setSession(nextSession)
          setUser(nextSession.user)
          setEncryptionReady(true)
          setDatabaseAuthMode('authenticated')
          return
        }
        if (hasOAuthIdentity(nextSession.user)) {
          void runOAuthBootstrap(nextSession)
          return
        }
        setSession(nextSession)
        setUser(nextSession.user)
        return
      }

      setSession(nextSession)
      setUser(nextSession.user)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [runOAuthBootstrap])

  useEffect(() => {
    setDatabaseAuthMode(user && encryptionReady ? 'authenticated' : 'guest')
  }, [user, encryptionReady])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured for this deployment.')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    try {
      const result = await ensureEncryptionForPassword(password)
      setDatabaseAuthMode('authenticated')
      setEncryptionReady(true)
      setSession(data.session)
      setUser(data.user)
      await migrateGuestData()
      return result
    } catch (encryptionError) {
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
        setDatabaseAuthMode('authenticated')
        setEncryptionReady(true)
        setSession(data.session)
        setUser(data.user)
        await migrateGuestData()
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

  const signInWithOAuth = useCallback(async (provider: OAuthProvider) => {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured for this deployment.')
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: buildAppUrl(),
      },
    })
    if (error) throw error
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
      signInWithOAuth,
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
      signInWithOAuth,
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
