# ЮKassa на продакшене через Supabase Edge Functions

Локально оплата идёт через прокси Vite (`/api/yookassa/*`). На статическом хостинге этого нет — нужны функции с секретом **только на сервере**.

## 1. Секреты в Supabase (что «вставить»)

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard) → ваш проект.
2. **Project Settings** → **Edge Functions** → секция **Secrets** (или **Manage secrets** в CLI).
3. Добавьте два секрета (имена **точно** такие):

| Name | Value |
|------|--------|
| `YOOKASSA_SHOP_ID` | Ваш shopId из кабинета ЮKassa (например `1329080`) |
| `YOOKASSA_SECRET_KEY` | Секретный ключ магазина (начинается с `test_` или `live_`) |

Сохраните. **Не** кладите ключ в репозиторий и не вставляйте в фронт.

## 2. Развернуть функции из репозитория

В корне проекта уже есть каталоги:

- `supabase/functions/yookassa-create-payment/`
- `supabase/functions/yookassa-payment-status/`

Установите [Supabase CLI](https://supabase.com/docs/guides/cli), войдите и выполните:

```bash
supabase link --project-ref ВАШ_PROJECT_REF
supabase functions deploy yookassa-create-payment --no-verify-jwt
supabase functions deploy yookassa-payment-status --no-verify-jwt
```

`--no-verify-jwt` — чтобы фронт мог вызывать функции без заголовка `Authorization` (демо). Для боя лучше включить проверку JWT и передавать сессию пользователя из `booking.js`.

После деплоя URL будут вида:

- `https://ВАШ_REF.supabase.co/functions/v1/yookassa-create-payment`
- `https://ВАШ_REF.supabase.co/functions/v1/yookassa-payment-status?id=PAYMENT_ID`

## 3. Подключить фронт (React + iframe)

Перед загрузкой приложения (например в `index.html` или в корне `App` до роутера) задайте глобально:

```html
<script>
  window.SILVA_PAYMENT_URLS = {
    create: "https://ВАШ_REF.supabase.co/functions/v1/yookassa-create-payment",
    status: "https://ВАШ_REF.supabase.co/functions/v1/yookassa-payment-status?id="
  };
</script>
```

Страница `booking` в iframe читает `window.parent.SILVA_PAYMENT_URLS`, если задано у родителя.

### CORS и запросы с другого домена

Функции отдают `Access-Control-Allow-Origin: *`. Если браузер ругается на `credentials`, при вызове Edge Functions с другого origin в `booking.js` / `booking-return.js` может понадобиться заменить `credentials: 'same-origin'` на `credentials: 'omit'` и при необходимости добавить заголовки Supabase:

`Authorization: Bearer ВАШ_ANON_KEY` и `apikey: ВАШ_ANON_KEY` (anon ключ публичный, его можно зашить в фронт).

## 4. return_url в ЮKassa

Функция `yookassa-create-payment` подставляет `return_url` из заголовка запроса `Origin` (или `Referer`). Убедитесь, что с продакшена уходит правильный Origin, иначе гость вернётся не на тот домен.

## 5. Webhook (по желанию)

Надёжнее подтверждать оплату по [уведомлениям ЮKassa](https://yookassa.ru/developers/using-api/webhooks), а не только по редиректу. Тогда добавьте третью Edge Function, URL укажите в кабинете ЮKassa → Интеграция → HTTP-уведомления.

## 6. Проверка RLS

После оплаты бронь создаётся из браузера через `createBooking` в Supabase. В таблице `bookings` должны быть политики, разрешающие `insert` для авторизованного пользователя.
