# 🦜 Pavilion

Минималистичный анонимный чат с real-time синхронизацией.

**https://hhrrr.ru/pavilion/**

---

## Архитектура и стек

**Backend**
- PHP 8.3+ — REST API, обогащение метаданных (GitHub, Pinterest, link preview)
- Node.js — WebSocket server для real-time broadcast
- SQLite — хранение сессий и сообщений

**Frontend**
- Vanilla JavaScript (ES6 modules) — модульная архитектура без фреймворков
- WebSocket client с автореконнектом
- ContentEditable API для WYSIWYG редактора

**Инфраструктура**
- nginx — reverse proxy для HTTP и WebSocket
- PM2 — управление процессами на production

**Ключевые модули:**
- `websocket-client.js` — управление WS соединением
- `api.js` — HTTP запросы к REST API
- `render.js` — рендеринг сообщений в DOM
- `editor.js` — WYSIWYG редактор с undo/redo
- `markdown.js` — парсинг Markdown
- `message-history.js` — навигация по истории (↑↓)
- `quotes.js` — цитирование сообщений
- `animalProfile.js` — профили животных (65 видов)

**Как это работает:**

1. **Инициализация** — PHP API создаёт сессию с рандомным именем, возвращает последние 50 сообщений
2. **WebSocket подключение** — клиент подписывается на события, server аутентифицирует
3. **Отправка** — сообщение сохраняется в SQLite → BroadcastService → WebSocket broadcast всем клиентам
4. **Обогащение** — PHP парсит URL, добавляет metadata (title, description, image) через GitHub/Pinterest/LinkPreview сервисы
5. **Real-time синхронизация** — все браузеры мгновенно получают `message_new`/`message_updated` события
6. **Редактирование** — проверка авторства в MessageRepository → broadcast обновлённого сообщения

---

## Features в разработке

- 🔒 **Приватные комнаты** — изолированные чаты
- 🔑 **Telegram Widget Auth** — авторизация через Telegram с JWT
- 🤖 **Telegram Bot на WebSocket** — миграция бота с polling
- 📱 **Push уведомления** — desktop notifications

---

## Быстрый старт

### Локальная разработка

```bash
git clone https://github.com/listeomin/pavilion.git
cd pavilion

composer install
npm install
cd ws-server && npm install && cd ..

chmod +x dev.sh
./dev.sh

open http://localhost:8080
```

### Тестирование

```bash
./vendor/bin/phpunit tests/php --testdox
npm test
```

### Production

```bash
pm2 start ecosystem.config.js
# nginx конфигурация: nginx-pavilion.conf
```

---

## Лицензия

MIT
