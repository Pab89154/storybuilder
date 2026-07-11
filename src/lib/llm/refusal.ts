/**
 * Small local models (e.g. Qwen2.5-0.5B) sometimes emit spurious safety
 * refusals ("I'm sorry, but I can't…", "No puedo cumplir…") even for harmless
 * children's-story prompts. These helpers detect that meta-text so the
 * generation pipeline can discard it and retry instead of saving it as story
 * content.
 */

/**
 * Strong, multi-word refusal signatures across every supported language.
 * They intentionally require an apology/denial *plus* a meta object (request,
 * assist, policy, …) so ordinary in-story dialogue like `"I'm sorry," she said`
 * is not mistaken for a refusal.
 */
const REFUSAL_PATTERNS: RegExp[] = [
  // English
  /\bi(?:'m| am)?\s*sorry,?\s+but\s+i\s+(?:can'?t|cannot|can not|won'?t|am unable)\b/i,
  /\bi\s+can(?:'?t| ?not)\s+(?:assist|help|fulfill|comply|provide|do that|create|generate|continue|write|translate|complete)\b/i,
  /\bi(?:'m| am)\s+(?:sorry|unable)\b[^.\n]*\b(?:request|assist|help|fulfill|comply|provide|able|generate|create|content)\b/i,
  /\bi\s+(?:cannot|can'?t|am unable to)\s+fulfill\b/i,
  /\bi\s+(?:will|can)\s*not\s+be\s+able\s+to\b/i,
  /\bas an ai\b/i,
  /\bi\s+apologize,?\s+but\b/i,
  /\bsorry,?\s+but\s+i\s+can(?:'?t| ?not)\b/i,
  /\bagainst my (?:guidelines|programming|policy)\b/i,

  // Spanish
  /\bno puedo (?:cumplir|ayudar|asistir|proporcionar|crear|generar|continuar|hacer|realizar|ofrecer|escribir|traducir|completar|responder)\b/i,
  /\blo siento,?\s+(?:pero|no)\b/i,
  /\bno puedo\b[^.\n]*\bsolicitud\b/i,
  /\bcomo (?:una? )?(?:ia|inteligencia artificial)\b/i,

  // French
  /\bje ne peux pas\b/i,
  /\bje suis désolé\b/i,
  /\bdésolé,?\s+mais\b/i,
  /\ben tant qu('|’)ia\b/i,

  // German
  /\bes tut mir leid\b/i,
  /\bich kann (?:das|dabei|dir|ihnen|leider)?\s*nicht\b/i,
  /\bals (?:eine )?ki\b/i,

  // Chinese (Simplified)
  /抱歉/,
  /对不起/,
  /我(?:不能|无法|不會|不会)/,
  /作为(?:一个|一名)?(?:AI|人工智能|语言模型)/i,

  // Arabic
  /لا أستطيع/,
  /أنا آسف/,
  /عذرا/,
  /لا يمكنني/,
  /آسف/,
]

/**
 * Returns true when the *opening* of the generated text reads like a model
 * refusal or meta-commentary rather than story prose. Only the head of the
 * text is inspected, since genuine refusals lead with the apology/denial.
 */
export function looksLikeRefusal(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  const head = trimmed.slice(0, 280)
  return REFUSAL_PATTERNS.some((re) => re.test(head))
}

/**
 * Attempts to salvage story content from a chunk that begins with a refusal.
 * If the entire chunk is a refusal, returns an empty string so the caller can
 * discard it. If real narrative follows a refusal preamble, that narrative is
 * kept.
 */
export function stripRefusal(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  if (!looksLikeRefusal(trimmed)) return trimmed

  // Story prose after a blank-line separated preamble is worth keeping.
  const afterBlank = trimmed
    .split(/\n\s*\n/)
    .slice(1)
    .join('\n\n')
    .trim()
  if (afterBlank && !looksLikeRefusal(afterBlank)) return afterBlank

  return ''
}
