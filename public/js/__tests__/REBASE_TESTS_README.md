# Rebase Tests - Documentation

## Проблема

После выполнения команды `/rebase` первое сообщение не отправляется и показывается ошибка:
"🛳️ капитанская рубка: у нас проблемы. [переотправить]"

Чтобы продолжить писать сообщения, пользователь вынужден обновить страницу.

## Причина

1. Пользователь инициализируется с сессией `old-session-123`
2. Выполняется команда `/rebase`
3. Сервер очищает базу данных (включая все сессии)
4. WebSocket клиент получает событие `rebase` и обновляет UI
5. **НО** клиент продолжает использовать старый `session_id`
6. При попытке отправить сообщение сервер возвращает 403 "invalid session"
7. UI показывает ошибку

## Решение

После получения WebSocket события `rebase` клиент должен:

1. Вызвать `apiInit()` для получения новой сессии
2. Обновить `sessionId` переменную
3. Переподключить WebSocket с новым `session_id`
4. Обновить UI (имя пользователя, эмодзи)

## Структура тестов

### JavaScript тесты

**rebase-flow.test.js**
- Тестирует API endpoints для rebase
- Проверяет lifecycle сессий
- Базовая функциональность

**rebase-integration.test.js**
- Интеграционные тесты полного flow
- Воспроизводит баг
- Демонстрирует решение
- Edge cases

**websocket-rebase.test.js**
- WebSocket клиент и события rebase
- Reconnection логика
- Session ID обновление

**main-rebase.test.js**
- Интеграция в main.js
- DOM манипуляции
- Form submission

**rebase-ui-state.test.js**
- Состояние UI компонентов
- Input/button states
- Error messages
- User experience

### PHP тесты

**ApiHandlerRebaseTest.php**
- Серверная логика rebase
- Инвалидация старых сессий
- Создание новых сессий
- Broadcast события

## Запуск тестов

```bash
# JavaScript тесты
npm test

# Конкретный файл
npm test rebase-integration

# PHP тесты
./test-php.sh

# Конкретный класс
./vendor/bin/phpunit tests/php/ApiHandlerRebaseTest.php
```

## Ожидаемое поведение

### До исправления (текущее)

1. User: `/rebase` → ✅ Работает
2. Server: Очищает БД → ✅ Работает
3. Client: Получает WS event → ✅ Работает
4. Client: Очищает UI → ✅ Работает
5. User: Отправляет сообщение → ❌ **ОШИБКА** "у нас проблемы"
6. User: Обновляет страницу → ✅ Работает
7. User: Отправляет сообщение → ✅ Работает

### После исправления (ожидаемое)

1. User: `/rebase` → ✅ Работает
2. Server: Очищает БД → ✅ Работает
3. Client: Получает WS event → ✅ Работает
4. Client: **Вызывает apiInit()** → ✅ **НОВОЕ**
5. Client: **Обновляет session_id** → ✅ **НОВОЕ**
6. Client: Очищает UI → ✅ Работает
7. User: Отправляет сообщение → ✅ **РАБОТАЕТ БЕЗ ПЕРЕЗАГРУЗКИ**

## Изменения в коде (для продакшн)

### main.js

```javascript
wsClient.on('rebase', async (data) => {
  console.log('[Main] Rebase via WS:', data);
  
  // 1. Clear chat
  chatLog.innerHTML = '';
  lastIdRef.value = 0;
  
  // 2. RE-INITIALIZE SESSION
  try {
    const initData = await apiInit(API, null, COOKIE_NAME);
    sessionId = initData.session_id;
    myName = initData.name;
    
    // Update UI
    const emoji = myName.split(' ')[0];
    userEmojiEl.textContent = emoji;
    
    // 3. RECONNECT WEBSOCKET with new session_id
    wsClient.disconnect();
    wsClient = new WebSocketClient(CONFIG.WS_URL, sessionId);
    setupWebSocket(); // Re-setup listeners
    wsClient.connect();
    
  } catch (error) {
    console.error('[Main] Failed to re-init after rebase:', error);
    renderSystemMessage(chatLog, 'Не удалось переподключиться после rebase', {});
  }
  
  // 4. Render messages from rebase event
  renderMessages(chatLog, data.messages || [], lastIdRef);
});
```

### websocket-client.js

Добавить метод для переподключения:

```javascript
reconnectWithNewSession(newSessionId) {
  this.disconnect();
  this.sessionId = newSessionId;
  this.connect();
}
```

## Тестовое покрытие

- ✅ API rebase endpoint
- ✅ Session invalidation after rebase
- ✅ New session creation after rebase
- ✅ WebSocket rebase event handling
- ✅ WebSocket reconnection
- ✅ UI state updates
- ✅ Error handling
- ✅ Edge cases (concurrent rebases, rapid sends)

## Примечания

- Тесты используют in-memory SQLite для изоляции
- WebSocket моки для тестирования событий
- Fetch моки для API calls
- Все тесты изолированы и не требуют реального сервера
