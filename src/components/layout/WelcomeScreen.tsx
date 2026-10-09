import { BookOpen, BookPlus, Feather, Globe2, Plus, Shield, Sparkles, Users, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStoryCreation } from '@/context/storyCreation'
import { useUiT } from '@/i18n/context'

const STEPS = [
  { key: 'workspace.welcomeStep1' as const, Icon: BookPlus },
  { key: 'workspace.welcomeStep2' as const, Icon: Users },
  { key: 'workspace.welcomeStep3' as const, Icon: Wand2 },
]

export function WelcomeScreen() {
  const t = useUiT()
  const { openNewStoryFlow } = useStoryCreation()

  return (
    <section className="welcome-studio" aria-labelledby="welcome-heading">
      <div className="welcome-studio-ambient" aria-hidden="true">
        <span className="welcome-blob welcome-blob-a" />
        <span className="welcome-blob welcome-blob-b" />
        <span className="welcome-blob welcome-blob-c" />
        <span className="welcome-sparkle welcome-sparkle-a">
          <Sparkles className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <span className="welcome-sparkle welcome-sparkle-b">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
        </span>
        <span className="welcome-sparkle welcome-sparkle-c">
          <Feather className="h-4 w-4" strokeWidth={1.75} />
        </span>
      </div>

      <div className="welcome-studio-panel welcome-studio-enter">
        <div className="welcome-studio-copy">
          <p className="welcome-studio-eyebrow">{t('workspace.welcomeEyebrow')}</p>
          <h2 id="welcome-heading" className="welcome-studio-title">
            {t('workspace.welcomeTitle')}
          </h2>
          <p className="welcome-studio-hint">{t('workspace.welcomeHint')}</p>

          <div className="welcome-studio-cta">
            <Button
              type="button"
              size="lg"
              className="welcome-studio-cta-button"
              onClick={openNewStoryFlow}
            >
              <Plus className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              {t('workspace.createFirstStory')}
            </Button>
          </div>

          <ul className="welcome-studio-badges">
            <li className="welcome-studio-badge">
              <Shield className="h-3.5 w-3.5 shrink-0" strokeWidth={1.85} aria-hidden="true" />
              <span>{t('workspace.welcomeBadgePrivate')}</span>
            </li>
            <li className="welcome-studio-badge">
              <Globe2 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.85} aria-hidden="true" />
              <span>{t('workspace.welcomeBadgeBrowser')}</span>
            </li>
          </ul>

          <ol className="welcome-studio-steps">
            {STEPS.map(({ key, Icon }, index) => (
              <li key={key} className="welcome-studio-step">
                <span className="welcome-studio-step-index" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="welcome-studio-step-icon" aria-hidden="true">
                  <Icon className="h-4 w-4" strokeWidth={1.85} />
                </span>
                <span className="welcome-studio-step-text">{t(key)}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="welcome-studio-preview" aria-hidden="true">
          <div className="storybook-preview">
            <div className="storybook-preview-spine" />
            <div className="storybook-preview-cover">
              <div className="storybook-preview-mark">
                <BookOpen className="h-6 w-6" strokeWidth={1.6} />
              </div>
              <div className="storybook-preview-lines">
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="storybook-preview-chip">
                <Users className="h-3.5 w-3.5" strokeWidth={1.85} />
                <Wand2 className="h-3.5 w-3.5" strokeWidth={1.85} />
              </div>
            </div>
            <div className="storybook-preview-page" />
          </div>
        </div>
      </div>
    </section>
  )
}
