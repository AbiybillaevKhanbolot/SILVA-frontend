# Silva - Маркетплейс загородного отдыха

Проект переведен на React + Vite с маршрутизацией через `react-router-dom`.
Текущий внешний вид, анимации и логика сохранены за счет подключения legacy-страниц через роутинг.

## Запуск

```bash
npm install
npm run dev
```

## Новая структура

```text
/
├── index.html              # Единая точка входа Vite/React
├── src/
│   ├── main.jsx            # Инициализация React
│   ├── App.jsx             # Роутинг приложения
│   ├── config/routes.js    # Карта маршрутов -> legacy страниц
│   ├── pages/
│   │   └── LegacyFramePage.jsx
│   └── styles/app.css
└── public/legacy/          # Существующие HTML/CSS/JS/изображения без изменения
```

