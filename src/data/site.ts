/**
 * Site copy. The site is a static bundle, so every string shown to visitors lives here
 * and is committed to the repository. Keep it public: this file ships inside `dist/`.
 */
export const identity = {
  name: 'kсенже',
  role: 'Python Developer',
  headline: 'Музыка, разработка и собственные проекты.',
  copyright: '© kсенже',
}

/** Public contact details. Only channels that are meant to be seen by anyone. */
export const contacts = {
  telegram: { label: '@root_me', url: 'https://t.me/root_me' },
  payments: { label: '@send', url: 'https://t.me/send' },
  crypto: { label: '@xrocket', url: 'https://t.me/xrocket' },
  ton: 'UQCSCCAhJySGUarWjxXLP0Fx6YTnh6_n_vrpJ3zuL-_7ANml',
}

export type NavItem = { label: string; href: string }

export const navItems: NavItem[] = [
  { label: 'Главная', href: '#home' },
  { label: 'Обо мне', href: '#about' },
  { label: 'Музыка', href: '#music' },
  { label: 'Контакты', href: '#contact' },
]

/** About copy: no invented experience, numbers or achievements. */
export const about = {
  eyebrow: 'Обо мне',
  title: 'Python-разработчик',
  highlight: 'и музыкант',
  paragraphs: [
    'Я Python-разработчик, занимаюсь созданием программ и IT-решений.',
    'Разрабатываю Telegram-ботов, сайты, веб-приложения, автоматизацию и собственные цифровые продукты.',
    'Параллельно пишу музыку. Здесь появляются опубликованные треки.',
  ],
  cards: [
    { title: 'Разработка', text: 'Программы, боты, сайты и автоматизация под задачу.' },
    { title: 'Музыка', text: 'Собственные треки, публикуемые на этом сайте.' },
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
  title: 'Мои треки',
  highlight: 'здесь',
  emptyTitle: 'Треков пока нет',
  emptyText: 'Здесь появляются опубликованные треки. Каталог обновляется вместе с репозиторием.',
}

export const contact = {
  eyebrow: 'Контакты',
  title: 'Связаться',
  highlight: 'со мной',
  text: 'Напишите в Telegram, если хотите обсудить проект или задачу.',
  button: 'Связаться',
  channels: [
    { key: 'telegram', label: 'Telegram', cta: 'Написать' },
    { key: 'payments', label: 'Платежи', cta: 'Открыть' },
    { key: 'crypto', label: 'Крипта', cta: 'Открыть' },
  ] as const,
  tonLabel: 'TON адрес',
  copyLabel: 'Скопировать',
  copiedLabel: 'Скопировано',
}