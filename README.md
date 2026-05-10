# Silva Frontend

Silva - веб-платформа для поиска и бронирования загородного жилья.

Проект построен как React + Vite оболочка с маршрутизацией через `react-router-dom`, где текущий UI и бизнес-логика legacy-страниц сохраняются в `public/legacy` и подключаются через роутинг.

## Технологии

- React 19
- Vite
- React Router
- Firebase SDK
- Serverless API для оплаты (YooKassa), чата (OpenRouter), загрузки изображений (S3-compatible storage)

## Быстрый старт

### 1) Установка

```bash
npm install
```

### 2) Локальный запуск

```bash
npm run dev
```

По умолчанию приложение стартует на `http://localhost:5173`.

### 3) Production сборка

```bash
npm run build
```

### 4) Локальный просмотр production-сборки

```bash
npm run preview
```

## Переменные окружения

Создайте `.env` в корне проекта (рядом с `vite.config.js`) на основе `.env.example`.

Минимально для локальной разработки:

```env
OPENROUTER_API_KEY=your_openrouter_api_key
YOOKASSA_SHOP_ID=your_shop_id
YOOKASSA_SECRET_KEY=your_secret_key
```

Дополнительно (если используете загрузку файлов в Object Storage):

```env
YC_STORAGE_ENDPOINT=https://storage.yandexcloud.net
YC_STORAGE_REGION=ru-central1
YC_STORAGE_BUCKET=your_bucket
YC_STORAGE_ACCESS_KEY_ID=your_access_key
YC_STORAGE_SECRET_ACCESS_KEY=your_secret_key
```

Для прод-режима чата через удаленный backend:

```env
VITE_SILVA_AI_CHAT_URL=https://your-backend-endpoint
```

Важно: секреты (`OPENROUTER_API_KEY`, `YOOKASSA_SECRET_KEY`, storage-ключи) никогда не должны попадать в клиентский код и в git.

## Скрипты

- `npm run dev` - dev-сервер Vite
- `npm run build` - production build
- `npm run preview` - просмотр production build

## Структура проекта

```text
Silva_react/
├── public/legacy/          # legacy UI (html/css/js/images)
├── src/                    # React-оболочка и компоненты
│   ├── components/
│   ├── config/
│   ├── pages/
│   ├── styles/
│   ├── App.jsx
│   └── main.jsx
├── api/                    # serverless API (Vercel-style handlers)
├── firebase-functions/     # Firebase Cloud Functions (прод-вариант backend)
├── supabase/functions/     # Supabase Edge Functions (альтернативный backend)
├── docs/                   # инструкции по миграции и деплою
├── vite.config.js
├── package.json
└── README.md
```

## Как это работает

1. React-приложение обрабатывает роуты (`/catalog`, `/booking`, `/profile` и т.д.).
2. Для каждой страницы загружается соответствующий legacy HTML из `public/legacy`.
3. Клиент вызывает backend endpoint для:
   - создания и проверки платежа YooKassa;
   - AI-чата через OpenRouter;
   - загрузки файлов в S3-compatible storage.
4. Секреты остаются только на стороне serverless-функций.

## Деплой

В проекте предусмотрено несколько вариантов:

- Frontend на Vercel/любом статическом хостинге;
- Backend через:
  - `api/*` (serverless functions платформы деплоя),
  - или `firebase-functions`,
  - или `supabase/functions`.

Подробные инструкции:

- `docs/supabase-yookassa-setup.md`
- `docs/firebase-migration-guide.md`

## Полезные заметки

- `public/legacy` - единственный источник legacy-страниц.
- `dist/` генерируется автоматически и не хранится в репозитории.
- `SILVA-backend/` исключен из этого репозитория (отдельный backend-репозиторий).

## Репозиторий

GitHub: [AbiybillaevKhanbolot/SILVA-frontend](https://github.com/AbiybillaevKhanbolot/SILVA-frontend)

