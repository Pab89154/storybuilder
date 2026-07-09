import type {
  CharacterAlignment,
  CharacterGender,
  Language,
} from '@/types/story'

export type RandomCharacterData = {
  name: string
  nickname?: string
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
  hasVehicle: boolean
  vehicleType?: string
  vehicleColor?: string
  vehicleSpeed?: string
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

const NICKNAMES: Record<Language, readonly string[]> = {
  en: ['Ace', 'Spark', 'Shadow', 'Sunny', 'Rocket', 'Flash', 'Star', 'Hero', 'Dash', 'Lucky'],
  es: ['Rayo', 'Estrella', 'Campeón', 'Trueno', 'Suerte', 'Cohete', 'Héroe', 'Flash', 'Sol', 'Genio'],
  zh: ['小星', '闪电', '英雄', '幸运', '火箭', '阳光', '影子', '天才', '飞侠', '宝贝'],
  ar: ['نجم', 'بطل', 'برق', 'محظوظ', 'صاروخ', 'شمس', 'ظل', 'فلاش', 'أسد', 'كناري'],
  fr: ['Étoile', 'Héros', 'Éclair', 'Chance', 'Fusée', 'Soleil', 'Ombre', 'Flash', 'As', 'Champion'],
  de: ['Star', 'Held', 'Blitz', 'Glück', 'Rakete', 'Sonne', 'Schatten', 'Flash', 'Ass', 'Champion'],
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

const VEHICLE_TYPES: Record<Language, readonly string[]> = {
  en: ['Bicycle', 'Skateboard', 'Scooter', 'Go-kart', 'Rocket ship', 'Hoverboard', 'Submarine', 'Magic carpet', 'Horse cart', 'Speedboat'],
  es: ['Bicicleta', 'Monopatín', 'Patinete', 'Kart', 'Cohete', 'Hoverboard', 'Submarino', 'Alfombra mágica', 'Carreta', 'Lancha'],
  zh: ['自行车', '滑板', '滑板车', '卡丁车', '火箭', '悬浮板', '潜水艇', '魔毯', '马车', '快艇'],
  ar: ['دراجة', 'لوح تزلج', 'سكوتر', 'عربة سباق', 'صاروخ', 'لوح طائر', 'غواصة', 'بساط سحري', 'عربة', 'قارب سريع'],
  fr: ['Vélo', 'Skateboard', 'Trottinette', 'Kart', 'Fusée', 'Hoverboard', 'Sous-marin', 'Tapis volant', 'Charrette', 'Hors-bord'],
  de: ['Fahrrad', 'Skateboard', 'Roller', 'Go-Kart', 'Rakete', 'Hoverboard', 'U-Boot', 'Fliegerteppich', 'Planwagen', 'Schnellboot'],
}

const VEHICLE_COLORS: Record<Language, readonly string[]> = {
  en: ['Red', 'Blue', 'Green', 'Yellow', 'Silver', 'Black', 'White', 'Purple', 'Orange', 'Gold'],
  es: ['Rojo', 'Azul', 'Verde', 'Amarillo', 'Plateado', 'Negro', 'Blanco', 'Morado', 'Naranja', 'Dorado'],
  zh: ['红色', '蓝色', '绿色', '黄色', '银色', '黑色', '白色', '紫色', '橙色', '金色'],
  ar: ['أحمر', 'أزرق', 'أخضر', 'أصفر', 'فضي', 'أسود', 'أبيض', 'بنفسجي', 'برتقالي', 'ذهبي'],
  fr: ['Rouge', 'Bleu', 'Vert', 'Jaune', 'Argent', 'Noir', 'Blanc', 'Violet', 'Orange', 'Or'],
  de: ['Rot', 'Blau', 'Grün', 'Gelb', 'Silber', 'Schwarz', 'Weiß', 'Lila', 'Orange', 'Gold'],
}

const VEHICLE_SPEEDS: Record<Language, readonly string[]> = {
  en: ['10 mph', '25 mph', '50 mph', 'Very fast', 'Super fast', 'Lightning quick', 'Slow and steady', 'Zooms like the wind', '100 mph', 'As fast as a cheetah'],
  es: ['16 km/h', '40 km/h', '80 km/h', 'Muy rápido', 'Superrápido', 'Rapidísimo', 'Lento y constante', 'Corre como el viento', '160 km/h', 'Tan rápido como un guepardo'],
  zh: ['16公里/小时', '40公里/小时', '80公里/小时', '非常快', '超级快', '快如闪电', '慢而稳', '像风一样快', '160公里/小时', '像猎豹一样快'],
  ar: ['16 كم/س', '40 كم/س', '80 كم/س', 'سريع جداً', 'سريع للغاية', 'سريع كالبرق', 'بطيء وثابت', 'سريع كالريح', '160 كم/س', 'سريع كالفهد'],
  fr: ['16 km/h', '40 km/h', '80 km/h', 'Très rapide', 'Super rapide', 'Rapide comme l’éclair', 'Lent et régulier', 'Rapide comme le vent', '160 km/h', 'Rapide comme un guépard'],
  de: ['16 km/h', '40 km/h', '80 km/h', 'Sehr schnell', 'Superschnell', 'Blitzschnell', 'Langsam und stetig', 'Schnell wie der Wind', '160 km/h', 'So schnell wie ein Gepard'],
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

function pickSuperpowers(language: Language): string {
  const first = pick(SUPERPOWERS[language])
  if (Math.random() >= 0.25) return first
  let second = pick(SUPERPOWERS[language])
  while (second === first) second = pick(SUPERPOWERS[language])
  return `${first}, ${second}`
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
  const hasVehicle = Math.random() < 0.35
  const hasNickname = Math.random() < 0.35

  return {
    name: pickUniqueName(language, gender, existingNames),
    nickname: hasNickname ? pick(NICKNAMES[language]) : '',
    alignment,
    gender,
    age,
    isHuman,
    species: isHuman ? '' : pick(SPECIES[language]),
    hasSuperpowers,
    superpowerDescription: hasSuperpowers ? pickSuperpowers(language) : '',
    hasPet,
    petName: hasPet ? pick(PET_NAMES[language]) : '',
    petSpecies: hasPet ? pick(PET_SPECIES[language]) : '',
    petHasSuperpowers,
    petSuperpowerDescription: petHasSuperpowers ? pickSuperpowers(language) : '',
    hasVehicle,
    vehicleType: hasVehicle ? pick(VEHICLE_TYPES[language]) : '',
    vehicleColor: hasVehicle ? pick(VEHICLE_COLORS[language]) : '',
    vehicleSpeed: hasVehicle ? pick(VEHICLE_SPEEDS[language]) : '',
  }
}
