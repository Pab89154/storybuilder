import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { AuthDialog } from '@/components/auth/AuthDialog'
import { GuestRegisterPrompt } from '@/components/auth/GuestRegisterPrompt'
import { NewStoryDialog } from '@/components/story/NewStoryDialog'
import { useAuth } from '@/context/auth'
import { useStories } from '@/hooks/useStories'

type StoryCreationContextValue = {
  openNewStoryFlow: () => void
  openSignIn: () => void
}

const StoryCreationContext = createContext<StoryCreationContextValue | null>(null)

export function StoryCreationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const { createNewStory } = useStories()
  const [showNewStory, setShowNewStory] = useState(false)
  const [showGuestPrompt, setShowGuestPrompt] = useState(false)
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [authDialogMode, setAuthDialogMode] = useState<'signIn' | 'signUp' | 'forgot'>('signUp')

  const openNewStoryFlow = useCallback(() => {
    if (!isAuthenticated) {
      setShowGuestPrompt(true)
      return
    }
    setShowNewStory(true)
  }, [isAuthenticated])

  const openSignIn = useCallback(() => {
    setAuthDialogMode('signIn')
    setShowAuthDialog(true)
  }, [])

  const value = useMemo(
    () => ({
      openNewStoryFlow,
      openSignIn,
    }),
    [openNewStoryFlow, openSignIn],
  )

  return (
    <StoryCreationContext.Provider value={value}>
      {children}
      <NewStoryDialog
        open={showNewStory}
        onOpenChange={setShowNewStory}
        onCreate={(language, readerAge) => {
          void createNewStory(language, readerAge)
        }}
      />
      <GuestRegisterPrompt
        open={showGuestPrompt}
        onOpenChange={setShowGuestPrompt}
        onContinueGuest={() => {
          setShowGuestPrompt(false)
          setShowNewStory(true)
        }}
        onRegister={() => {
          setShowGuestPrompt(false)
          setAuthDialogMode('signUp')
          setShowAuthDialog(true)
        }}
      />
      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} initialMode={authDialogMode} />
    </StoryCreationContext.Provider>
  )
}

export function useStoryCreation(): StoryCreationContextValue {
  const context = useContext(StoryCreationContext)
  if (!context) throw new Error('useStoryCreation must be used within StoryCreationProvider')
  return context
}
