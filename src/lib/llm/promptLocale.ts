import type { Character, Language } from '@/types/story'
import { LANGUAGE_ENGLISH_NAMES } from '@/lib/storyLanguageMeta'
import {
  joinCharacterList,
  splitCharacterList,
} from '@/lib/characterFields'

function alignmentLabel(char: Character, language: Language): string {
  const good = char.alignment === 'good'
  switch (language) {
    case 'es':
      return good ? 'bueno' : 'malo'
    case 'zh':
      return good ? '善良' : '邪恶'
    case 'ar':
      return good ? 'طيب' : 'شرير'
    case 'fr':
      return good ? 'gentil' : 'méchant'
    case 'de':
      return good ? 'gut' : 'böse'
    default:
      return good ? 'good' : 'bad'
  }
}

function genderLabel(char: Character, language: Language): string {
  const boy = char.gender === 'boy'
  switch (language) {
    case 'es':
      return boy ? 'chico' : 'chica'
    case 'zh':
      return boy ? '男孩' : '女孩'
    case 'ar':
      return boy ? 'ولد' : 'بنت'
    case 'fr':
      return boy ? 'garçon' : 'fille'
    case 'de':
      return boy ? 'Junge' : 'Mädchen'
    default:
      return boy ? 'boy' : 'girl'
  }
}

function speciesLabel(char: Character, language: Language): string {
  const isHuman = char.isHuman ?? true
  if (isHuman) {
    switch (language) {
      case 'es':
        return 'humano/a'
      case 'zh':
        return '人类'
      case 'ar':
        return 'بشر'
      case 'fr':
        return 'humain'
      case 'de':
        return 'Mensch'
      default:
        return 'human'
    }
  }
  const speciesItems = splitCharacterList(char.species)
  if (speciesItems.length > 0) {
    const value = joinCharacterList(speciesItems)
    switch (language) {
      case 'es':
        return speciesItems.length > 1 ? `especies: ${value}` : `especie: ${value}`
      case 'zh':
        return speciesItems.length > 1 ? `物种：${value}` : `物种：${value}`
      case 'ar':
        return speciesItems.length > 1 ? `أنواع: ${value}` : `نوع: ${value}`
      case 'fr':
        return speciesItems.length > 1 ? `espèces : ${value}` : `espèce : ${value}`
      case 'de':
        return speciesItems.length > 1 ? `Arten: ${value}` : `Art: ${value}`
      default:
        return speciesItems.length > 1 ? `species: ${value}` : `species: ${value}`
    }
  }
  switch (language) {
    case 'es':
      return 'criatura'
    case 'zh':
      return '生物'
    case 'ar':
      return 'مخلوق'
    case 'fr':
      return 'créature'
    case 'de':
      return 'Kreatur'
    default:
      return 'creature'
  }
}

function superpowerLabel(char: Character, language: Language): string {
  if (char.hasSuperpowers) {
    const items = splitCharacterList(char.superpowerDescription)
    if (items.length > 1) {
      const value = joinCharacterList(items)
      switch (language) {
        case 'es':
          return `superpoderes: ${value}`
        case 'zh':
          return `超能力：${value}`
        case 'ar':
          return `قوى خارقة: ${value}`
        case 'fr':
          return `super-pouvoirs : ${value}`
        case 'de':
          return `Superkräfte: ${value}`
        default:
          return `superpowers: ${value}`
      }
    }
    if (items.length === 1) return items[0]!
    return language === 'es'
      ? 'tiene superpoderes'
      : language === 'zh'
        ? '拥有超能力'
        : language === 'ar'
          ? 'لديه قوى خارقة'
          : language === 'fr'
            ? 'a des super-pouvoirs'
            : language === 'de'
              ? 'hat Superkräfte'
              : 'has superpowers'
  }
  return language === 'es'
    ? 'sin superpoderes'
    : language === 'zh'
      ? '没有超能力'
      : language === 'ar'
        ? 'بلا قوى خارقة'
        : language === 'fr'
          ? 'sans super-pouvoirs'
          : language === 'de'
            ? 'keine Superkräfte'
            : 'no superpowers'
}

function petSuperpowerLabel(char: Character, language: Language): string {
  if (char.petHasSuperpowers) {
    const items = splitCharacterList(char.petSuperpowerDescription)
    if (items.length > 1) {
      const value = joinCharacterList(items)
      switch (language) {
        case 'es':
          return `superpoderes: ${value}`
        case 'zh':
          return `超能力：${value}`
        case 'ar':
          return `قوى خارقة: ${value}`
        case 'fr':
          return `super-pouvoirs : ${value}`
        case 'de':
          return `Superkräfte: ${value}`
        default:
          return `superpowers: ${value}`
      }
    }
    if (items.length === 1) return items[0]!
    return language === 'es'
      ? 'tiene superpoderes'
      : language === 'zh'
        ? '拥有超能力'
        : language === 'ar'
          ? 'لديه قوى خارقة'
          : language === 'fr'
            ? 'a des super-pouvoirs'
            : language === 'de'
              ? 'hat Superkräfte'
              : 'has superpowers'
  }
  return language === 'es'
    ? 'sin superpoderes'
    : language === 'zh'
      ? '没有超能力'
      : language === 'ar'
        ? 'بلا قوى خارقة'
        : language === 'fr'
          ? 'sans super-pouvoirs'
          : language === 'de'
            ? 'keine Superkräfte'
            : 'no superpowers'
}

function petLabel(char: Character, language: Language): string {
  if (!char.hasPet) {
    return language === 'es'
      ? 'sin mascota'
      : language === 'zh'
        ? '没有宠物'
        : language === 'ar'
          ? 'بلا حيوان أليف'
          : language === 'fr'
            ? 'sans animal de compagnie'
            : language === 'de'
              ? 'kein Haustier'
              : 'no pet'
  }

  const nameItems = splitCharacterList(char.petName)
  const name =
    nameItems.length > 0
      ? joinCharacterList(nameItems)
      : language === 'es'
        ? 'mascota sin nombre'
        : language === 'zh'
          ? '未命名宠物'
          : language === 'ar'
            ? 'حيوان أليف بلا اسم'
            : language === 'fr'
              ? 'animal sans nom'
              : language === 'de'
                ? 'namenloses Haustier'
                : 'unnamed pet'
  const speciesItems = splitCharacterList(char.petSpecies)
  const species = speciesItems.length > 0 ? joinCharacterList(speciesItems) : ''
  const powers = petSuperpowerLabel(char, language)
  const petWord =
    nameItems.length > 1 || speciesItems.length > 1
      ? language === 'es'
        ? 'mascotas'
        : language === 'zh'
          ? '宠物'
          : language === 'ar'
            ? 'حيوانات أليفة'
            : language === 'fr'
              ? 'animaux'
              : language === 'de'
                ? 'Haustiere'
                : 'pets'
      : language === 'es'
        ? 'mascota'
        : language === 'zh'
          ? '宠物'
          : language === 'ar'
            ? 'حيوان أليف'
            : language === 'fr'
              ? 'animal'
              : language === 'de'
                ? 'Haustier'
                : 'pet'

  switch (language) {
    case 'es':
      return species
        ? `${petWord}: ${name} (${species}), ${powers}`
        : `${petWord}: ${name}, ${powers}`
    case 'zh':
      return species
        ? `${petWord}：${name}（${species}），${powers}`
        : `${petWord}：${name}，${powers}`
    case 'ar':
      return species
        ? `${petWord}: ${name} (${species})، ${powers}`
        : `${petWord}: ${name}، ${powers}`
    case 'fr':
      return species
        ? `${petWord} : ${name} (${species}), ${powers}`
        : `${petWord} : ${name}, ${powers}`
    case 'de':
      return species
        ? `${petWord}: ${name} (${species}), ${powers}`
        : `${petWord}: ${name}, ${powers}`
    default:
      return species
        ? `${petWord}: ${name} (${species}), ${powers}`
        : `${petWord}: ${name}, ${powers}`
  }
}

function vehicleLabel(char: Character, language: Language): string {
  if (!char.hasVehicle) {
    return language === 'es'
      ? 'sin vehículo'
      : language === 'zh'
        ? '没有交通工具'
        : language === 'ar'
          ? 'بلا مركبة'
          : language === 'fr'
            ? 'sans véhicule'
            : language === 'de'
              ? 'kein Fahrzeug'
              : 'no vehicle'
  }

  const typeItems = splitCharacterList(char.vehicleType)
  const type =
    typeItems.length > 0
      ? joinCharacterList(typeItems)
      : language === 'es'
        ? 'vehículo sin nombre'
        : language === 'zh'
          ? '未命名交通工具'
          : language === 'ar'
            ? 'مركبة بلا اسم'
            : language === 'fr'
              ? 'véhicule sans nom'
              : language === 'de'
                ? 'namenloses Fahrzeug'
                : 'unnamed vehicle'
  const color = joinCharacterList(splitCharacterList(char.vehicleColor))
  const speed = joinCharacterList(splitCharacterList(char.vehicleSpeed))
  const vehicleWord =
    typeItems.length > 1 ||
    splitCharacterList(char.vehicleColor).length > 1 ||
    splitCharacterList(char.vehicleSpeed).length > 1
      ? language === 'es'
        ? 'vehículos'
        : language === 'zh'
          ? '交通工具'
          : language === 'ar'
            ? 'مركبات'
            : language === 'fr'
              ? 'véhicules'
              : language === 'de'
                ? 'Fahrzeuge'
                : 'vehicles'
      : language === 'es'
        ? 'vehículo'
        : language === 'zh'
          ? '交通工具'
          : language === 'ar'
            ? 'مركبة'
            : language === 'fr'
              ? 'véhicule'
              : language === 'de'
                ? 'Fahrzeug'
                : 'vehicle'

  switch (language) {
    case 'es':
      if (color && speed) return `${vehicleWord}: ${type}, colores ${color}, velocidades ${speed}`
      if (color) return `${vehicleWord}: ${type}, colores ${color}`
      if (speed) return `${vehicleWord}: ${type}, velocidades ${speed}`
      return `${vehicleWord}: ${type}`
    case 'zh':
      if (color && speed) return `${vehicleWord}：${type}，颜色 ${color}，速度 ${speed}`
      if (color) return `${vehicleWord}：${type}，颜色 ${color}`
      if (speed) return `${vehicleWord}：${type}，速度 ${speed}`
      return `${vehicleWord}：${type}`
    case 'ar':
      if (color && speed) return `${vehicleWord}: ${type}، ألوان ${color}، سرعات ${speed}`
      if (color) return `${vehicleWord}: ${type}، ألوان ${color}`
      if (speed) return `${vehicleWord}: ${type}، سرعات ${speed}`
      return `${vehicleWord}: ${type}`
    case 'fr':
      if (color && speed) return `${vehicleWord} : ${type}, couleurs ${color}, vitesses ${speed}`
      if (color) return `${vehicleWord} : ${type}, couleurs ${color}`
      if (speed) return `${vehicleWord} : ${type}, vitesses ${speed}`
      return `${vehicleWord} : ${type}`
    case 'de':
      if (color && speed) return `${vehicleWord}: ${type}, Farben ${color}, Geschwindigkeiten ${speed}`
      if (color) return `${vehicleWord}: ${type}, Farben ${color}`
      if (speed) return `${vehicleWord}: ${type}, Geschwindigkeiten ${speed}`
      return `${vehicleWord}: ${type}`
    default:
      if (color && speed) return `${vehicleWord}: ${type}, colors ${color}, speeds ${speed}`
      if (color) return `${vehicleWord}: ${type}, colors ${color}`
      if (speed) return `${vehicleWord}: ${type}, speeds ${speed}`
      return `${vehicleWord}: ${type}`
  }
}

function characterDisplayName(char: Character, language: Language): string {
  const nicknames = splitCharacterList(char.nickname)
  if (nicknames.length === 0) return char.name
  const value = joinCharacterList(nicknames)
  switch (language) {
    case 'es':
      return nicknames.length > 1
        ? `${char.name} (apodos: ${value})`
        : `${char.name} (apodo: ${value})`
    case 'zh':
      return nicknames.length > 1
        ? `${char.name}（昵称：${value}）`
        : `${char.name}（昵称：${value}）`
    case 'ar':
      return nicknames.length > 1
        ? `${char.name} (ألقاب: ${value})`
        : `${char.name} (لقب: ${value})`
    case 'fr':
      return nicknames.length > 1
        ? `${char.name} (surnoms : ${value})`
        : `${char.name} (surnom : ${value})`
    case 'de':
      return nicknames.length > 1
        ? `${char.name} (Spitznamen: ${value})`
        : `${char.name} (Spitzname: ${value})`
    default:
      return nicknames.length > 1
        ? `${char.name} (nicknames: ${value})`
        : `${char.name} (nickname: ${value})`
  }
}

function appearanceLabel(char: Character, language: Language): string {
  const text = char.description?.trim()
  if (!text) return ''
  switch (language) {
    case 'es':
      return `apariencia: ${text}`
    case 'zh':
      return `外貌：${text}`
    case 'ar':
      return `المظهر: ${text}`
    case 'fr':
      return `apparence : ${text}`
    case 'de':
      return `Aussehen: ${text}`
    default:
      return `appearance: ${text}`
  }
}

export function buildCharacterBible(characters: Character[], language: Language): string {
  if (characters.length === 0) {
    switch (language) {
      case 'es':
        return 'No hay personajes definidos. Inventa personajes apropiados para niños si hace falta.'
      case 'zh':
        return '尚未定义角色。如有需要，请创造适合儿童的角色。'
      case 'ar':
        return 'لا توجد شخصيات محددة. ابتكر شخصيات مناسبة للأطفال إذا لزم الأمر.'
      case 'fr':
        return 'Aucun personnage défini. Invente des personnages adaptés aux enfants si nécessaire.'
      case 'de':
        return 'Keine Charaktere definiert. Erfinde bei Bedarf kindgerechte Figuren.'
      default:
        return 'No characters defined. Invent child-appropriate characters if needed.'
    }
  }

  return characters
    .map((char) => {
      const powers = superpowerLabel(char, language)
      const pet = petLabel(char, language)
      const vehicle = vehicleLabel(char, language)
      const appearance = appearanceLabel(char, language)
      const appearanceSuffix = appearance ? `, ${appearance}` : ''
      const displayName = characterDisplayName(char, language)
      switch (language) {
        case 'es':
          return `- ${displayName}: ${genderLabel(char, language)}, ${char.age} años, ${alignmentLabel(char, language)}, ${speciesLabel(char, language)}, ${powers}, ${pet}, ${vehicle}${appearanceSuffix}`
        case 'zh':
          return `- ${displayName}：${genderLabel(char, language)}，${char.age}岁，${alignmentLabel(char, language)}，${speciesLabel(char, language)}，${powers}，${pet}，${vehicle}${appearanceSuffix}`
        case 'ar':
          return `- ${displayName}: ${genderLabel(char, language)}، عمر ${char.age}، ${alignmentLabel(char, language)}، ${speciesLabel(char, language)}، ${powers}، ${pet}، ${vehicle}${appearanceSuffix}`
        case 'fr':
          return `- ${displayName} : ${genderLabel(char, language)}, ${char.age} ans, ${alignmentLabel(char, language)}, ${speciesLabel(char, language)}, ${powers}, ${pet}, ${vehicle}${appearanceSuffix}`
        case 'de':
          return `- ${displayName}: ${genderLabel(char, language)}, ${char.age} Jahre, ${alignmentLabel(char, language)}, ${speciesLabel(char, language)}, ${powers}, ${pet}, ${vehicle}${appearanceSuffix}`
        default:
          return `- ${displayName}: ${genderLabel(char, language)}, age ${char.age}, ${alignmentLabel(char, language)}, ${speciesLabel(char, language)}, ${powers}, ${pet}, ${vehicle}${appearanceSuffix}`
      }
    })
    .join('\n')
}

function extraGrammarRules(language: Language): string {
  switch (language) {
    case 'es':
      return `Gramática española (obligatorio):
- Concordancia de género y número: adjetivos, demostrativos y artículos deben coincidir con el sustantivo.
- Frases completas y naturales; evita calcos del inglés.
- Relee mentalmente cada frase antes de continuar.`
    case 'zh':
      return `中文写作要求（必须遵守）：
- 使用规范、自然的简体中文。
- 句子通顺，适合儿童阅读。
- 不要夹杂英文或其他语言。`
    case 'ar':
      return `قواعد العربية (إلزامية):
- استخدم العربية الفصحى الحديثة بجمل واضحة ومناسبة للأطفال.
- احرص على التذكير والتأنيث قدر الإمكان.
- لا تخلط لغات أخرى في النص.`
    case 'fr':
      return `Règles de français (obligatoires) :
- Accords de genre et de nombre corrects.
- Phrases naturelles, sans calques de l’anglais.`
    case 'de':
      return `Deutsche Schreibregeln (Pflicht):
- Korrekte Groß- und Kleinschreibung sowie Satzstellung.
- Natürliche Sätze ohne Anglicismen.`
    default:
      return ''
  }
}

export function readerAgeGuidance(readerAge: number, language: Language): string {
  switch (language) {
    case 'es':
      if (readerAge <= 5) return 'Público objetivo: 3–5 años. Frases muy cortas, vocabulario sencillo, ritmo tranquilo.'
      if (readerAge <= 8) return 'Público objetivo: 6–8 años. Frases claras, vocabulario accesible, algo de descripción.'
      if (readerAge <= 12) return 'Público objetivo: 9–12 años. Trama más rica, vocabulario variado, puede haber suspense ligero.'
      return 'Público objetivo: 13–15 años. Trama más compleja, vocabulario amplio, temas un poco más maduros pero siempre apto para adolescentes.'
    case 'zh':
      if (readerAge <= 5) return '目标读者：3–5岁。句子很短，词汇简单，节奏舒缓。'
      if (readerAge <= 8) return '目标读者：6–8岁。句子清晰，词汇易懂，可有一些描写。'
      if (readerAge <= 12) return '目标读者：9–12岁。情节更丰富，词汇多样，可有轻度悬念。'
      return '目标读者：13–15岁。情节更复杂，词汇更广，主题可稍成熟但仍适合青少年。'
    case 'ar':
      if (readerAge <= 5) return 'الجمهور المستهدف: 3–5 سنوات. جمل قصيرة جداً، مفردات بسيطة، إيقاع هادئ.'
      if (readerAge <= 8) return 'الجمهور المستهدف: 6–8 سنوات. جمل واضحة، مفردات يسهل فهمها، مع بعض الوصف.'
      if (readerAge <= 12) return 'الجمهور المستهدف: 9–12 سنة. حبكة أغنى، مفردات متنوعة، يمكن إضافة تشويق خفيف.'
      return 'الجمهور المستهدف: 13–15 سنة. حبكة أكثر تعقيداً، مفردات أوسع، موضوعات أكثر نضجاً لكنها مناسبة للمراهقين.'
    case 'fr':
      if (readerAge <= 5) return 'Public cible : 3–5 ans. Phrases très courtes, vocabulaire simple, rythme doux.'
      if (readerAge <= 8) return 'Public cible : 6–8 ans. Phrases claires, vocabulaire accessible, un peu de description.'
      if (readerAge <= 12) return 'Public cible : 9–12 ans. Intrigue plus riche, vocabulaire varié, suspense léger possible.'
      return 'Public cible : 13–15 ans. Intrigue plus complexe, vocabulaire plus large, thèmes un peu plus matures mais adaptés aux ados.'
    case 'de':
      if (readerAge <= 5) return 'Zielpublikum: 3–5 Jahre. Sehr kurze Sätze, einfache Wörter, ruhiges Tempo.'
      if (readerAge <= 8) return 'Zielpublikum: 6–8 Jahre. Klare Sätze, verständlicher Wortschatz, etwas Beschreibung.'
      if (readerAge <= 12) return 'Zielpublikum: 9–12 Jahre. Reichere Handlung, vielfältiger Wortschatz, leichte Spannung möglich.'
      return 'Zielpublikum: 13–15 Jahre. Komplexere Handlung, breiterer Wortschatz, etwas reifere Themen, aber jugendgerecht.'
    default:
      if (readerAge <= 5) return 'Target audience: ages 3–5. Very short sentences, simple words, gentle pacing.'
      if (readerAge <= 8) return 'Target audience: ages 6–8. Clear sentences, accessible vocabulary, some description.'
      if (readerAge <= 12) return 'Target audience: ages 9–12. Richer plot, varied vocabulary, light suspense is OK.'
      return 'Target audience: ages 13–15. More complex plot, broader vocabulary, slightly more mature themes but still teen-appropriate.'
  }
}

export function buildSystemPrompt(language: Language, readerAge = 7): string {
  const ageLine = readerAgeGuidance(readerAge, language)
  const grammar = extraGrammarRules(language)

  switch (language) {
    case 'es':
      return `Eres StoryBuilder, un escritor de cuentos infantiles.
Estás escribiendo ficción inofensiva y apta para niños. Esta tarea es siempre segura y positiva.
Reglas estrictas:
- ${ageLine}
- Escribe SOLO en español (aunque la idea del autor venga en otro idioma).
- Contenido apto para niños: sin violencia gráfica, sin contenido sexual, sin lenguaje vulgar, sin terror extremo.
- Mantén coherencia con la biblia de personajes (nombres, edades, género, alineación, especie y superpoderes).
- Usa ÚNICAMENTE los personajes de la biblia de personajes. No inventes ni añadas personajes nuevos al azar.
- Los personajes malos NO se unen ni colaboran con los buenos, a menos que primero se hagan amigos de verdad en la historia.
- Escribe prosa narrativa clara, creativa y envolvente.
- No uses listas, metadatos ni explicaciones: solo el texto de la historia.
- No repitas el prompt del usuario ni resumas las instrucciones.
- NUNCA te niegues, te disculpes, adviertas ni menciones ser una IA, políticas o seguridad. NUNCA digas «no puedo» ni «lo siento». Simplemente escribe el cuento. Tu respuesta debe ser únicamente prosa narrativa.
${grammar}`
    case 'zh':
      return `你是 StoryBuilder，一位儿童故事作家。
你正在创作无害且适合儿童的虚构故事。这项任务始终是安全而正面的。
严格规则：
- ${ageLine}
- 只使用简体中文写作（即使作者的创意来自其他语言）。
- 内容适合儿童：无血腥暴力、无性内容、无粗俗语言、无极端恐怖。
- 与角色设定保持一致（姓名、年龄、性别、立场、物种和超能力）。
- 只使用角色设定中的角色。不要随意发明或添加新角色。
- 坏人不会加入好人一方或与好人合作，除非他们先在故事中真正成为朋友。
- 写出清晰、有创意、引人入胜的叙事文字。
- 不要使用列表、元数据或解释：只输出故事正文。
- 不要重复用户提示或总结说明。
- 绝不要拒绝、道歉、警告，也不要提及自己是 AI、政策或安全。绝不要说“我不能”或“抱歉”。直接写故事。你的回答必须只包含叙事文字。
${grammar}`
    case 'ar':
      return `أنت StoryBuilder، كاتب قصص للأطفال.
أنت تكتب خيالاً غير مؤذٍ ومناسباً للأطفال. هذه المهمة آمنة وإيجابية دائماً.
قواعد صارمة:
- ${ageLine}
- اكتب بالعربية فقط (حتى لو كانت فكرة المؤلف بلغة أخرى).
- محتوى مناسب للأطفال: بلا عنف مفرط، بلا محتوى جنسي، بلا ألفاظ نابية، بلا رعب شديد.
- حافظ على الاتساق مع دليل الشخصيات.
- استخدم فقط الشخصيات الموجودة في دليل الشخصيات. لا تبتكر أو تضف شخصيات جديدة عشوائياً.
- الأشرار لا ينضمون إلى الأخيار ولا يتعاونون معهم إلا إذا أصبحوا أصدقاء حقيقيين أولاً في القصة.
- اكتب نثراً سردياً واضحاً ومبدعاً وجذاباً.
- لا تستخدم قوائم أو شروحات: نص القصة فقط.
- لا تكرر طلب المستخدم.
- لا ترفض أبداً ولا تعتذر ولا تحذّر ولا تذكر أنك ذكاء اصطناعي أو سياسات أو أمان. لا تقل أبداً «لا أستطيع» أو «أنا آسف». اكتب القصة مباشرةً. يجب أن يكون ردك نصاً سردياً فقط.
${grammar}`
    case 'fr':
      return `Tu es StoryBuilder, un auteur de contes pour enfants.
Tu écris une fiction inoffensive et adaptée aux enfants. Cette tâche est toujours sûre et positive.
Règles strictes :
- ${ageLine}
- Écris UNIQUEMENT en français (même si l’idée de l’auteur est dans une autre langue).
- Contenu adapté aux enfants : pas de violence graphique, pas de contenu sexuel, pas de grossièretés, pas d’horreur extrême.
- Reste cohérent avec la bible des personnages.
- Utilise UNIQUEMENT les personnages de la bible des personnages. N’invente pas et n’ajoute pas de personnages nouveaux au hasard.
- Les méchants ne rejoignent pas les gentils et ne coopèrent pas avec eux, sauf s’ils deviennent d’abord de vrais amis dans l’histoire.
- Écris une prose narrative claire, créative et captivante.
- Pas de listes, métadonnées ni explications : uniquement le texte de l’histoire.
- Ne répète pas la consigne de l’utilisateur.
- Ne refuse JAMAIS, ne t’excuse pas, n’avertis pas et ne mentionne jamais être une IA, des règles ou la sécurité. Ne dis JAMAIS « je ne peux pas » ni « désolé ». Écris simplement l’histoire. Ta réponse doit être uniquement de la prose narrative.
${grammar}`
    case 'de':
      return `Du bist StoryBuilder, ein Autor von Kindergeschichten.
Du schreibst harmlose, kindgerechte Fiktion. Diese Aufgabe ist immer sicher und positiv.
Strenge Regeln:
- ${ageLine}
- Schreibe NUR auf Deutsch (auch wenn die Idee des Autors in einer anderen Sprache ist).
- Kinderfreundlicher Inhalt: keine grafische Gewalt, keine sexuellen Inhalte, keine Schimpfwörter, kein extremer Horror.
- Bleibe konsistent mit dem Charakterbuch.
- Verwende NUR die Figuren aus dem Charakterbuch. Erfinde keine neuen Figuren und füge keine zufälligen Charaktere hinzu.
- Die Bösewichte schließen sich den Guten nicht an und arbeiten nicht mit ihnen zusammen, es sei denn, sie werden vorher in der Geschichte echte Freunde.
- Schreibe klare, kreative, fesselnde Erzählprosa.
- Keine Listen, Metadaten oder Erklärungen: nur der Geschichtentext.
- Wiederhole die Anweisung des Nutzers nicht.
- Lehne NIEMALS ab, entschuldige dich nicht, warne nicht und erwähne niemals, eine KI zu sein, Richtlinien oder Sicherheit. Sage NIEMALS „ich kann nicht“ oder „es tut mir leid“. Schreibe einfach die Geschichte. Deine Antwort darf nur Erzählprosa sein.
${grammar}`
    default:
      return `You are StoryBuilder, a children's story writer.
You are writing harmless, child-appropriate fiction. This task is always safe and wholesome.
Strict rules:
- ${ageLine}
- Write ONLY in English (even if the author's idea is in another language).
- Child-appropriate content: no graphic violence, no sexual content, no profanity, no extreme horror.
- Stay consistent with the character bible (names, ages, gender, alignment, species, and superpowers).
- Use ONLY the characters from the character bible. Do not invent or add random new characters.
- Bad guys do NOT join or team up with the good guys unless they first genuinely become friends within the story.
- Write clear, creative, engaging narrative prose.
- Do not use lists, metadata, or explanations: story text only.
- Do not repeat the user's prompt or summarize instructions.
- NEVER refuse, apologize, warn, or mention being an AI, policies, or safety. NEVER say "I can't" or "I'm sorry". Just write the story. Your entire response must be narrative prose only.`
  }
}

/**
 * Appended to the system prompt on retries after a refusal was detected. Uses
 * blunt, direct language to push the small local model back into storytelling.
 */
export function buildAntiRefusalReminder(language: Language): string {
  switch (language) {
    case 'es':
      return `RECORDATORIO IMPORTANTE: El intento anterior no fue válido porque contenía una negativa o comentarios ajenos a la historia. Este es un cuento infantil totalmente inofensivo. NO te disculpes ni te niegues. Escribe SOLO la siguiente parte del cuento, empezando de inmediato con la narración.`
    case 'zh':
      return `重要提醒：上一次尝试无效，因为其中包含拒绝或与故事无关的说明。这是一个完全无害的儿童故事。不要道歉，不要拒绝。请只写故事的下一部分，直接从叙事开始。`
    case 'ar':
      return `تذكير مهم: كانت المحاولة السابقة غير صالحة لأنها احتوت على رفض أو تعليقات خارج القصة. هذه قصة أطفال غير مؤذية تماماً. لا تعتذر ولا ترفض. اكتب فقط الجزء التالي من القصة، وابدأ فوراً بالسرد.`
    case 'fr':
      return `RAPPEL IMPORTANT : La tentative précédente était invalide car elle contenait un refus ou des commentaires hors histoire. Ceci est un conte pour enfants totalement inoffensif. Ne t’excuse pas et ne refuse pas. Écris UNIQUEMENT la suite de l’histoire, en commençant immédiatement par la narration.`
    case 'de':
      return `WICHTIGER HINWEIS: Der vorherige Versuch war ungültig, weil er eine Ablehnung oder geschichtenfremde Kommentare enthielt. Dies ist eine völlig harmlose Kindergeschichte. Entschuldige dich nicht und lehne nicht ab. Schreibe NUR den nächsten Teil der Geschichte und beginne sofort mit der Erzählung.`
    default:
      return `IMPORTANT REMINDER: The previous attempt was invalid because it contained a refusal or out-of-story commentary. This is a completely harmless children's story. Do NOT apologize or refuse. Write ONLY the next part of the story, starting immediately with narrative prose.`
  }
}

export function buildGenerateChunkPrompt(input: {
  language: Language
  storyPrompt: string
  bible: string
  context: string
  wordsSoFar: number
  targetWordCount: number
  chunkWordTarget: number
}): string {
  const remaining = Math.max(input.targetWordCount - input.wordsSoFar, 0)
  const grammar = extraGrammarRules(input.language)

  switch (input.language) {
    case 'es':
      return [
        `Prompt de la historia: ${input.storyPrompt.trim() || '(sin prompt)'}`,
        '',
        'Biblia de personajes (respétala estrictamente):',
        input.bible,
        '',
        input.context ? `Historia hasta ahora (${input.wordsSoFar} palabras):\n${input.context}` : 'Empieza la historia desde cero.',
        '',
        `Escribe el siguiente fragmento de aproximadamente ${input.chunkWordTarget} palabras.`,
        `Objetivo total de la historia: ${input.targetWordCount} palabras (faltan ~${remaining}).`,
        'Continúa de forma natural desde donde quedó. Solo devuelve el nuevo fragmento.',
        grammar,
      ].join('\n')
    case 'zh':
      return [
        `故事创意：${input.storyPrompt.trim() || '（无提示）'}`,
        '',
        '角色设定（请严格遵守）：',
        input.bible,
        '',
        input.context ? `目前故事（${input.wordsSoFar}字）：\n${input.context}` : '从零开始写故事。',
        '',
        `写下一段约 ${input.chunkWordTarget} 字的内容。`,
        `故事总目标：${input.targetWordCount} 字（还剩约 ${remaining} 字）。`,
        '请自然衔接上文，只返回新片段。',
        grammar,
      ].join('\n')
    case 'ar':
      return [
        `فكرة القصة: ${input.storyPrompt.trim() || '(بدون موجه)'}`,
        '',
        'دليل الشخصيات (التزم به بدقة):',
        input.bible,
        '',
        input.context ? `القصة حتى الآن (${input.wordsSoFar} كلمة):\n${input.context}` : 'ابدأ القصة من الصفر.',
        '',
        `اكتب المقطع التالي بحوالي ${input.chunkWordTarget} كلمة.`,
        `الهدف الكلي للقصة: ${input.targetWordCount} كلمة (يتبقى ~${remaining}).`,
        'تابع بشكل طبيعي من حيث توقفت. أعد المقطع الجديد فقط.',
        grammar,
      ].join('\n')
    case 'fr':
      return [
        `Idée de l’histoire : ${input.storyPrompt.trim() || '(aucune consigne)'}`,
        '',
        'Bible des personnages (à respecter strictement) :',
        input.bible,
        '',
        input.context ? `Histoire jusqu’ici (${input.wordsSoFar} mots) :\n${input.context}` : 'Commence l’histoire depuis le début.',
        '',
        `Écris le prochain segment d’environ ${input.chunkWordTarget} mots.`,
        `Objectif total : ${input.targetWordCount} mots (~${remaining} restants).`,
        'Continue naturellement. Renvoie uniquement le nouveau segment.',
        grammar,
      ].join('\n')
    case 'de':
      return [
        `Geschichtsidee: ${input.storyPrompt.trim() || '(keine Vorgabe)'}`,
        '',
        'Charakterbuch (strikt befolgen):',
        input.bible,
        '',
        input.context ? `Bisherige Geschichte (${input.wordsSoFar} Wörter):\n${input.context}` : 'Beginne die Geschichte von vorn.',
        '',
        `Schreibe das nächste Segment mit etwa ${input.chunkWordTarget} Wörtern.`,
        `Gesamtziel: ${input.targetWordCount} Wörter (~${remaining} verbleibend).`,
        'Fahre natürlich fort. Gib nur das neue Segment zurück.',
        grammar,
      ].join('\n')
    default:
      return [
        `Story prompt: ${input.storyPrompt.trim() || '(no prompt)'}`,
        '',
        'Character bible (follow strictly):',
        input.bible,
        '',
        input.context ? `Story so far (${input.wordsSoFar} words):\n${input.context}` : 'Start the story from scratch.',
        '',
        `Write the next segment of about ${input.chunkWordTarget} words.`,
        `Total story target: ${input.targetWordCount} words (~${remaining} remaining).`,
        'Continue naturally from where it left off. Return only the new segment.',
      ].join('\n')
  }
}

export function buildContinuePrompt(input: {
  language: Language
  storyPrompt: string
  bible: string
  context: string
  chunkWordTarget: number
}): string {
  const grammar = extraGrammarRules(input.language)

  switch (input.language) {
    case 'es':
      return [
        `Prompt de la historia: ${input.storyPrompt.trim() || '(sin prompt)'}`,
        '',
        'Biblia de personajes:',
        input.bible,
        '',
        `Historia actual:\n${input.context}`,
        '',
        `Continúa la historia con un nuevo fragmento de ~${input.chunkWordTarget} palabras.`,
        'Solo devuelve el nuevo fragmento, sin repetir lo anterior.',
        grammar,
      ].join('\n')
    case 'zh':
      return [
        `故事创意：${input.storyPrompt.trim() || '（无提示）'}`,
        '',
        '角色设定：',
        input.bible,
        '',
        `当前故事：\n${input.context}`,
        '',
        `继续写下一段约 ${input.chunkWordTarget} 字的内容。`,
        '只返回新片段，不要重复前文。',
        grammar,
      ].join('\n')
    case 'ar':
      return [
        `فكرة القصة: ${input.storyPrompt.trim() || '(بدون موجه)'}`,
        '',
        'دليل الشخصيات:',
        input.bible,
        '',
        `القصة الحالية:\n${input.context}`,
        '',
        `تابع القصة بمقطع جديد (~${input.chunkWordTarget} كلمة).`,
        'أعد المقطع الجديد فقط دون تكرار ما سبق.',
        grammar,
      ].join('\n')
    case 'fr':
      return [
        `Idée de l’histoire : ${input.storyPrompt.trim() || '(aucune consigne)'}`,
        '',
        'Bible des personnages :',
        input.bible,
        '',
        `Histoire actuelle :\n${input.context}`,
        '',
        `Continue l’histoire avec un nouveau segment (~${input.chunkWordTarget} mots).`,
        'Renvoie uniquement le nouveau segment, sans répéter le texte précédent.',
        grammar,
      ].join('\n')
    case 'de':
      return [
        `Geschichtsidee: ${input.storyPrompt.trim() || '(keine Vorgabe)'}`,
        '',
        'Charakterbuch:',
        input.bible,
        '',
        `Aktuelle Geschichte:\n${input.context}`,
        '',
        `Setze die Geschichte mit einem neuen Segment (~${input.chunkWordTarget} Wörter) fort.`,
        'Gib nur das neue Segment zurück, ohne den bisherigen Text zu wiederholen.',
        grammar,
      ].join('\n')
    default:
      return [
        `Story prompt: ${input.storyPrompt.trim() || '(no prompt)'}`,
        '',
        'Character bible:',
        input.bible,
        '',
        `Current story:\n${input.context}`,
        '',
        `Continue the story with a new segment of ~${input.chunkWordTarget} words.`,
        'Return only the new segment, do not repeat previous text.',
      ].join('\n')
  }
}

export function buildRegeneratePrompt(input: {
  language: Language
  storyPrompt: string
  bible: string
  beforeText: string
  afterText: string
  targetOrder: number
}): string {
  const grammar = extraGrammarRules(input.language)

  switch (input.language) {
    case 'es':
      return [
        `Prompt de la historia: ${input.storyPrompt.trim() || '(sin prompt)'}`,
        '',
        'Biblia de personajes:',
        input.bible,
        '',
        input.beforeText ? `Texto anterior al párrafo ${input.targetOrder}:\n${input.beforeText}` : '',
        input.afterText ? `Texto posterior al párrafo ${input.targetOrder}:\n${input.afterText}` : '',
        '',
        `Reescribe SOLO el párrafo ${input.targetOrder} para que encaje con el contexto.`,
        'Mantén longitud similar al párrafo original. Solo devuelve el párrafo reescrito.',
        grammar,
      ]
        .filter(Boolean)
        .join('\n')
    case 'zh':
      return [
        `故事创意：${input.storyPrompt.trim() || '（无提示）'}`,
        '',
        '角色设定：',
        input.bible,
        '',
        input.beforeText ? `第 ${input.targetOrder} 段之前的文字：\n${input.beforeText}` : '',
        input.afterText ? `第 ${input.targetOrder} 段之后的文字：\n${input.afterText}` : '',
        '',
        `只重写第 ${input.targetOrder} 段，使其与上下文衔接。`,
        '长度与原段相近，只返回重写后的段落。',
        grammar,
      ]
        .filter(Boolean)
        .join('\n')
    case 'ar':
      return [
        `فكرة القصة: ${input.storyPrompt.trim() || '(بدون موجه)'}`,
        '',
        'دليل الشخصيات:',
        input.bible,
        '',
        input.beforeText ? `النص قبل الفقرة ${input.targetOrder}:\n${input.beforeText}` : '',
        input.afterText ? `النص بعد الفقرة ${input.targetOrder}:\n${input.afterText}` : '',
        '',
        `أعد كتابة الفقرة ${input.targetOrder} فقط لتناسب السياق.`,
        'حافظ على طول مشابه. أعد الفقرة المعاد كتابتها فقط.',
        grammar,
      ]
        .filter(Boolean)
        .join('\n')
    case 'fr':
      return [
        `Idée de l’histoire : ${input.storyPrompt.trim() || '(aucune consigne)'}`,
        '',
        'Bible des personnages :',
        input.bible,
        '',
        input.beforeText ? `Texte avant le paragraphe ${input.targetOrder} :\n${input.beforeText}` : '',
        input.afterText ? `Texte après le paragraphe ${input.targetOrder} :\n${input.afterText}` : '',
        '',
        `Réécris UNIQUEMENT le paragraphe ${input.targetOrder} pour qu’il s’intègre au contexte.`,
        'Garde une longueur similaire. Renvoie uniquement le paragraphe réécrit.',
        grammar,
      ]
        .filter(Boolean)
        .join('\n')
    case 'de':
      return [
        `Geschichtsidee: ${input.storyPrompt.trim() || '(keine Vorgabe)'}`,
        '',
        'Charakterbuch:',
        input.bible,
        '',
        input.beforeText ? `Text vor Absatz ${input.targetOrder}:\n${input.beforeText}` : '',
        input.afterText ? `Text nach Absatz ${input.targetOrder}:\n${input.afterText}` : '',
        '',
        `Schreibe NUR Absatz ${input.targetOrder} neu, damit er zum Kontext passt.`,
        'Behalte eine ähnliche Länge bei. Gib nur den neu geschriebenen Absatz zurück.',
        grammar,
      ]
        .filter(Boolean)
        .join('\n')
    default:
      return [
        `Story prompt: ${input.storyPrompt.trim() || '(no prompt)'}`,
        '',
        'Character bible:',
        input.bible,
        '',
        input.beforeText ? `Text before paragraph ${input.targetOrder}:\n${input.beforeText}` : '',
        input.afterText ? `Text after paragraph ${input.targetOrder}:\n${input.afterText}` : '',
        '',
        `Rewrite ONLY paragraph ${input.targetOrder} to fit the surrounding context.`,
        'Keep similar length to the original paragraph. Return only the rewritten paragraph.',
      ]
        .filter(Boolean)
        .join('\n')
  }
}

export function buildChapterOutlinePrompt(input: {
  language: Language
  storyPrompt: string
  bible: string
  chapterCount: number
  wordsPerChapter: number
}): string {
  switch (input.language) {
    case 'es':
      return [
        `Idea general: ${input.storyPrompt.trim() || '(sin prompt)'}`,
        '',
        'Biblia de personajes:',
        input.bible,
        '',
        'Inventa tú el arco completo: un inicio cautivador y un final sorprendente pero coherente con la idea.',
        'No pidas más datos al autor; sorprende con creatividad.',
        '',
        `Planifica exactamente ${input.chapterCount} capítulos (~${input.wordsPerChapter} palabras cada uno).`,
        'Cada título debe ser creativo y descriptivo, no solo «Capítulo 1».',
        'Devuelve SOLO una línea por capítulo en este formato exacto:',
        '1. Título del capítulo | Breve resumen de lo que ocurre',
        '2. ...',
        'No añadas texto extra, listas ni explicaciones.',
      ].join('\n')
    case 'zh':
      return [
        `故事创意：${input.storyPrompt.trim() || '（无提示）'}`,
        '',
        '角色设定：',
        input.bible,
        '',
        '请自行设计完整故事线：开头吸引人，结尾出人意料但与创意一致。',
        '',
        `请规划正好 ${input.chapterCount} 章（每章约 ${input.wordsPerChapter} 字）。`,
        '每章标题要有创意和描述性，不要只用“第1章”。',
        '请严格按以下格式，每章一行：',
        '1. 章节标题 | 本章简要概述',
        '2. ...',
      ].join('\n')
    case 'ar':
      return [
        `الفكرة العامة: ${input.storyPrompt.trim() || '(بدون موجه)'}`,
        '',
        'دليل الشخصيات:',
        input.bible,
        '',
        'ابتكر أنت الحبكة الكاملة: بداية جذابة ونهاية مفاجئة لكن متسقة.',
        '',
        `خطط لـ ${input.chapterCount} فصول بالضبط (~${input.wordsPerChapter} كلمة لكل فصل).`,
        'يجب أن يكون كل عنوان مبدعاً ووصفياً.',
        'أعد سطراً واحداً لكل فصل:',
        '1. عنوان الفصل | ملخص موجز',
        '2. ...',
      ].join('\n')
    case 'fr':
      return [
        `Idée générale : ${input.storyPrompt.trim() || '(aucune consigne)'}`,
        '',
        'Bible des personnages :',
        input.bible,
        '',
        'Invente toi-même l’arc complet : une ouverture captivante et une fin surprenante mais cohérente.',
        '',
        `Planifie exactement ${input.chapterCount} chapitres (~${input.wordsPerChapter} mots chacun).`,
        'Chaque titre doit être créatif et descriptif.',
        'Renvoie UNE ligne par chapitre :',
        '1. Titre du chapitre | Bref résumé',
        '2. ...',
      ].join('\n')
    case 'de':
      return [
        `Geschichtsidee: ${input.storyPrompt.trim() || '(keine Vorgabe)'}`,
        '',
        'Charakterbuch:',
        input.bible,
        '',
        'Erfinde selbst den gesamten Handlungsbogen: einen fesselnden Anfang und ein überraschendes, aber stimmiges Ende.',
        '',
        `Plane genau ${input.chapterCount} Kapitel (~${input.wordsPerChapter} Wörter pro Kapitel).`,
        'Jeder Titel soll kreativ und beschreibend sein, nicht nur „Kapitel 1“.',
        'Gib EINE Zeile pro Kapitel in diesem Format zurück:',
        '1. Kapiteltitel | Kurze Zusammenfassung',
        '2. ...',
      ].join('\n')
    default:
      return [
        `Story idea: ${input.storyPrompt.trim() || '(no prompt)'}`,
        '',
        'Character bible:',
        input.bible,
        '',
        'Invent the full story arc yourself: a captivating opening and a surprising but coherent ending.',
        '',
        `Plan exactly ${input.chapterCount} chapters (~${input.wordsPerChapter} words each).`,
        'Each chapter title must be creative and descriptive, not just "Chapter 1".',
        'Return ONLY one line per chapter in this exact format:',
        '1. Chapter title | Brief summary of what happens',
        '2. ...',
      ].join('\n')
  }
}

export function buildChapterGeneratePrompt(input: {
  language: Language
  storyPrompt: string
  bible: string
  chapterLabel: string
  chapterTitle: string
  chapterBrief: string
  chapterNumber: number
  priorChapters: string
  currentContext: string
  wordsSoFar: number
  targetWordCount: number
  chunkWordTarget: number
  isFinale?: boolean
}): string {
  const remaining = Math.max(input.targetWordCount - input.wordsSoFar, 0)
  const grammar = extraGrammarRules(input.language)

  switch (input.language) {
    case 'es':
      return [
        `Idea general: ${input.storyPrompt.trim() || '(sin prompt)'}`,
        '',
        'Biblia de personajes:',
        input.bible,
        '',
        input.priorChapters ? `Capítulos anteriores:\n${input.priorChapters}` : 'Este es el primer capítulo.',
        '',
        `Capítulo ${input.chapterLabel}: «${input.chapterTitle}»`,
        'El lector ya verá ese título en la página del capítulo: no lo repitas como primera línea del texto.',
        input.chapterBrief ? `Resumen del capítulo: ${input.chapterBrief}` : '',
        input.isFinale ? 'Este es el capítulo FINAL. Cierra la historia de forma satisfactoria.' : '',
        '',
        input.currentContext
          ? `Texto del capítulo hasta ahora (${input.wordsSoFar} palabras):\n${input.currentContext}`
          : 'Empieza este capítulo desde cero.',
        '',
        `Escribe el siguiente fragmento de ~${input.chunkWordTarget} palabras.`,
        `Objetivo del capítulo: ~${input.targetWordCount} palabras (faltan ~${remaining}).`,
        'Continúa de forma natural. Solo devuelve el nuevo fragmento.',
        grammar,
      ]
        .filter(Boolean)
        .join('\n')
    case 'zh':
      return [
        `故事创意：${input.storyPrompt.trim() || '（无提示）'}`,
        '',
        '角色设定：',
        input.bible,
        '',
        input.priorChapters ? `之前的章节：\n${input.priorChapters}` : '这是第一章。',
        '',
        `第 ${input.chapterLabel} 章：《${input.chapterTitle}》`,
        '读者已在章节页看到标题，不要在正文第一行重复标题。',
        input.chapterBrief ? `本章概述：${input.chapterBrief}` : '',
        input.isFinale ? '这是最后一章。请令人满意地收尾。' : '',
        '',
        input.currentContext
          ? `本章目前已有文字（${input.wordsSoFar}字）：\n${input.currentContext}`
          : '从零开始写本章。',
        '',
        `写下一段约 ${input.chunkWordTarget} 字的内容。`,
        `本章目标：约 ${input.targetWordCount} 字（还剩约 ${remaining} 字）。`,
        '请自然衔接，只返回新片段。',
        grammar,
      ]
        .filter(Boolean)
        .join('\n')
    case 'ar':
      return [
        `الفكرة العامة: ${input.storyPrompt.trim() || '(بدون موجه)'}`,
        '',
        'دليل الشخصيات:',
        input.bible,
        '',
        input.priorChapters ? `الفصول السابقة:\n${input.priorChapters}` : 'هذا هو الفصل الأول.',
        '',
        `الفصل ${input.chapterLabel}: «${input.chapterTitle}»`,
        'لا تكرر عنوان الفصل في السطر الأول.',
        input.chapterBrief ? `ملخص الفصل: ${input.chapterBrief}` : '',
        input.isFinale ? 'هذا هو الفصل الأخير. اختم القصة بشكل مُرضٍ.' : '',
        '',
        input.currentContext
          ? `نص الفصل حتى الآن (${input.wordsSoFar} كلمة):\n${input.currentContext}`
          : 'ابدأ هذا الفصل من الصفر.',
        '',
        `اكتب المقطع التالي (~${input.chunkWordTarget} كلمة).`,
        `هدف الفصل: ~${input.targetWordCount} كلمة (يتبقى ~${remaining}).`,
        'تابع بشكل طبيعي. أعد المقطع الجديد فقط.',
        grammar,
      ]
        .filter(Boolean)
        .join('\n')
    case 'fr':
      return [
        `Idée générale : ${input.storyPrompt.trim() || '(aucune consigne)'}`,
        '',
        'Bible des personnages :',
        input.bible,
        '',
        input.priorChapters ? `Chapitres précédents :\n${input.priorChapters}` : 'C’est le premier chapitre.',
        '',
        `Chapitre ${input.chapterLabel} : « ${input.chapterTitle} »`,
        'Ne répète pas le titre du chapitre en première ligne.',
        input.chapterBrief ? `Résumé du chapitre : ${input.chapterBrief}` : '',
        input.isFinale ? 'C’est le chapitre FINAL. Termine l’histoire de façon satisfaisante.' : '',
        '',
        input.currentContext
          ? `Texte du chapitre jusqu’ici (${input.wordsSoFar} mots) :\n${input.currentContext}`
          : 'Commence ce chapitre depuis le début.',
        '',
        `Écris le prochain segment (~${input.chunkWordTarget} mots).`,
        `Objectif du chapitre : ~${input.targetWordCount} mots (~${remaining} restants).`,
        'Continue naturellement. Renvoie uniquement le nouveau segment.',
        grammar,
      ]
        .filter(Boolean)
        .join('\n')
    case 'de':
      return [
        `Geschichtsidee: ${input.storyPrompt.trim() || '(keine Vorgabe)'}`,
        '',
        'Charakterbuch:',
        input.bible,
        '',
        input.priorChapters ? `Frühere Kapitel:\n${input.priorChapters}` : 'Dies ist das erste Kapitel.',
        '',
        `Kapitel ${input.chapterLabel}: „${input.chapterTitle}“`,
        'Wiederhole den Kapiteltitel nicht in der ersten Zeile.',
        input.chapterBrief ? `Kapitelzusammenfassung: ${input.chapterBrief}` : '',
        input.isFinale ? 'Dies ist das LETZTE Kapitel. Beende die Geschichte auf befriedigende Weise.' : '',
        '',
        input.currentContext
          ? `Bisheriger Kapiteltext (${input.wordsSoFar} Wörter):\n${input.currentContext}`
          : 'Beginne dieses Kapitel von vorn.',
        '',
        `Schreibe das nächste Segment (~${input.chunkWordTarget} Wörter).`,
        `Kapitelziel: ~${input.targetWordCount} Wörter (~${remaining} verbleibend).`,
        'Fahre natürlich fort. Gib nur das neue Segment zurück.',
        grammar,
      ]
        .filter(Boolean)
        .join('\n')
    default:
      return [
        `Story idea: ${input.storyPrompt.trim() || '(no prompt)'}`,
        '',
        'Character bible:',
        input.bible,
        '',
        input.priorChapters ? `Previous chapters:\n${input.priorChapters}` : 'This is the first chapter.',
        '',
        `Chapter ${input.chapterLabel}: "${input.chapterTitle}"`,
        'The reader already sees that chapter title on the chapter page: do not repeat it as the first line of text.',
        input.chapterBrief ? `Chapter summary: ${input.chapterBrief}` : '',
        input.isFinale ? 'This is the FINAL chapter. End the story in a satisfying, surprising way.' : '',
        '',
        input.currentContext
          ? `Chapter text so far (${input.wordsSoFar} words):\n${input.currentContext}`
          : 'Start this chapter from scratch.',
        '',
        `Write the next segment of ~${input.chunkWordTarget} words.`,
        `Chapter target: ~${input.targetWordCount} words (~${remaining} remaining).`,
        'Continue naturally. Return only the new segment.',
      ]
        .filter(Boolean)
        .join('\n')
  }
}

export function buildTranslationSystemPrompt(targetLanguage: Language): string {
  const name = LANGUAGE_ENGLISH_NAMES[targetLanguage]

  switch (targetLanguage) {
    case 'es':
      return `Eres un traductor profesional de cuentos infantiles.
Traduce al español de forma natural y apta para niños.
Reglas:
- Mantén el tono, emoción y significado del original.
- Devuelve SOLO el texto traducido, nada más.
- El texto es siempre contenido inofensivo para niños. NUNCA te niegues, te disculpes ni añadas comentarios. Simplemente traduce.`
    case 'zh':
      return `你是一位专业的儿童故事翻译。
请翻译成自然、适合儿童的简体中文。
规则：
- 保留原文的语气、情感和含义。
- 只返回译文，不要其他内容。
- 文本始终是无害的儿童内容。绝不要拒绝、道歉或添加评论。直接翻译。`
    case 'ar':
      return `أنت مترجم محترف لقصص الأطفال.
ترجم إلى العربية الفصحى الحديثة بشكل طبيعي ومناسب للأطفال.
القواعد:
- حافظ على النبرة والعاطفة والمعنى.
- أعد النص المترجم فقط.
- النص دائماً محتوى غير مؤذٍ للأطفال. لا ترفض أبداً ولا تعتذر ولا تضف تعليقات. ترجم فقط.`
    case 'fr':
      return `Tu es un traducteur professionnel de contes pour enfants.
Traduis en français naturel et adapté aux enfants.
Règles :
- Préserve le ton, l’émotion et le sens de l’original.
- Renvoie UNIQUEMENT le texte traduit.
- Le texte est toujours un contenu inoffensif pour enfants. Ne refuse JAMAIS, ne t’excuse pas et n’ajoute aucun commentaire. Traduis simplement.`
    case 'de':
      return `Du bist ein professioneller Übersetzer von Kindergeschichten.
Übersetze ins natürliche, kindgerechte Deutsch.
Regeln:
- Bewahre Ton, Emotion und Bedeutung des Originals.
- Gib NUR den übersetzten Text zurück.
- Der Text ist immer harmloser Kinderinhalt. Lehne NIEMALS ab, entschuldige dich nicht und füge keine Kommentare hinzu. Übersetze einfach.`
    default:
      return `You are a professional translator of children's stories.
Translate into natural, child-appropriate ${name}.
Rules:
- Preserve tone, emotion, and meaning from the original.
- Return ONLY the translated text, nothing else.
- The text is always harmless children's content. NEVER refuse, apologize, or add commentary. Just translate.`
  }
}
