# kсенже — Developer

Личный сайт: разработка и собственные проекты, плюс небольшой встроенный плеер.
Монохромный liquid glass, анимированный фон и интерактивная «обложка», которая
переливается как жидкость и реагирует на звук трека.

Живая версия: **https://ksenje.github.io/**

Стек: React 19 · TypeScript · Vite · Tailwind CSS 4 · Framer Motion

Сайт **полностью статический** и публикуется на GitHub Pages: сервера, админки и
Telegram-бота в проекте нет. Всё, что видит посетитель, лежит в `src/` и `public/`.

## Commands

```bash
npm install
npm run dev           # локальная разработка
npm run build         # typecheck + сборка в dist/ + 404.html
npm run preview       # локальный просмотр сборки
npm run lint          # oxlint
```

## Deploy

`.github/workflows/deploy.yml` публикует `dist/` на GitHub Pages при пуше в `main`.
В репозитории: Settings → Pages → Source: **GitHub Actions**.

Загрузить файлы можно прямо из браузера: GitHub → **Add file → Upload files**. Это тоже
коммит в `main`, поэтому Actions соберёт и задеплоит сайт сам. Загружать нужно только
файлы проекта — `node_modules`, `dist` и `.env` в репозиторий не попадают (они в `.gitignore`),
а загрузка `node_modules` в браузере всё равно упрётся в лимит GitHub в 100 файлов.

Workflow передаёт `SITE_URL`, поэтому `og:image`, иконки и ссылки в `404.html`
становятся абсолютными. Своё доменное имя добавляется там же: Settings → Pages → Custom domain.

Сайт собирается с `base: './'`, поэтому работает и на корне домена, и по пути `/<repo>/`,
и на своём домене без дополнительной настройки.

## Content

Весь текст — в `src/data/site.ts`: имя, роль, заголовок, разделы, навыки, контакты, реквизиты.

- Контакты: Telegram `@root_me`, VK `@rooot_me`.
- Оплата: xRocket `@xrocket`, Send `@send`, публичный TON-адрес для переводов.

Приватные ключи и seed-фразы на сайте не хранятся и в репозиторий не попадают.

## Music catalogue

Каталог статический: `src/data/catalog.json` + аудиофайлы в `public/audio/`.

```json
{
  "disabled": false,
  "tracks": [
    {
      "title": "Название трека",
      "audio": "./audio/track-name.mp3",
      "duration": 214,
      "published": true
    }
  ]
}
```

- Пути относительные, поэтому плеер работает по любому адресу Pages.
- `duration` в секундах; при отсутствии берётся длительность файла.
- `published: false` оставляет запись в файле, но прячет трек из каталога.
- Каталог можно отключить целиком: `"disabled": true`.

Если каталог лежит на отдельном хостинге, задайте `VITE_CATALOG_URL` на этапе сборки —
сайт возьмёт треки оттуда и откатится к файлу из репозитория, если endpoint недоступен.

Плеер встроен прямо в секцию «Музыка». Отдельной панели внизу страницы нет. Аудио
грузится только после нажатия Play. Визуализация обложки построена на Web Audio API
(`AnalyserNode`): плавные светящиеся пятна переливаются и реагируют на частоты трека,
на паузе жидкость успокаивается. Анализ звука включается при первом воспроизведении.

## Privacy

Репозиторий публичный, поэтому в коммитах не должно быть:

- `.env`, `.env.local` и любых значений токенов, паролей, ключей;
- черновиков и закрытых треков;
- файлов, которые не предназначены для публичного доступа.

`.gitignore` закрывает `.env*`, `dist` и `node_modules`.

Всё, что лежит в `public/`, попадает и в репозиторий, и в публичную сборку.
Публиковать нужно только то, что можно показать любому посетителю сайта.

## Structure

```
src/
  App.tsx                  page composition and layer order
  main.tsx                 static entry point
  data/site.ts             all copy: identity, sections, skills, contacts, payments
  data/catalog.json        music catalogue
  index.css                design tokens, liquid glass system, keyframes
  hooks/useEnvironment.ts  media queries, device tier, reduced motion
  lib/
    catalog.ts             bundled catalogue loader
    format.ts              time, size and date formatting
    motion.ts              shared easings, springs, reveal helpers
    pointer.ts             single rAF pointer bus, custom cursor toggle
  components/
    effects/               snowfall canvas, cursor light, custom cursor, aurora
    layout/                navbar, footer
    music/                 player provider (state, audio element, analyser)
    sections/              hero, about, music, skills, payments, contact
    ui/                    glass panel, button, reveal, icons, liquid cover
public/
  audio/                   audio files for the catalogue
  favicon.png              site icon (from the avatar)
  apple-touch-icon.png     iOS home screen icon
  og.png                   social preview image
scripts/postbuild.mjs      404.html redirect and absolute OG URLs
```

## Layer order

1. `Intro` — brief black fade on first load
2. `AuroraBackground` — cold moving light sources
3. `Snowfall` — one canvas behind all glass
4. `CursorLight` — pointer following light
5. `Navbar` + content — glass surfaces
6. `Footer`
7. `CustomCursor`

## Performance and accessibility

- Snowfall and the liquid cover render on canvas, no DOM particles, paused when off screen.
- Particle counts and blur cost scale with device tier; touch devices get the light budget.
- Cursor light, tilt and custom cursor are disabled on coarse pointers.
- `prefers-reduced-motion` removes travel, blur reveals, float loops and cursor glow.
- `overflow-x: clip` prevents horizontal scrolling on every breakpoint.
