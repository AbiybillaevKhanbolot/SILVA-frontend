# Silva: миграция с Supabase на Firebase

Ниже только практические шаги: куда зайти, что нажать, что скопировать и куда вставить.

## 1) Создать Firebase-проект

1. Открой [Firebase Console](https://console.firebase.google.com/).
2. Нажми **Create a project**.
3. Введи имя проекта (например `silva-prod`), нажми **Continue**.
4. Google Analytics можно отключить (для старта не обязательно), **Create project**.

## 2) Подключить Web App и взять конфиг

1. Внутри проекта нажми иконку `</>` (**Web**).
2. App nickname: `silva-web`.
3. Нажми **Register app**.
4. На шаге с кодом найди блок:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`
5. Скопируй значения.
6. Открой файл `public/legacy/js/firebase-config.js` и вставь значения в `window.SILVA_FIREBASE_CONFIG`.

## 3) Включить Authentication (Email/Password)

1. В меню слева: **Build -> Authentication**.
2. Нажми **Get started**.
3. Вкладка **Sign-in method**.
4. Найди **Email/Password**, нажми на него.
5. Включи **Enable**, сохрани.
6. (Опционально) включи **Email link**, если хочешь вход по ссылке.

## 4) Настроить Firestore Database

1. **Build -> Firestore Database**.
2. Нажми **Create database**.
3. Выбери регион (желательно ближе к аудитории).
4. Режим: сначала **Start in test mode** (быстрый запуск), затем заменишь на rules ниже.

### Коллекции, которые использует код

Создавать вручную заранее не обязательно, они появятся автоматически при записи:

- `profiles`
- `properties`
- `favorites`
- `bookings`
- `reviews`
- `loyalty_accounts`
- `loyalty_transactions`
- `feedback_messages`

## 5) Настроить Firebase Storage (аватары)

1. **Build -> Storage**.
2. Нажми **Get started**.
3. Регион лучше тот же, что Firestore.
4. Подтверди создание.

### Если Firebase просит Upgrade для Storage

Можно продолжать без Storage на бесплатном плане:

- в текущем коде есть fallback: аватар сохраняется как Data URL прямо в `profiles.avatar_url` (Firestore);
- значит проект работает даже без Cloud Storage;
- позже, когда появится возможность, можно включить Storage и ничего не ломать в UI.

## 6) Вставить URL backend для оплат (ЮKassa)

В `public/legacy/js/firebase-config.js` есть:

- `window.SILVA_PAYMENT_BASE_URL`

Сюда вставь base URL твоих HTTP-функций (например Firebase Functions):

- `https://europe-west1-<project-id>.cloudfunctions.net`

Код сам соберет:

- `/yookassa-create-payment`
- `/yookassa-payment-status?id=...`

## 7) Чат AI в проде

Рекомендуемый вариант (безопасный): Firebase Function `silvaOpenrouterChat`.

1. Деплой функцию в Firebase: `silvaOpenrouterChat`.
2. В Vercel добавь переменную:
   - `VITE_SILVA_AI_CHAT_URL=https://europe-west1-<project-id>.cloudfunctions.net/silvaOpenrouterChat`
3. Сделай redeploy фронтенда в Vercel.

## 8) Firestore Rules (минимум для старта)

В **Firestore -> Rules** вставь базовый вариант и опубликуй:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }
    function isOwner(uid) { return signedIn() && request.auth.uid == uid; }

    match /profiles/{userId} {
      allow read, write: if isOwner(userId);
    }

    match /properties/{propertyId} {
      allow read: if true;
      allow create: if signedIn();
      allow update, delete: if signedIn() && resource.data.owner_id == request.auth.uid;
    }

    match /favorites/{favId} {
      allow read, write: if signedIn();
    }

    match /bookings/{bookingId} {
      allow read, write: if signedIn();
    }

    match /reviews/{reviewId} {
      allow read: if true;
      allow create, update, delete: if signedIn();
    }

    match /loyalty_accounts/{userId} {
      allow read, write: if isOwner(userId);
    }

    match /loyalty_transactions/{txId} {
      allow read, write: if signedIn();
    }

    match /feedback_messages/{id} {
      allow create: if true;
      allow read, update, delete: if signedIn();
    }
  }
}
```

> Потом правила лучше ужесточить под роли (`admin`, `owner`) и бизнес-ограничения.

## 9) Storage Rules (минимум для аватаров)

В **Storage -> Rules**:

```txt
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /avatars/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 10) Что проверить после настройки

1. `npm install`
2. `npm run dev`
3. Пройти сценарии:
   - регистрация/вход
   - редактирование профиля + загрузка аватара
   - добавление объекта владельцем
   - избранное
   - бронирование + статус
   - отзывы
   - форма обратной связи

## 12) Чтобы ссылка восстановления пароля была корректной и кликабельной

1. Firebase Console -> **Authentication -> Settings -> Authorized domains**
2. Добавь домены, с которых открывается сайт:
   - `localhost`
   - `127.0.0.1`
   - прод-домен (например `silva01.vercel.app`)
3. Firebase Console -> **Authentication -> Templates -> Password reset**
4. Проверь, что в тексте письма есть переменная ссылки (`%LINK%` или стандартный блок ссылки из шаблона Firebase).
5. Не удаляй ссылку из шаблона и не заменяй ее обычным текстом.

В текущем коде reset отправляется с `continueUrl` на `.../legacy/login.html?recover=1`, поэтому после клика пользователь возвращается на страницу входа Silva.

## 13) Загрузка фото объектов через Yandex Object Storage (без Firebase Storage)

Текущая реализация:

- фронт отправляет изображение в `POST /api/storage/upload` (Vite dev middleware);
- middleware загружает файл в Yandex Object Storage и возвращает публичный URL;
- в Firestore сохраняется только URL картинки.

Что нужно в локальном `.env`:

```txt
YC_STORAGE_ENDPOINT=https://storage.yandexcloud.net
YC_STORAGE_REGION=ru-central1
YC_STORAGE_BUCKET=silva
YC_STORAGE_ACCESS_KEY_ID=...
YC_STORAGE_SECRET_ACCESS_KEY=...
```

Важно:

- секретный ключ хранить только в `.env` (не коммитить);
- в бакете включить публичное чтение объектов (`Чтение объектов -> Для всех`);
- если ключи были отправлены в чат, лучше перевыпустить их после настройки.

## 14) Перенос оплаты ЮKassa в Firebase Functions

В репозитории уже добавлена папка `firebase-functions/` с функциями:

- `yookassaCreatePayment`
- `yookassaPaymentStatus`

### 14.1 Установка Firebase CLI и авторизация

```bash
npm i -g firebase-tools
firebase login
```

### 14.2 Инициализация проекта для функций

Из корня проекта:

```bash
firebase use --add
```

Выбери проект `silva-prod`.

### 14.3 Установка зависимостей функций

```bash
cd firebase-functions
npm install
```

### 14.4 Добавить секреты ЮKassa в Firebase Secret Manager

```bash
firebase functions:secrets:set YOOKASSA_SHOP_ID
firebase functions:secrets:set YOOKASSA_SECRET_KEY
```

Введи значения из кабинета ЮKassa.

### 14.5 Деплой функций

```bash
firebase deploy --only functions --project silva-prod
```

После деплоя Firebase покажет URL функций вида:

- `https://europe-west1-silva-prod.cloudfunctions.net/yookassaCreatePayment`
- `https://europe-west1-silva-prod.cloudfunctions.net/yookassaPaymentStatus`

### 14.6 Подключить URL на фронте

В `public/legacy/js/firebase-config.js` укажи:

```js
window.SILVA_PAYMENT_CREATE_URL =
  "https://europe-west1-silva-prod.cloudfunctions.net/yookassaCreatePayment";
window.SILVA_PAYMENT_STATUS_URL =
  "https://europe-west1-silva-prod.cloudfunctions.net/yookassaPaymentStatus?id=";
```

`SILVA_PAYMENT_BASE_URL` можно оставить пустым, когда используются явные `*_URL`.

### 14.7 Проверка

1. Запусти бронь -> нажми оплату.
2. Должен открыться платежный экран ЮKassa.
3. После оплаты возврат в `booking-return.html`.
4. Статус запроса должен подтянуться через `yookassaPaymentStatus`.

## 11) Что важно про миграцию данных

Текущий код уже смотрит в Firebase. Старые данные в Supabase автоматически не переносятся.

Чтобы перенести существующие данные, нужен отдельный export/import-скрипт:

- Supabase -> JSON/CSV
- JSON/CSV -> Firestore/Storage

Если хочешь, в следующем шаге подготовлю скрипт миграции по конкретным таблицам и их полям.
