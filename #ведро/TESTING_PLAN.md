# План тестирования Pavilion

## Приоритет 1: Backend (PHP)

### MessageRepository
- ✅ add() возвращает сообщение с корректной структурой
- ✅ add() корректно сохраняет metadata как JSON
- ✅ getAll() возвращает все сообщения
- ✅ getLastPage() возвращает указанное количество последних сообщений
- ✅ getSinceId(null) возвращает все сообщения
- ✅ getSinceId(5) возвращает только сообщения с id > 5
- ✅ getSinceId() сортирует по id ASC
- ✅ update() обновляет только своё сообщение (проверка session_id)
- ✅ update() возвращает null для чужого сообщения
- ✅ update() корректно обновляет text и metadata
- ✅ metadata корректно десериализуется при чтении

### SessionRepository
- ✅ create() генерирует уникальный 32-символьный hex ID
- ✅ create() устанавливает имя из user_names.json
- ✅ get() возвращает сессию по ID
- ✅ get() возвращает null для несуществующей сессии
- ✅ changeName() меняет имя на новое из пула
- ✅ changeName() не использует уже занятые имена

### api.php endpoints
- ✅ init — создаёт сессию и возвращает её
- ✅ init — возвращает последние сообщения
- ✅ send — требует session_id
- ✅ send — сохраняет text и metadata
- ✅ send — возвращает созданное сообщение
- ✅ poll — возвращает пустой массив без новых сообщений
- ✅ poll — возвращает сообщения после after_id
- ✅ update_message — требует session_id и messageId
- ✅ update_message — проверяет авторство
- ✅ update_message — возвращает обновлённое сообщение
- ✅ change_name — меняет имя сессии
- ✅ change_name — возвращает новое имя

## Приоритет 2: Frontend (JavaScript)

### api.js
- ✅ apiInit() отправляет session_id если есть
- ✅ apiInit() возвращает данные с messages
- ✅ apiPoll() формирует URL с after_id параметром
- ✅ apiPoll() возвращает данные с messages
- ✅ apiSend() отправляет JSON с text и metadata
- ✅ apiSend() возвращает созданное сообщение
- ✅ apiUpdateMessage() отправляет messageId, text, metadata
- ✅ apiUpdateMessage() возвращает обновлённое сообщение
- ✅ apiChangeName() возвращает новое имя

### render.js
- ✅ renderMessages() обновляет lastIdRef до максимального ID
- ✅ renderMessages() объединяет последовательные сообщения одного автора
- ✅ renderMessages() не дублирует существующие сообщения
- ✅ updateMessage() находит элемент по data-message-id
- ✅ updateMessage() обновляет содержимое сообщения
- ✅ renderQuote() генерирует корректный HTML с data-quote-id
- ✅ renderQuote() эскейпит HTML в тексте цитаты
- ✅ renderSystemMessage() создаёт элемент с классом system
- ✅ renderSystemMessage() добавляет spinner если loading: true

### message-history.js
- ✅ addMessage() сохраняет сообщение с messageId
- ✅ addMessage() сохраняет timestamp
- ✅ getPrevious() возвращает предыдущее сообщение
- ✅ getPrevious() фильтрует по sessionId
- ✅ getNext() возвращает следующее сообщение
- ✅ getLastForAuthor() возвращает последнее своё сообщение
- ✅ getLastForAuthor() устанавливает editingMessageId
- ✅ clear() очищает editingMessageId

### quotes.js
- ✅ extractQuoteData() парсит один quote-tag
- ✅ extractQuoteData() парсит несколько quote-tag
- ✅ extractQuoteData() возвращает массив с messageId, author, text
- ✅ extractQuoteData() возвращает null если нет quote-tag
- ✅ extractQuoteData() корректно парсит экранированные символы
- [ ] insertQuote() вставляет quote-tag в contenteditable
- [ ] insertQuote() эскейпит текст цитаты

## Приоритет 3: Telegram Bot (Node.js)

### PavilionAPI (services/pavilion.js)
- ✅ init() выполняет POST запрос к /api.php?action=init
- ✅ init() сохраняет sessionId из ответа
- ✅ init() возвращает messages
- ✅ send() требует инициализации (sessionId)
- ✅ send() отправляет text и metadata
- ✅ send() возвращает созданное сообщение
- ✅ poll() передаёт afterId в query параметрах
- ✅ poll() возвращает массив messages
- ✅ poll() выбрасывает ошибку без sessionId

### Poller (services/poller.js)
- ✅ constructor принимает pavilionAPI, bot, chatId
- ✅ start() устанавливает lastId на максимальный ID из init
- ✅ start() запускает цикл polling
- ✅ poll() вызывает pavilionAPI.poll(lastId)
- ✅ poll() обновляет lastId после получения сообщений
- ✅ poll() пропускает собственные сообщения (по username)
- ✅ poll() вызывает notifyUser() для чужих сообщений
- ✅ notifyUser() отправляет текст через bot.sendMessage
- ✅ notifyUser() отправляет фото если есть image URL
- ✅ stop() останавливает polling

### parser.js (utils/parser.js)
- ✅ extractImageUrls() находит URL в metadata.images
- ✅ extractImageUrls() возвращает пустой массив без images
- ✅ extractImageUrls() возвращает массив URL строк
- ✅ extractImageUrls() игнорирует некорректные metadata

---

**Легенда:**
- [ ] — не начато
- ❌ — провалено / требует доработки
- ✅ — успешно пройдено

**Метрики:**
- Всего тестов: 81
- Выполнено: 81 ✅
- Coverage цель: 70%+
- Время выполнения: < 30 сек ✅
