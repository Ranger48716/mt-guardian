# MT Guardian

Редактор раскаток по картам Мира танков + Telegram Mini App.

## Стек

- Vite + React + TypeScript
- Данные в `public/data/catalog.json` (без отдельного бэкенда)
- Админка пишет файлы только через `npm run dev` (локальный API)

## Быстрый старт

```bash
cp .env.example .env
npm install
npm run dev
```

- Mini App: http://localhost:5173/
- Админка: http://localhost:5173/admin/login (пароль из `.env`, по умолчанию `admin`)

## Как работать

1. Админка → выбрать карту из фиксированного списка (из клиента)
2. Создать **версию** гайда
3. В редакторе: группы (ТТ/СТ/ПТ/ЛТ + название), респ 1/2, точки и описания
4. **Сохранить версию** (или «Сохранить и опубликовать»)
5. Закоммить `public/data/catalog.json` (+ карты уже в `public/maps/`)

### Обновить карты из клиента

```bash
npm run extract-maps
```

Читает `C:\Games\Tanki`: `mmap.dds` + русские имена из `arenas.mo`.

## Telegram Mini App

URL для BotFather (v1.0):

**https://ranger48716.github.io/mt-guardian/**

1. Дождись зелёного workflow **Deploy GitHub Pages**
2. BotFather → бот → Menu Button / Web App URL = эта ссылка
3. Открывай из Telegram

Старый HTML-миниапп (`map-guard-miniapp`) не трогаем.

## Структура

- `/` — Mini App (шапка «Карты», поиск, гайд)
- `/admin` — редактор (логин/пароль)
