# Текущий функционал Pavilion

Документация создана для подготовки к миграции с HTTP polling на WebSocket.

## Архитектура

### Backend (PHP)

**Основной API роутер:** `/server/api.php`

Endpoints:
- `init` — инициализация сессии
- `send` — отправка сообщения
- `poll` — **получение новых сообщений (polling)**
- `change_name` — смена имени пользователя
- `upload_image` — загрузка картинки
- `delete_image` — удаление картинки
- `update_message` — редактирование сообщения

**Дополнительные API:**
- `/public/api/animal_profile.php` — управление профилями животных
  - `get` — получить профиль по session_id + emoji
  - `save` — сохранить профиль (с проверкой на мат через `dirty.txt`)
  - Обновляет имя в `sessions` таблице при сохранении

**Репозитории:**
- `MessageRepository.php` — работа с сообщениями в БД
  - `add($sessionId, $name, $text, $metadata)` — добавить сообщение
  - `getAll()` — все сообщения
  - `getLastPage($limit)` — последние N сообщений
  - `getSinceId($after)` — **сообщения после указанного ID (для polling)**
  - `update($messageId, $name, $text, $metadata)` — обновить сообщение
  
- `SessionRepository.php` — управление сессиями
  - `get($id)` — получить сессию
  - `create()` — создать новую сессию с рандомным именем из `user_names.json`
  - `changeName($id)` — сменить имя (берёт свободное из `user_names.json`)

**Сервисы обогащения метадаты:**
- `ImageUploadService.php` — загрузка изображений
- `LinkPreviewService.php` — preview обычных ссылок
- `GitHubService.php` — preview GitHub репозиториев
- `PinterestService.php` — preview Pinterest

**БД:**
- `chat.sqlite` — основная БД (сообщения, сессии)
  - Таблицы: `sessions`, `messages`
- `animal.sqlite` — профили животных (`/public/data/`)
  - Таблица: `animal_profiles` (session_id, emoji, kind, arial, role, lifecycle, bio)

### Python API (Flask)

**Расположение:** `/server/python-api/music_api.py`

**Endpoints:**
- `/api/music/search-artist?q=` — поиск артиста через YTMusic
- `/api/music/search-track?artist=&q=` — поиск трека по артисту
- `/api/music/get-stream?artist=&track=` — получить YouTube URL для стрима
- `/health` — health check

**Технологии:**
- Flask + CORS
- ytmusicapi для поиска
- yt-dlp для извлечения аудио URL (используется на клиенте через `audio-mapping.js`)

### Frontend (Vanilla JS)

**Главный файл:** `/public/js/main.js`

**Polling логика:**
```javascript
const pollInterval = 3000; // 3 секунды
const lastIdRef = { value: 0 }; // последний полученный ID

async function pollLoop() {
  try {
    const data = await apiPoll(API, lastIdRef.value);
    if (data && data.messages && data.messages.length) {
      renderMessages(chatLog, data.messages, lastIdRef);
    }
  } catch (e) {
    // silent
  } finally {
    setTimeout(pollLoop, pollInterval);
  }
}
```

**API клиент:** `/public/js/api.js`
- `apiInit(API, sessionId, COOKIE_NAME)` — инициализация
- `apiSend(API, sessionId, text, metadata)` — отправка
- `apiPoll(API, lastId)` — **polling новых сообщений**
- `apiChangeName(API, sessionId)` — смена имени
- `apiUploadImage(API, file)` — загрузка картинки
- `apiDeleteImage(API, id)` — удаление картинки
- `apiUpdateMessage(API, sessionId, messageId, text, metadata)` — редактирование

**Рендеринг:** `/public/js/render.js`
- `renderMessages(chatLog, messages, lastIdRef)` — отрисовка сообщений
  - Обновляет `lastIdRef.value = Math.max(lastIdRef.value, Number(m.id))`
  - Объединяет последовательные сообщения от одного автора (merging)
- `updateMessage(chatLog, updatedMessage)` — обновление существующего сообщения в DOM
- `renderSystemMessage(chatLog, message, options)` — системные уведомления (со спиннером или кнопками)

**Ключевые модули:**

- **`editor.js`** — редактор с markdown, undo/redo
- **`markdown.js`** — парсинг markdown (bold, italic, code, links)
- **`music.js`** — рендеринг YouTube Music плеера
- **`audio-player.js`** — управление воспроизведением аудио
- **`audio-mapping.js`** — маппинг YouTube videoId → yt-dlp audio URL
- **`github.js`, `pinterest.js`, `link.js`** — превью ссылок
- **`quotes.js`** — цитирование сообщений
  - Клик по автору → вставка quote-tag
  - Клик по цитате → скролл к оригиналу
  - `extractQuoteData()` — извлечение quote-tag из input для отправки
- **`animalProfile.js`** — модальное окно профиля животного
  - 65 животных с поиском
  - Кастомизация: вид, ареал, роль, lifecycle
  - Сохранение в `animal.sqlite`
- **`message-history.js`** — навигация по истории сообщений (↑↓)
  - Поддержка редактирования последнего сообщения
  - Состояние `editingMessageId` для отправки через `update_message`
- **`hotkeys.js`** — горячие клавиши
  - Cmd/Ctrl+B/I/E — форматирование
  - Cmd/Ctrl+Z — undo/redo
  - ↑ — история назад
  - ↓ — очистка / последнее сообщение
  - Ctrl+U — очистить строку
  - Enter — отправить, Shift+Enter — перенос строки
- **`inline-input.js`** — команды inline (например `/music:artist:track`)
  - Автокомплит через Python Music API
  - Вставка music-tag в input
- **`contextMenu.js`** — контекстное меню при выделении текста
  - Копировать
  - Цитировать (вставка quote-tag)
  - Реакции (заглушка)
  - Создать ветку (заглушка)
- **`format.js`** — меню форматирования (B, i, code)
- **`nightshift.js`** — ночной режим
- **`wheel-scroll.js`** — скролл колесом мыши в input для навигации по истории
- **`track-preview.js`** — превью трека при вводе команды `/music:`

**CSS модули:**
- `base.css` — базовые стили
- `chat.css` — стили чата
- `input.css` — стили поля ввода
- `colors.css` — цветовая система (Iris, Wisteria, Nimbus, Cactus)
- `format-menu.css` — меню форматирования
- `inline-input.css` — стили команд
- `music.css`, `audio-player.css`, `track-preview.css` — музыкальный плеер
- `animalProfile.css` — модальное окно профиля
- `contextMenu.css` — контекстное меню
- `nightshift.css` — ночной режим

### Telegram Bot (Node.js)

**Расположение:** `/Users/ufoanima/Dev/bots/@hhrrrr_bot/`

**Главный файл:** `bot.js`

**Архитектура:**
- `PavilionAPI` (`services/pavilion.js`) — HTTP клиент к Pavilion API
  - `init()` — создание сессии
  - `send(text)` — отправка сообщения через API
  - `poll(afterId)` — **тоже использует polling**
  
- `Poller` (`services/poller.js`) — мониторинг новых сообщений
  - Запускается для каждого авторизованного Telegram чата
  - Периодически вызывает `pavilionAPI.poll(lastId)`
  - Пропускает собственные сообщения по `msg.author === username`
  - Отправляет уведомления в Telegram
  - Поддержка картинок через `extractImageUrls()`

- `upload.js` (`services/upload.js`) — загрузка фото из Telegram
  - `downloadAndSave(bot, fileId)` — скачивает фото из Telegram API
  - Сохраняет в `/var/www/html/musceler/`
  - Возвращает публичный URL

**Handlers:**
- `auth.js` — авторизация через пароль
- `text.js` — обработка текстовых сообщений
- `photo.js` — обработка фото (загрузка на сервер → отправка URL в чат)
- `newchat.js` — команда `/newchat` для переинициализации сессии

**Config (`config/config.js`):**
- `telegram.token` — Telegram Bot API токен
- `telegram.password` — пароль для авторизации
- `pavilion.apiUrl` — URL к Pavilion API
- `pavilion.username` — имя бота в чате (для фильтрации своих сообщений)
- `pavilion.pollInterval` — интервал polling (по умолчанию 3000ms)
- `upload.path` — путь для сохранения фото
- `upload.url` — публичный URL для фото

**Важно:** Bot НЕ пишет напрямую в БД, идёт через API endpoints.

## Текущая схема работы Polling

### Веб-клиент:
1. Инициализация: `apiInit()` → получает session_id и начальные сообщения
2. Запуск polling: `setTimeout(pollLoop, 3000)`
3. Цикл:
   - `apiPoll(API, lastIdRef.value)` → GET запрос `poll?after_id=X`
   - Сервер: `MessageRepository::getSinceId($after)` → новые сообщения
   - Клиент: `renderMessages()` → отрисовка + обновление `lastIdRef.value`
   - `setTimeout(pollLoop, 3000)` → следующий цикл

### Telegram Bot:
1. Инициализация: `pavilionAPI.init()` → создаёт сессию
2. Запуск: `new Poller(pavilionAPI, bot, chatId).start()`
3. Цикл:
   - `pavilionAPI.poll(lastId)` → GET запрос `poll?after_id=X`
   - Фильтрация собственных сообщений
   - Отправка уведомлений в Telegram
   - `setTimeout(() => this.poll(), pollInterval)`

### Python Music API:
1. Запускается отдельно как Flask приложение на порту 5001
2. Клиент делает запросы через `fetch()` для автокомплита `/music:` команды
3. Независим от polling, работает по требованию

## Точки интеграции для WebSocket

### Серверная сторона:
1. **Новый WS сервер** (Node.js или PHP Ratchet)
   - Подписка клиентов на события
   - Broadcast новых сообщений всем подключенным
   
2. **Интеграция с `api.php`:**
   - После `MessageRepository::add()` → emit событие в WS
   - После `MessageRepository::update()` → emit событие в WS
   
3. **Обработка событий от Telegram bot:**
   - Bot отправляет через API → `api.php` → WS broadcast

### Клиентская сторона:
1. **Замена `pollLoop()` на WebSocket подключение**
   - `new WebSocket(WS_URL)`
   - Обработчик `onmessage` → `renderMessages()`
   
2. **Сохранить fallback на polling** (опционально)
   - Если WS недоступен или отключился
   
3. **Обработка переподключений:**
   - При разрыве соединения
   - При wake from sleep
   - Синхронизация `lastIdRef` после переподключения

### Telegram Bot:
Варианты:
1. **Оставить polling** — проще всего, bot работает в Node.js
2. **Подключить к WS** — bot как обычный WS клиент
3. **Гибрид** — bot слушает WS события, но отправляет через HTTP API

### Python Music API:
- Не требует изменений, работает независимо
- REST API для поиска треков

## Метаданные сообщений

Типы `metadata`:
- `type: 'music'` — YouTube Music трек
  - `artist`, `track`, `audioUrl`, `videoId`
- `type: 'images'` — загруженные картинки
  - `images: [{id, url}]`
- `type: 'github'` — GitHub preview
  - `url`, `repo`, `description`, `stars`, etc.
- `type: 'pinterest'` — Pinterest preview
  - `url`, `title`, `image`, etc.
- `type: 'link'` — обычный link preview
  - `url`, `title`, `description`, `image`
- `quotes: [...]` — цитаты других сообщений
  - `{messageId, author, text}`

Обогащение метадаты при отправке (приоритет):
1. Client metadata (music, images, quotes)
2. Pinterest preview
3. GitHub preview
4. Generic link preview

## Особенности UI/UX

**Редактирование сообщений:**
- ↓ на пустом поле → восстановить последнее своё сообщение
- Редактирование → отправка через `update_message` endpoint
- Маркер "ред." в конце отредактированного сообщения

**Цитирование:**
- Клик по автору сообщения → вставка quote-tag в input
- Выделение текста + контекстное меню → "Цитировать"
- Клик по автору цитаты → скролл к оригиналу с подсветкой

**Команды:**
- `/music:artist:track` — вставка музыкального трека
- Автокомплит через Python API
- Live preview трека при вводе

**Профили животных:**
- 65 животных в модальном окне
- Поиск по эмодзи/названию
- Кастомизация вида (с проверкой мата)
- Сохранение в отдельной БД
- Обновление имени в чате

**Системные сообщения:**
- Индикатор "отправляется" со спиннером
- Ошибки с кнопкой "[переотправить]"
- Автоудаление при успехе

## Файлы для изменения при миграции на WS

### Backend:
- `/server/api.php` — добавить emit событий в WS после add/update
- Новый файл WS сервера (Node.js + ws или PHP + Ratchet)
- nginx конфиг — проксирование WebSocket
- PM2 ecosystem.config.js — запуск WS сервера

### Frontend:
- `/public/js/main.js` — заменить `pollLoop()` на WS
- `/public/js/api.js` — возможно добавить `apiWsConnect()`
- `/public/js/render.js` — без изменений (используется из WS onmessage)
- `/public/js/config.js` — добавить WS_URL

### Telegram Bot:
- `/Users/ufoanima/Dev/bots/@hhrrrr_bot/services/poller.js` — опционально на WS
- `/Users/ufoanima/Dev/bots/@hhrrrr_bot/bot.js` — инициализация WS подключения
- `/Users/ufoanima/Dev/bots/@hhrrrr_bot/config/config.js` — добавить WS_URL

### Python Music API:
- Без изменений

## Зависимости

### PHP:
- SQLite PDO
- JSON encode/decode
- HTTP headers
- Sessions (cookie-based)

### JavaScript (Frontend):
- ES6 modules
- Fetch API
- WebSocket API (для миграции)
- ContentEditable API
- Selection API

### Node.js (Bot):
- `node-telegram-bot-api`
- `axios`
- WebSocket client (для миграции, например `ws`)
- `dotenv` для конфигурации

### Python (Music API):
- Flask
- flask-cors
- ytmusicapi
- yt-dlp (на клиенте для извлечения audio URL)

## Инфраструктура

- VPS с nginx
- PM2 для процессов (bot, Python API, будущий WS сервер)
- sshfs для локальной разработки
- git для деплоя
- Структура:
  - Pavilion: `/var/www/html/pavilion/`
  - Uploads: `/var/www/html/musceler/`
  - Bot: отдельный репозиторий

## Конфигурация

**Base paths:**
- Локально: `/pavilion/` или `/` (auto-detect в `index.php`)
- Продакшн: `/pavilion/`

**API endpoints:**
- PHP API: `https://hhrrr.ru/pavilion/server/api.php`
- Python Music API: `http://localhost:5001/api/music/...`
- Animal Profile API: `https://hhrrr.ru/pavilion/public/api/animal_profile.php`

**Polling intervals:**
- Веб-клиент: 3000ms
- Telegram bot: 3000ms (конфигурируется)

## Инфраструктурные заметки

**Bot newchat handler:**
- Архивирует БД в формате `chathistory_DD-MM-YY.sqlite`
- Отправляет архив в Telegram
- Удаляет старую БД (авто-создаётся при обращении)
- Переинициализирует сессию и poller

## Особенности работы с БД

**SQLite:**
- Автоматическое пересоздание при повреждении (см. `db.php`)
- Две отдельные БД: `chat.sqlite` (основная), `animal.sqlite` (профили)
- Транзакции не используются (однопользовательский чат)

**Сессии:**
- 32-символьный hex ID
- Cookie-based (`chat_session_id`)
- Имя из пула `user_names.json` (животное + случайное слово)
- Автоматическая ротация имён при конфликтах

**Сообщения:**
- Auto-increment ID
- JSON metadata
- ISO 8601 timestamps
- Сортировка по ID (не по timestamp)

---

## План Unit-тестирования

### Цель
Покрыть тестами критичную логику ПЕРЕД миграцией на WebSocket, чтобы:
1. Зафиксировать текущее поведение
2. Обнаружить регрессии после изменений
3. Упростить рефакторинг

### Приоритет 1: Backend (PHP)

**MessageRepository** — критично для polling/WS:
```
✓ add() возвращает сообщение с корректной структурой
✓ getSinceId(null) возвращает все сообщения
✓ getSinceId(5) возвращает только сообщения с id > 5
✓ update() обновляет только своё сообщение
✓ update() возвращает null для чужого сообщения
✓ metadata корректно сериализуется/десериализуется
```

**SessionRepository:**
```
✓ create() генерирует уникальный ID
✓ get() возвращает сессию или null
✓ changeName() меняет имя из пула
```

**api.php endpoints:**
```
✓ init — создаёт сессию, возвращает messages
✓ send — требует session_id, сохраняет metadata
✓ poll — возвращает messages после after_id
✓ update_message — проверяет авторство
```

### Приоритет 2: Frontend (JavaScript)

**api.js** — HTTP клиент:
```
✓ apiPoll() формирует правильный URL
✓ apiSend() отправляет JSON с metadata
✓ apiUpdateMessage() отправляет messageId
```

**render.js:**
```
✓ renderMessages() обновляет lastIdRef
✓ renderMessages() объединяет сообщения одного автора
✓ updateMessage() находит элемент по data-message-id
✓ renderQuote() генерирует корректный HTML
```

**message-history.js:**
```
✓ addMessage() сохраняет с messageId
✓ getPrevious() фильтрует по автору
✓ getLastForAuthor() устанавливает editingMessageId
```

**quotes.js:**
```
✓ extractQuoteData() возвращает массив цитат
✓ extractQuoteData() возвращает null без quote-tag
```

### Приоритет 3: Telegram Bot (Node.js)

**PavilionAPI:**
```
✓ init() сохраняет sessionId
✓ poll() передаёт afterId в запрос
✓ send() выбрасывает ошибку без sessionId
```

**Poller:**
```
✓ start() устанавливает lastId на максимальный ID
✓ poll() пропускает собственные сообщения
✓ notifyUser() отправляет фото если есть URL картинки
```

**parser.js:**
```
✓ extractImageUrls() находит URL картинок
✓ extractImageUrls() возвращает [] без картинок
```

### Инструменты

**PHP:**
- PHPUnit 10+
- In-memory SQLite для изоляции
- Мокирование через Mockery (опционально)

**JavaScript (Frontend):**
- Vitest или Jest + jsdom
- Testing Library для DOM

**Node.js (Bot):**
- Vitest или Jest
- Мокирование axios, node-telegram-bot-api

### Структура тестов

```
pavilion/
├── tests/
│   └── php/
│       ├── MessageRepositoryTest.php
│       ├── SessionRepositoryTest.php
│       └── ApiTest.php
└── public/js/__tests__/
    ├── api.test.js
    ├── render.test.js
    ├── message-history.test.js
    └── quotes.test.js

@hhrrrr_bot/
└── __tests__/
    ├── pavilion.test.js
    ├── poller.test.js
    └── parser.test.js
```

### Этапы внедрения

1. **Неделя 1:** PHP тесты (MessageRepository, SessionRepository)
2. **Неделя 2:** PHP тесты (api.php endpoints)
3. **Неделя 3:** JS тесты (api.js, render.js)
4. **Неделя 4:** Bot тесты + CI интеграция

### Метрики успеха

- Coverage: 70%+ для критичных модулей
- Все тесты проходят перед merge в main
- Время выполнения < 30 секунд
