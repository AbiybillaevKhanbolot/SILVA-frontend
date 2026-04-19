#!/usr/bin/env python3
"""Render Silva_react directory tree to docs/silva-react-structure.png (requires Pillow)."""
from __future__ import annotations

import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Install: pip install Pillow", file=sys.stderr)
    sys.exit(1)

TREE = r"""Silva_react/
│
├── public/                      # статика; Vite кладёт это в dist
│   └── legacy/                  # весь UI Silva: страницы, стили, скрипты
│       ├── *.html               # главная, каталог, объект, бронь, ЛК, владелец, админ …
│       ├── css/
│       ├── images/
│       └── js/
│           └── components/      # шапка, футер и др. общие вставки
│
├── src/                         # React + Vite: только оболочка и роутинг
│   │
│   ├── config/                  # legacyRoutes: путь URL → файл HTML
│   │
│   ├── pages/                   # загрузка legacy-страниц во фрейме/роуте
│   │   └── LegacyFramePage.jsx
│   │
│   ├── styles/
│   │
│   ├── App.jsx
│   └── main.jsx
│
├── dist/                        # результат npm run build (деплой)
│
├── docs/                        # инструкции: ЮKassa, деплой, миграции
│
├── supabase/                    # Edge Functions в корне репозитория
│   └── functions/
│       ├── yookassa-create-payment/
│       └── yookassa-payment-status/
│
├── SILVA-backend/               # миграции PostgreSQL и доки бэкенда (отдельный блок)
│   ├── supabase/
│   │   ├── migrations/          # SQL: таблицы, RLS, индексы
│   │   └── functions/           # те же функции оплаты для деплоя из backend
│   ├── docs/
│   └── scripts/
│
├── index.html                   # точка входа Vite
├── vite.config.js               # сборка, legacy, dev-прокси оплаты
├── vite-plugin-yookassa-dev-api.js
├── package.json
├── package-lock.json
├── .env.example
└── README.md"""


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    paths = [
        "/System/Library/Fonts/Supplemental/Menlo.ttc",
        "/System/Library/Fonts/Menlo.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    ]
    for p in paths:
        if Path(p).exists():
            try:
                return ImageFont.truetype(p, size=size)
            except OSError:
                continue
    return ImageFont.load_default()


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    out = root / "docs" / "silva-react-structure.png"
    out.parent.mkdir(parents=True, exist_ok=True)

    font = load_font(20)
    lines = TREE.splitlines()
    padding = 36
    line_height = 26
    tmp = Image.new("RGB", (1, 1))
    draw = ImageDraw.Draw(tmp)
    max_w = 0
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        max_w = max(max_w, bbox[2] - bbox[0])
    w = max_w + padding * 2
    h = len(lines) * line_height + padding * 2

    img = Image.new("RGB", (w, h), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    y = padding
    for line in lines:
        draw.text((padding, y), line, fill=(18, 18, 18), font=font)
        y += line_height

    img.save(out, format="PNG", optimize=True)
    print(out)


if __name__ == "__main__":
    main()
