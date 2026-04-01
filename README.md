# Silva - Маркетплейс загородного отдыха

Проект переведен на React + Vite с маршрутизацией через `react-router-dom`.
Текущий внешний вид, анимации и логика сохранены за счет подключения legacy-страниц через роутинг.

## Запуск

```bash
npm install
npm run dev
```

## Структура проекта

Статика legacy-страниц живёт **только** в `public/legacy/` (HTML, `css/`, `js/`, `images/`). Vite копирует содержимое `public/` в корень сборки, поэтому в продакшене пути вида `/legacy/...` совпадают с файлами из этой папки.

Папка `dist/` создаётся командой `npm run build` и в репозиторий не коммитится (см. `.gitignore`) — дублировать туда файлы вручную не нужно.

```text
/
├── index.html              # Точка входа Vite/React
├── src/                    # Код приложения React
│   ├── main.jsx
│   ├── App.jsx
│   ├── config/routes.js    # Маршруты → legacy HTML
│   ├── pages/LegacyFramePage.jsx
│   └── styles/app.css      # Стили оболочки React (не путать с legacy CSS)
└── public/
    └── legacy/             # Старые страницы и их ассеты (единственный источник)
```

