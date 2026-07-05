import type {
  CharacterAlignment,
  CharacterGender,
  Language,
} from '@/types/story'

export type RandomCharacterData = {
  name: string
  alignment: CharacterAlignment
  gender: CharacterGender
  age: number
  isHuman: boolean
  species?: string
  hasSuperpowers: boolean
  superpowerDescription?: string
  hasPet: boolean
  petName?: string
  petSpecies?: string
  petHasSuperpowers: boolean
  petSuperpowerDescription?: string
}

const RANDOM_NAME_TRIGGER = 'random'

const BOY_NAMES: Record<Language, readonly string[]> = {
  en: ['Liam', 'Noah', 'Ethan', 'Lucas', 'Oliver', 'Leo', 'Jack', 'Finn', 'Theo', 'Max'],
  es: ['Mateo', 'Lucas', 'Hugo', 'Leo', 'Diego', 'Pablo', 'Marco', 'Nico', 'Bruno', 'Iván'],
  zh: ['浩然', '子轩', '宇航', '俊杰', '晨曦', '一鸣', '天佑', '博文', '子豪', '明轩'],
  ar: ['Adam', 'Omar', 'Youssef', 'Karim', 'Ziad', 'Samir', 'Rami', 'Tariq', 'Nasser', 'Faris'],
  fr: ['Lucas', 'Hugo', 'Louis', 'Gabriel', 'Raphaël', 'Jules', 'Arthur', 'Noah', 'Maël', 'Léo'],
  de: ['Ben', 'Finn', 'Leon', 'Paul', 'Elias', 'Noah', 'Luis', 'Jonas', 'Felix', 'Max'],
}

const GIRL_NAMES: Record<Language, readonly string[]> = {
  en: ['Emma', 'Olivia', 'Ava', 'Sophia', 'Mia', 'Luna', 'Zoe', 'Nora', 'Chloe', 'Ruby'],
  es: ['Lucía', 'Sofía', 'Martina', 'Emma', 'Valeria', 'Luna', 'Alba', 'Clara', 'Noa', 'Irene'],
  zh: ['雨桐', '欣怡', '诗涵', '梓萱', '思琪', '梦瑶', '语嫣', '若曦', '佳怡', '静怡'],
  ar: ['Layla', 'Maya', 'Sara', 'Nour', 'Yasmin', 'Lina', 'Hana', 'Amira', 'Dina', 'Rania'],
  fr: ['Emma', 'Jade', 'Louise', 'Alice', 'Chloé', 'Lina', 'Rose', 'Anna', 'Camille', 'Zoé'],
  de: ['Emma', 'Mia', 'Hannah', 'Sophia', 'Lina', 'Lea', 'Marie', 'Anna', 'Clara', 'Nora'],
}

const SPECIES: Record<Language, readonly string[]> = {
  en: ['Dragon', 'Robot', 'Fairy', 'Unicorn', 'Wolf', 'Fox', 'Owl', 'Mermaid', 'Phoenix', 'Cat'],
  es: ['Dragón', 'Robot', 'Hada', 'Unicornio', 'Lobo', 'Zorro', 'Búho', 'Sirena', 'Fénix', 'Gato'],
  zh: ['龙', '机器人', '精灵', '独角兽', '狼', '狐狸', '猫头鹰', '美人鱼', '凤凰', '猫'],
  ar: ['تنين', 'روبوت', 'جنية', 'أحادي القرن', 'ذئب', 'ثعلب', 'بومة', 'حورية بحر', 'عنقاء', 'قطة'],
  fr: ['Dragon', 'Robot', 'Fée', 'Licorne', 'Loup', 'Renard', 'Hibou', 'Sirène', 'Phénix', 'Chat'],
  de: ['Drache', 'Roboter', 'Fee', 'Einhorn', 'Wolf', 'Fuchs', 'Eule', 'Meerjungfrau', 'Phoenix', 'Katze'],
}

const PET_NAMES: Record<Language, readonly string[]> = {
  en: ['Buddy', 'Spark', 'Mochi', 'Pip', 'Shadow', 'Sunny', 'Coco', 'Zippy', 'Bubbles', 'Nugget'],
  es: ['Coco', 'Luna', 'Pelusa', 'Toby', 'Nube', 'Pirata', 'Mimi', 'Trueno', 'Bolita', 'Chispa'],
  zh: ['豆豆', '小白', '花花', '球球', '咪咪', '旺财', '团团', '闪电', '毛球', '星星'],
  ar: ['فرفور', 'لولو', 'زيتون', 'بسكوت', 'نونو', 'سكر', 'فلفل', 'ميمي', 'زعرور', 'بوبو'],
  fr: ['Caramel', 'Pilou', 'Nounours', 'Fripouille', 'Choupette', 'Roudoudou', 'Tornado', 'Biscotte', 'Pépito', 'Zouzou'],
  de: ['Bello', 'Mimi', 'Pfötchen', 'Schnuffel', 'Keks', 'Flocke', 'Pip', 'Sunny', 'Moppel', 'Spatz'],
}

const PET_SPECIES: Record<Language, readonly string[]> = {
  en: ['Dog', 'Cat', 'Rabbit', 'Hamster', 'Parrot', 'Turtle', 'Fox', 'Owl', 'Frog', 'Pony'],
  es: ['Perro', 'Gato', 'Conejo', 'Hámster', 'Loro', 'Tortuga', 'Zorro', 'Búho', 'Rana', 'Poni'],
  zh: ['狗', '猫', '兔子', '仓鼠', '鹦鹉', '乌龟', '狐狸', '猫头鹰', '青蛙', '小马'],
  ar: ['كلب', 'قطة', 'أرنب', 'هامستر', 'ببغاء', 'سلحفاة', 'ثعلب', 'بومة', 'ضفدع', 'مهر'],
  fr: ['Chien', 'Chat', 'Lapin', 'Hamster', 'Perroquet', 'Tortue', 'Renard', 'Hibou', 'Grenouille', 'Poney'],
  de: ['Hund', 'Katze', 'Kaninchen', 'Hamster', 'Papagei', 'Schildkröte', 'Fuchs', 'Eule', 'Frosch', 'Pony'],
}

const SUPERPOWERS: Record<Language, readonly string[]> = {
  en: [
    'Can talk to animals',
    'Super speed',
    'Can turn invisible',
    'Healing touch',
    'Controls gentle winds',
    'Can fly for short bursts',
    'Super strength',
    'Glows in the dark',
    'Can breathe underwater',
    'Makes plants grow quickly',
  ],
  es: [
    'Puede hablar con los animales',
    'Super velocidad',
    'Puede volverse invisible',
    'Toque sanador',
    'Controla vientos suaves',
    'Puede volar por poco tiempo',
    'Super fuerza',
    'Brilla en la oscuridad',
    'Puede respirar bajo el agua',
    'Hace crecer las plantas rápido',
  ],
  zh: [
    '能和动物说话',
    '超级速度',
    '可以隐身',
    '治愈之触',
    '控制温柔的风',
    '能短时间飞行',
    '超级力量',
    '在黑暗中发光',
    '能在水下呼吸',
    '让植物快速生长',
  ],
  ar: [
    'يتحدث مع الحيوانات',
    'سرعة خارقة',
    'يصبح غير مرئي',
    'لمسة شفائية',
    'يتحكم في الرياح اللطيفة',
    'يطير لفترات قصيرة',
    'قوة خارقة',
    'يتوهج في الظلام',
    'يتنفس تحت الماء',
    'ينمو النبات بسرعة',
  ],
  fr: [
    'Peut parler aux animaux',
    'Super vitesse',
    'Peut devenir invisible',
    'Toucher guérisseur',
    'Contrôle les vents doux',
    'Peut voler brièvement',
    'Super force',
    'Brille dans le noir',
    'Peut respirer sous l’eau',
    'Fait pousser les plantes vite',
  ],
  de: [
    'Kann mit Tieren sprechen',
    'Supergeschwindigkeit',
    'Kann unsichtbar werden',
    'Heilende Berührung',
    'Kontrolliert sanfte Winde',
    'Kann kurz fliegen',
    'Superkraft',
    'Leuchtet im Dunkeln',
    'Kann unter Wasser atmen',
    'Lässt Pflanzen schnell wachsen',
  ],
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!
}

function pickUniqueName(
  language: Language,
  gender: CharacterGender,
  existingNames: readonly string[],
): string {
  const taken = new Set(existingNames.map((name) => name.trim().toLowerCase()))
  const pool = gender === 'boy' ? BOY_NAMES[language] : GIRL_NAMES[language]
  const available = pool.filter((name) => !taken.has(name.toLowerCase()))
  if (available.length > 0) return pick(available)
  return `${pick(pool)} ${Math.floor(Math.random() * 90) + 10}`
}

export function isRandomCharacterName(name: string): boolean {
  return name.trim().toLowerCase() === RANDOM_NAME_TRIGGER
}

export function generateRandomCharacter(
  language: Language,
  existingNames: readonly string[] = [],
): RandomCharacterData {
  const gender: CharacterGender = Math.random() < 0.5 ? 'boy' : 'girl'
  const alignment: CharacterAlignment = Math.random() < 0.5 ? 'good' : 'bad'
  const age = Math.floor(Math.random() * 14) + 5
  const isHuman = Math.random() < 0.7
  const hasSuperpowers = Math.random() < (isHuman ? 0.35 : 0.55)
  const hasPet = Math.random() < 0.45
  const petHasSuperpowers = hasPet && Math.random() < 0.3

  return {
    name: pickUniqueName(language, gender, existingNames),
    alignment,
    gender,
    age,
    isHuman,
    species: isHuman ? '' : pick(SPECIES[language]),
    hasSuperpowers,
    superpowerDescription: hasSuperpowers ? pick(SUPERPOWERS[language]) : '',
    hasPet,
    petName: hasPet ? pick(PET_NAMES[language]) : '',
    petSpecies: hasPet ? pick(PET_SPECIES[language]) : '',
    petHasSuperpowers,
    petSuperpowerDescription: petHasSuperpowers ? pick(SUPERPOWERS[language]) : '',
  }
}
