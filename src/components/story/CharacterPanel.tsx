import { ChevronDown, ChevronRight, Plus, Trash2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputWithMic } from '@/components/ui/input-with-mic'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { addCharacter, deleteCharacter, updateCharacter } from '@/db/database'
import { useUiT } from '@/i18n/context'
import { useStories } from '@/hooks/useStories'
import { generateRandomCharacter, isRandomCharacterName } from '@/lib/randomCharacter'
import {
  formatCharacterListValue,
  joinCharacterList,
  splitCharacterList,
} from '@/lib/characterFields'
import { cn } from '@/lib/utils'
import type { Character, CharacterAlignment, CharacterGender, Language } from '@/types/story'
import type { ReactNode } from 'react'
import { useState } from 'react'

function CharacterFieldRow({
  label,
  children,
  compact,
  className,
}: {
  label: string
  children: ReactNode
  compact?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid items-center gap-2',
        compact ? 'grid-cols-[5.75rem_1fr] gap-x-2' : 'grid-cols-[7rem_1fr] gap-x-3',
        className,
      )}
    >
      <Label className="text-xs text-[var(--color-muted-foreground)]">{label}</Label>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

const emptyCharacter = {
  name: '',
  nickname: '',
  alignment: 'good' as CharacterAlignment,
  gender: 'boy' as CharacterGender,
  age: 10,
  isHuman: true,
  hasSuperpowers: false,
  superpowerDescription: '',
  hasPet: false,
  petName: '',
  petSpecies: '',
  petHasSuperpowers: false,
  petSuperpowerDescription: '',
  hasVehicle: false,
  vehicleType: '',
  vehicleColor: '',
  vehicleSpeed: '',
}

export function formatCharacterSummary(
  characters: Character[],
  t: (key: string) => string,
): string {
  if (characters.length === 0) return t('characters.none')
  const names = characters.map((c) => c.name.trim() || t('characters.unnamed'))
  if (names.length === 1) return names[0]
  if (names.length <= 3) return names.join(', ')
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`
}

function formatCharacterDetailSummary(character: Character, t: (key: string) => string): string {
  const alignment = character.alignment === 'good' ? t('characters.good') : t('characters.bad')
  const gender = character.gender === 'boy' ? t('characters.boy') : t('characters.girl')
  const speciesItems = splitCharacterList(character.species)
  const type = (character.isHuman ?? true)
    ? t('characters.human')
    : speciesItems.length > 0
      ? joinCharacterList(speciesItems)
      : t('characters.nonHuman')
  const parts = [alignment, gender, `${t('characters.age')} ${character.age}`, type]
  const nicknames = formatCharacterListValue(character.nickname)
  if (nicknames) parts.push(`"${nicknames}"`)
  if (character.hasSuperpowers) {
    const powers = formatCharacterListValue(character.superpowerDescription)
    parts.push(powers || t('characters.superpowers'))
  }
  if (character.hasPet) {
    const petNames = formatCharacterListValue(character.petName, t('characters.unnamedPet'))
    const petSpecies = formatCharacterListValue(character.petSpecies)
    parts.push(petSpecies ? `${petNames} (${petSpecies})` : petNames)
  }
  if (character.hasVehicle) {
    const vehicleTypes = formatCharacterListValue(
      character.vehicleType,
      t('characters.unnamedVehicle'),
    )
    parts.push(vehicleTypes)
  }
  return parts.join(' · ')
}

function isNewCharacterDraft(character: Character): boolean {
  return !character.name.trim()
}

function CharacterCard({
  character,
  language,
  compact,
  t,
  onUpdate,
  onRandomize,
  onDelete,
}: {
  character: Character
  language: Language
  compact?: boolean
  t: (key: string) => string
  onUpdate: (updates: Partial<Omit<Character, 'id' | 'storyId'>>) => void
  onRandomize: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(() => isNewCharacterDraft(character))

  return (
    <div
      className={cn(
        'w-full rounded-xl border bg-white shadow-sm',
        compact ? 'p-2.5' : 'p-4',
      )}
    >
      <div className="flex items-start gap-1">
        <button
          type="button"
          className={cn(
            'mt-1 shrink-0 rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]/60',
            compact ? 'p-0.5' : 'p-1',
          )}
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
        >
          {open ? (
            <ChevronDown className={cn(compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
          ) : (
            <ChevronRight className={cn(compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <InputWithMic
              language={language}
              value={character.name}
              onChange={(e) => void onUpdate({ name: e.target.value })}
              onBlur={() => {
                if (isRandomCharacterName(character.name)) onRandomize()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isRandomCharacterName(character.name)) {
                  e.preventDefault()
                  onRandomize()
                }
              }}
              placeholder={t('characters.namePlaceholder')}
              className={cn('min-w-0 flex-1 font-medium', compact && 'h-8 text-xs')}
            />
            <Button
              variant="ghost"
              size="icon"
              className={cn('shrink-0', compact && 'h-8 w-8')}
              onClick={() => void onDelete()}
              aria-label={t('sidebar.delete')}
            >
              <Trash2 className="h-4 w-4 text-[var(--color-destructive)]" />
            </Button>
          </div>
          {!open ? (
            <p
              className={cn(
                'mt-1.5 truncate text-[var(--color-muted-foreground)]',
                compact ? 'text-[10px]' : 'text-xs',
              )}
            >
              {formatCharacterDetailSummary(character, t)}
            </p>
          ) : null}
        </div>
      </div>

      {open ? (
        <div className={cn('flex flex-col', compact ? 'mt-2 gap-1.5 pl-5' : 'mt-3 gap-2 pl-6')}>
          <CharacterFieldRow label={t('characters.nickname')} compact={compact}>
            <InputWithMic
              language={language}
              className={cn('w-full', compact && 'h-8 text-xs')}
              value={character.nickname ?? ''}
              onChange={(e) => void onUpdate({ nickname: e.target.value })}
              placeholder={t('characters.nicknamePlaceholder')}
            />
          </CharacterFieldRow>
          <CharacterFieldRow label={t('characters.alignment')} compact={compact}>
            <Select
              value={character.alignment}
              onValueChange={(value: CharacterAlignment) =>
                void onUpdate({ alignment: value })
              }
            >
              <SelectTrigger className={cn('w-full', compact && 'h-8 text-xs')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="good">{t('characters.good')}</SelectItem>
                <SelectItem value="bad">{t('characters.bad')}</SelectItem>
              </SelectContent>
            </Select>
          </CharacterFieldRow>
          <CharacterFieldRow label={t('characters.gender')} compact={compact}>
            <Select
              value={character.gender}
              onValueChange={(value: CharacterGender) => void onUpdate({ gender: value })}
            >
              <SelectTrigger className={cn('w-full', compact && 'h-8 text-xs')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="boy">{t('characters.boy')}</SelectItem>
                <SelectItem value="girl">{t('characters.girl')}</SelectItem>
              </SelectContent>
            </Select>
          </CharacterFieldRow>
          <CharacterFieldRow label={t('characters.age')} compact={compact}>
            <Input
              className={cn('w-full', compact && 'h-8 text-xs')}
              type="number"
              min={1}
              max={99}
              value={character.age}
              onChange={(e) =>
                void onUpdate({ age: Number(e.target.value) || 1 })
              }
            />
          </CharacterFieldRow>
          <CharacterFieldRow label={t('characters.type')} compact={compact}>
            <Select
              value={(character.isHuman ?? true) ? 'human' : 'non-human'}
              onValueChange={(value) =>
                void onUpdate({
                  isHuman: value === 'human',
                  species: value === 'human' ? '' : character.species,
                })
              }
            >
              <SelectTrigger className={cn('w-full', compact && 'h-8 text-xs')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="human">{t('characters.human')}</SelectItem>
                <SelectItem value="non-human">{t('characters.nonHuman')}</SelectItem>
              </SelectContent>
            </Select>
          </CharacterFieldRow>
          <CharacterFieldRow label={t('characters.superpowers')} compact={compact}>
            <Select
              value={character.hasSuperpowers ? 'yes' : 'no'}
              onValueChange={(value) =>
                void onUpdate({ hasSuperpowers: value === 'yes' })
              }
            >
              <SelectTrigger className={cn('w-full', compact && 'h-8 text-xs')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">{t('characters.no')}</SelectItem>
                <SelectItem value="yes">{t('characters.yes')}</SelectItem>
              </SelectContent>
            </Select>
          </CharacterFieldRow>

          {!(character.isHuman ?? true) && (
            <CharacterFieldRow label={t('characters.species')} compact={compact}>
              <InputWithMic
                language={language}
                className={cn('w-full', compact && 'h-8 text-xs')}
                value={character.species ?? ''}
                onChange={(e) => void onUpdate({ species: e.target.value })}
                placeholder={t('characters.speciesPlaceholder')}
              />
            </CharacterFieldRow>
          )}

          {character.hasSuperpowers && (
            <CharacterFieldRow label={t('characters.powers')} compact={compact}>
              <InputWithMic
                language={language}
                className={cn('w-full', compact && 'h-8 text-xs')}
                value={character.superpowerDescription ?? ''}
                onChange={(e) =>
                  void onUpdate({ superpowerDescription: e.target.value })
                }
                placeholder={t('characters.powersPlaceholder')}
              />
            </CharacterFieldRow>
          )}

          <CharacterFieldRow label={t('characters.pet')} compact={compact}>
            <Select
              value={character.hasPet ? 'yes' : 'no'}
              onValueChange={(value) =>
                void onUpdate({
                  hasPet: value === 'yes',
                  petName: value === 'yes' ? character.petName : '',
                  petSpecies: value === 'yes' ? character.petSpecies : '',
                  petHasSuperpowers: value === 'yes' ? character.petHasSuperpowers : false,
                  petSuperpowerDescription:
                    value === 'yes' ? character.petSuperpowerDescription : '',
                })
              }
            >
              <SelectTrigger className={cn('w-full', compact && 'h-8 text-xs')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">{t('characters.no')}</SelectItem>
                <SelectItem value="yes">{t('characters.yes')}</SelectItem>
              </SelectContent>
            </Select>
          </CharacterFieldRow>

          {character.hasPet && (
            <>
              <CharacterFieldRow label={t('characters.petName')} compact={compact}>
                <InputWithMic
                  language={language}
                  className={cn('w-full', compact && 'h-8 text-xs')}
                  value={character.petName ?? ''}
                  onChange={(e) => void onUpdate({ petName: e.target.value })}
                  placeholder={t('characters.petNamePlaceholder')}
                />
              </CharacterFieldRow>
              <CharacterFieldRow label={t('characters.petSpecies')} compact={compact}>
                <InputWithMic
                  language={language}
                  className={cn('w-full', compact && 'h-8 text-xs')}
                  value={character.petSpecies ?? ''}
                  onChange={(e) => void onUpdate({ petSpecies: e.target.value })}
                  placeholder={t('characters.petSpeciesPlaceholder')}
                />
              </CharacterFieldRow>
              <CharacterFieldRow label={t('characters.petSuperpowers')} compact={compact}>
                <Select
                  value={character.petHasSuperpowers ? 'yes' : 'no'}
                  onValueChange={(value) =>
                    void onUpdate({
                      petHasSuperpowers: value === 'yes',
                      petSuperpowerDescription:
                        value === 'yes' ? character.petSuperpowerDescription : '',
                    })
                  }
                >
                  <SelectTrigger className={cn('w-full', compact && 'h-8 text-xs')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">{t('characters.no')}</SelectItem>
                    <SelectItem value="yes">{t('characters.yes')}</SelectItem>
                  </SelectContent>
                </Select>
              </CharacterFieldRow>
              {character.petHasSuperpowers && (
                <CharacterFieldRow label={t('characters.petPowers')} compact={compact}>
                  <InputWithMic
                    language={language}
                    className={cn('w-full', compact && 'h-8 text-xs')}
                    value={character.petSuperpowerDescription ?? ''}
                    onChange={(e) =>
                      void onUpdate({ petSuperpowerDescription: e.target.value })
                    }
                    placeholder={t('characters.petPowersPlaceholder')}
                  />
                </CharacterFieldRow>
              )}
            </>
          )}

          <CharacterFieldRow label={t('characters.vehicle')} compact={compact}>
            <Select
              value={character.hasVehicle ? 'yes' : 'no'}
              onValueChange={(value) =>
                void onUpdate({
                  hasVehicle: value === 'yes',
                  vehicleType: value === 'yes' ? character.vehicleType : '',
                  vehicleColor: value === 'yes' ? character.vehicleColor : '',
                  vehicleSpeed: value === 'yes' ? character.vehicleSpeed : '',
                })
              }
            >
              <SelectTrigger className={cn('w-full', compact && 'h-8 text-xs')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">{t('characters.no')}</SelectItem>
                <SelectItem value="yes">{t('characters.yes')}</SelectItem>
              </SelectContent>
            </Select>
          </CharacterFieldRow>

          {character.hasVehicle && (
            <>
              <CharacterFieldRow label={t('characters.vehicleType')} compact={compact}>
                <InputWithMic
                  language={language}
                  className={cn('w-full', compact && 'h-8 text-xs')}
                  value={character.vehicleType ?? ''}
                  onChange={(e) => void onUpdate({ vehicleType: e.target.value })}
                  placeholder={t('characters.vehicleTypePlaceholder')}
                />
              </CharacterFieldRow>
              <CharacterFieldRow label={t('characters.vehicleColor')} compact={compact}>
                <InputWithMic
                  language={language}
                  className={cn('w-full', compact && 'h-8 text-xs')}
                  value={character.vehicleColor ?? ''}
                  onChange={(e) => void onUpdate({ vehicleColor: e.target.value })}
                  placeholder={t('characters.vehicleColorPlaceholder')}
                />
              </CharacterFieldRow>
              <CharacterFieldRow label={t('characters.vehicleSpeed')} compact={compact}>
                <InputWithMic
                  language={language}
                  className={cn('w-full', compact && 'h-8 text-xs')}
                  value={character.vehicleSpeed ?? ''}
                  onChange={(e) => void onUpdate({ vehicleSpeed: e.target.value })}
                  placeholder={t('characters.vehicleSpeedPlaceholder')}
                />
              </CharacterFieldRow>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function AddCharacterButton({ compact = false }: { compact?: boolean }) {
  const t = useUiT()
  const { activeStory, loadStory } = useStories()
  if (!activeStory) return null

  return (
    <Button
      variant="outline"
      size="sm"
      className={compact ? 'h-7 text-xs' : undefined}
      onClick={() =>
        void (async () => {
          await addCharacter(activeStory.id, {
            ...emptyCharacter,
            name: '',
          })
          await loadStory(activeStory.id, { onlyIfStillActive: true })
        })()
      }
    >
      <Plus className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      {compact ? t('setup.addCharacter') : t('characters.add')}
    </Button>
  )
}

export function CharacterPanel({
  hideHeader = false,
  hideAddButton = false,
  compact = false,
}: {
  hideHeader?: boolean
  hideAddButton?: boolean
  compact?: boolean
}) {
  const t = useUiT()
  const { activeStory, loadStory } = useStories()

  if (!activeStory) return null

  const handleAdd = async () => {
    await addCharacter(activeStory.id, {
      ...emptyCharacter,
      name: '',
    })
    await loadStory(activeStory.id, { onlyIfStillActive: true })
  }

  const handleUpdate = async (
    characterId: string,
    updates: Partial<Omit<Character, 'id' | 'storyId'>>,
  ) => {
    await updateCharacter(characterId, updates)
    await loadStory(activeStory.id, { onlyIfStillActive: true })
  }

  const handleRandomize = async (characterId: string) => {
    const existingNames = activeStory.characters
      .filter((character) => character.id !== characterId)
      .map((character) => character.name)
    await updateCharacter(
      characterId,
      generateRandomCharacter(activeStory.language, existingNames),
    )
    await loadStory(activeStory.id, { onlyIfStillActive: true })
  }

  const handleDelete = async (characterId: string) => {
    await deleteCharacter(characterId)
    await loadStory(activeStory.id, { onlyIfStillActive: true })
  }

  return (
    <section className={compact ? 'space-y-2' : 'space-y-3'}>
      {!hideHeader ? (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {t('characters.title')}
          </h3>
          <Button variant="outline" size="sm" onClick={() => void handleAdd()}>
            <Plus className="h-4 w-4" />
            {t('characters.add')}
          </Button>
        </div>
      ) : hideAddButton ? null : (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className={compact ? 'h-7 text-xs' : undefined}
            onClick={() => void handleAdd()}
          >
            <Plus className="h-3.5 w-3.5" />
            {t('setup.addCharacter')}
          </Button>
        </div>
      )}

      {activeStory.characters.length === 0 ? (
        <div
          className={cn(
            'rounded-lg border border-dashed text-center text-[var(--color-muted-foreground)]',
            compact ? 'p-3 text-xs' : 'p-6 text-sm',
          )}
        >
          <User className={cn('mx-auto opacity-40', compact ? 'mb-1 h-5 w-5' : 'mb-2 h-8 w-8')} />
          {t('characters.addHint')}
        </div>
      ) : (
        <div className={cn('flex flex-col', compact ? 'gap-2' : 'gap-3')}>
          {activeStory.characters.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              language={activeStory.language}
              compact={compact}
              t={t}
              onUpdate={(updates) => handleUpdate(character.id, updates)}
              onRandomize={() => handleRandomize(character.id)}
              onDelete={() => handleDelete(character.id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
