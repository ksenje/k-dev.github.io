/**
 * Site copy. The site is a static bundle, so every string shown to visitors lives here
 * and is committed to the repository. Keep it public: this file ships inside `dist/`.
 */
export const identity = {
  name: 'kсенже',
  role: 'Developer',
  headline: 'Разработка и собственные проекты.',
  copyright: '© kсенже',
}

/** Public contact details. Only channels that are meant to be seen by anyone. */
export const contacts = {
  telegram: { label: '@root_me', url: 'https://t.me/root_me' },
  vk: { label: '@rooot_me', url: 'https://vk.com/rooot_me' },
}

/** Public payment details. TON address is a public receive address, never a private key. */
export const payments = {
  xrocket: { label: '@xrocket', url: 'https://t.me/xrocket', title: 'xRocket' },
  send: { label: '@send', url: 'https://t.me/send', title: 'Send' },
  ton: 'UQCSCCAhJySGUarWjxXLP0Fx6YTnh6_n_vrpJ3zuL-_7ANml',
}

export type NavItem = { label: string; href: string }

export const navItems: NavItem[] = [
  { label: 'Главная', href: '#home' },
  { label: 'Обо мне', href: '#about' },
  { label: 'Музыка', href: '#music' },
  { label: 'Реквизиты', href: '#payments' },
  { label: 'Контакты', href: '#contact' },
]

/** About copy: no invented experience, numbers or achievements. */
export const about = {
  eyebrow: 'Обо мне',
  title: 'Разработчик',
  highlight: 'и автоматизатор',
  paragraphs: [
    'Я занимаюсь созданием программ и IT-решений.',
    'Разрабатываю Telegram-ботов, сайты, веб-приложения, автоматизацию и собственные цифровые продукты.',
  ],
  cards: [
    { title: 'Разработка', text: 'Программы, боты, сайты и автоматизация под задачу.' },
    { title: 'Проекты', text: 'Работаю и довожу до результата то, что делаю сам.' },
  ],
}

export const skills = {
  eyebrow: 'Навыки',
  title: 'Технологии',
  highlight: 'в работе',
  groups: [
    {
      title: 'Разработка',
      items: ['Python', 'JavaScript', 'TypeScript', 'SQL'],
    },
    {
      title: 'Инструменты',
      items: ['Git', 'Linux', 'Docker', 'REST API'],
    },
    {
      title: 'Направления',
      items: ['Telegram-боты', 'Веб-приложения', 'Автоматизация', 'Скрипты'],
    },
  ],
}

export const music = {
  eyebrow: 'Музыка',
  title: 'Музыка',
  description: 'Плеер находится в этой секции и прокручивается вместе со страницей.',
  emptyTitle: 'Каталог пуст',
  playLabel: 'Воспроизвести',
  pauseLabel: 'Пауза',
  previousLabel: 'Предыдущий трек',
  nextLabel: 'Следующий трек',
  progressLabel: 'Позиция воспроизведения',
  volumeLabel: 'Громкость',
  muteOnLabel: 'Включить звук',
  muteOffLabel: 'Выключить звук',
  idleTitle: 'Готово к воспроизведению',
}

export const paymentsSection = {
  eyebrow: 'Реквизиты',
  title: 'Оплата',
  highlight: 'и переводы',
  text: 'Принимаю оплату в TON, xRocket и Send.',
  tonLabel: 'TON адрес',
  copyLabel: 'Скопировать',
  copiedLabel: 'Скопировано',
  openLabel: 'Открыть',
}

export const contact = {
  eyebrow: 'Контакты',
  title: 'Связаться',
  highlight: 'со мной',
  text: 'Напишите в Telegram, если хотите обсудить проект или задачу.',
  button: 'Написать в Telegram',
  channels: [
    { key: 'telegram', title: 'Telegram', handle: '@root_me', url: 'https://t.me/root_me', cta: 'Написать' },
    { key: 'vk', title: 'VK', handle: '@rooot_me', url: 'https://vk.com/rooot_me', cta: 'Открыть' },
  ],
}