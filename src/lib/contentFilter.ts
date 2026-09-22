/**
 * Inappropriate-content filter for StoryBuilder prompts, characters, and story text.
 * Adapted from Remy’s filter; tuned for child-oriented stories (stricter than chat).
 * Not a substitute for model-side safety.
 */

export type ContentSafetyResult =
  | { ok: true }
  | { ok: false; reason: string; category: string }

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const SEXUAL_PATTERNS: RegExp[] = [
  /\b(porn|porno|pornography|xxx|nsfw|onlyfans|hentai|rule\s*34|r34)\b/i,
  /\b(nude|nudes|naked|nudity|topless|bottomless|fully\s+nude)\b/i,
  /\b(sex\s*tape|hardcore|softcore|erotic|erotica|sensual)\b/i,
  /\b(blow\s*job|hand\s*job|deepthroat|cumshot|creampie|gangbang|threesome|orgy)\b/i,
  /\b(masturbat(e|ion|ing)|orgasm|ejaculat)/i,
  /\b(dildo|vibrator|sex\s*toy|fleshlight)\b/i,
  /\b(incest|step(mom|dad|sister|brother)|loli|shota|pedo|paedo|child\s*porn|cp)\b/i,
  /\b(gore\s*porn|snuff)\b/i,
  /\b(sexy|seductive|lingerie|strip(per|tease)?|brothel|prostitut)/i,
  /\b(boobs|breasts|nipples|genitals|penis|vagina|pornstar)\b/i,
  /\b(dirty\s+jokes?|sex\s+jokes?|erotic\s+stor(y|ies)|roleplay\s+sex|sexting)\b/i,
  /\b(porno|xxx|hentai|desnudo|desnuda|desnudos|nudes?|sexo\s+explicito|contenido\s+sexual)\b/i,
  /\b(chiste(s)?\s+(sucio|sexual)|historia\s+erotica|sin\s+ropa|en\s+lenceria)\b/i,
]

const VIOLENCE_PATTERNS: RegExp[] = [
  /\b(how\s+to\s+(make|build|create)\s+(a\s+)?(bomb|explosive|pipe\s*bomb|molotov))\b/i,
  /\b(how\s+to\s+(kill|murder|assassinate)\b)/i,
  /\b(behead(ing)?|dismember|torture\s+methods?|mass\s+shooting\s+plan)\b/i,
  /\b(graphic\s+violence|gore|dismemberment|school\s+shooting)\b/i,
  /\b(como\s+(hacer|fabricar)\s+(una?\s+)?(bomba|explosivo)|como\s+matar)\b/i,
]

const HATE_PATTERNS: RegExp[] = [
  /\b(kill\s+all\s+(jews|muslims|blacks|gays|trans)|white\s+power|heil\s+hitler)\b/i,
  /\b(racial\s+slur|lynch\s+them)\b/i,
]

const ILLEGAL_PATTERNS: RegExp[] = [
  /\b(how\s+to\s+(buy|sell|make)\s+(cocaine|heroin|fentanyl|meth|crack))\b/i,
  /\b(carding|cvv\s*dump|stolen\s+credit\s+cards?)\b/i,
  /\b(how\s+to\s+(hack|phish)\s+(into|someone|accounts?))\b/i,
]

const SELF_HARM_PATTERNS: RegExp[] = [
  /\b(how\s+to\s+(kill|end)\s+(myself|my\s+life)|suicide\s+methods?|best\s+way\s+to\s+die)\b/i,
  /\b(como\s+(suicidarme|matarme)|metodos?\s+de\s+suicidio)\b/i,
]

const DRUG_PATTERNS: RegExp[] = [
  /\b(cocaine|heroin|fentanyl|methamphetamine|meth\b|crack\s+cocaine|lsd|mdma|ecstasy)\b/i,
  /\b(get\s+(high|drunk|wasted)|drug\s+deal(er|ing)?)\b/i,
]

function matchAny(q: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(q))
}

export function checkContentSafety(text: string): ContentSafetyResult {
  const raw = text.trim()
  if (!raw) return { ok: true }
  const q = normalize(raw)

  if (matchAny(q, SELF_HARM_PATTERNS)) {
    return {
      ok: false,
      category: 'self_harm',
      reason:
        'StoryBuilder can’t include self-harm. If you’re in crisis, contact local emergency services or https://www.iasp.info/suicidalthoughts/.',
    }
  }

  if (matchAny(q, SEXUAL_PATTERNS)) {
    return {
      ok: false,
      category: 'sexual',
      reason: 'StoryBuilder is for kid-friendly stories. Sexual or adult content isn’t allowed.',
    }
  }

  if (matchAny(q, VIOLENCE_PATTERNS)) {
    return {
      ok: false,
      category: 'violence',
      reason: 'StoryBuilder can’t include graphic violence or dangerous instructions.',
    }
  }

  if (matchAny(q, HATE_PATTERNS)) {
    return {
      ok: false,
      category: 'hate',
      reason: 'StoryBuilder can’t include hate or harassment.',
    }
  }

  if (matchAny(q, ILLEGAL_PATTERNS) || matchAny(q, DRUG_PATTERNS)) {
    return {
      ok: false,
      category: 'illegal',
      reason: 'StoryBuilder can’t include illegal activity or hard drugs.',
    }
  }

  return { ok: true }
}

/** String fields on a data object. Interfaces such as Character have no index signature, so they are not assignable to Record<string, unknown>. */
function collectTextFields(fields: object): string[] {
  const parts: string[] = []
  for (const value of Object.values(fields)) {
    if (typeof value === 'string' && value.trim()) parts.push(value)
  }
  return parts
}

export function checkCharacterContent(fields: object): ContentSafetyResult {
  return checkContentSafety(collectTextFields(fields).join('\n'))
}

export function checkStoryInputs(input: {
  title?: string | null
  prompt?: string | null
  characters?: readonly object[]
  paragraphs?: ReadonlyArray<{ content?: string | null }>
}): ContentSafetyResult {
  const chunks: string[] = []
  if (input.title) chunks.push(input.title)
  if (input.prompt) chunks.push(input.prompt)
  for (const character of input.characters ?? []) {
    chunks.push(...collectTextFields(character))
  }
  for (const paragraph of input.paragraphs ?? []) {
    if (paragraph.content?.trim()) chunks.push(paragraph.content)
  }
  return checkContentSafety(chunks.join('\n'))
}
