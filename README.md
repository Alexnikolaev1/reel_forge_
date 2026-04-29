# ReelForge 🎬

AI-фабрика видеоконтента на основе открытых технологий.

**Стек:** Next.js 16 · Gemini 2.5 Flash · FLUX.1-dev · HunyuanVideo · Remotion · Tailwind · Sonner

---

## Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка окружения

```bash
cp .env.local.example .env.local
```

Заполни `.env.local`:

| Ключ | Где получить |
|------|-------------|
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) → Get API key |
| `HF_API_KEY` | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) → New token (read) |

### 3. Создай папку для выходных файлов

```bash
mkdir -p public/output && touch public/output/.gitkeep
```

### 4. Запуск

```bash
npm run dev
```

Открой [http://localhost:3000](http://localhost:3000)  
Пароль по умолчанию: `reelforge2024`

### 5. Проверка под Vercel free

```bash
npm run smoke:vercel
```

Рекомендуемые env для Vercel:
- `GEMINI_API_KEY`
- `HF_API_KEY`
- `ADMIN_PASSWORD`
- `NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app`
- `INTERNAL_API_TOKEN=<long-random-token>`
- `ENABLE_SERVER_RENDER=false` (на free плане серверный MP4-рендер часто упирается в лимиты)
- `EXTERNAL_RENDER_WEBHOOK_URL=https://<your-render-worker>/jobs`
- `EXTERNAL_RENDER_WEBHOOK_TOKEN=<optional>`
- `RENDER_CALLBACK_SECRET=<long-random-token>`

Контракт внешнего рендера:
- ReelForge отправляет POST на `EXTERNAL_RENDER_WEBHOOK_URL` с `{ projectId, title, fps, totalFrames, width, height, scenes, callbackUrl }`
- После рендера внешний воркер должен вызвать `POST /api/render/callback`
- Заголовок callback: `x-render-callback-secret: <RENDER_CALLBACK_SECRET>`
- Тело callback (успех): `{ "projectId": "...", "outputUrl": "https://cdn.../final.mp4" }`
- Тело callback (ошибка): `{ "projectId": "...", "error": "render failed" }`

---

## Пайплайн генерации

```
Тема → Gemini сценарий → FLUX изображения → HunyuanVideo клипы → Remotion MP4
```

1. Введи тему, выбери стиль и длительность
2. Gemini создаёт сценарий и раскадровку
3. Утверди сценарий и запусти генерацию
4. Следи за прогрессом в реальном времени
5. Скачай готовое MP4

---

## Структура проекта

```
src/
├── app/
│   ├── page.tsx                          # Страница входа
│   ├── dashboard/
│   │   ├── page.tsx                      # Список проектов
│   │   ├── new/page.tsx                  # Визард создания
│   │   └── projects/[id]/page.tsx        # Страница проекта + плеер
│   └── api/
│       ├── generate-script/route.ts      # Gemini → сценарий
│       ├── start-generation/route.ts     # Запуск конвейера
│       ├── render/route.ts               # Remotion рендеринг
│       └── projects/[id]/status/route.ts # Polling статуса
├── lib/
│   ├── auth.ts                           # Аутентификация (cookies)
│   ├── db.ts                             # Файловое хранилище
│   ├── actions.ts                        # Server Actions + конвейер
│   └── hf-generate.ts                   # Hugging Face утилиты
remotion/
├── VideoComposition.tsx                  # Remotion компонент
└── index.tsx                             # Entry point
```

---

## Советы

- Если `HunyuanVideo` недоступен — замени в `actions.ts` вызов на `generateSceneVideoFallback` (использует `stable-video-diffusion`, работает быстрее)
- Рендеринг может занять 5–15 минут в зависимости от количества сцен
- Данные проектов хранятся в `.data/projects.json`
- Готовые видео — в `public/output/{projectId}/`
- На Vercel free лучше отключать `ENABLE_SERVER_RENDER` и выносить тяжёлый рендер в отдельный worker/сервер
