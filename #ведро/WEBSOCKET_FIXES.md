# WebSocket Migration Fixes

Обнаруженные проблемы после миграции с HTTP polling на WebSocket.

## Критичные (блокируют работу)

### ❌ 1. Production WebSocket URL
**Файл:** `public/js/config.js`
**Проблема:** Хардкод `ws://localhost:3001` не работает на продакшене
**Фикс:**
```javascript
const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_HOST = window.location.hostname === 'localhost' 
  ? 'localhost:3001' 
  : window.location.host;
const WS_PATH = BASE_PATH + '/ws';

export const CONFIG = {
  BASE_PATH: BASE_PATH,
  API_PATH: BASE_PATH + '/server/api.php',
  WS_URL: `${WS_PROTOCOL}//${WS_HOST}${WS_PATH}`
};
```

### ❌ 2. nginx WebSocket location
**Файл:** `nginx-pavilion.conf`
**Проблема:** WS доступен на `/ws`, но должен быть `/pavilion/ws`
**Фикс:**
```nginx
location /pavilion/ws {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 86400;
}
```

### ⚠️ 3. Fallback на polling отсутствует
**Файл:** `public/js/main.js`
**Проблема:** Если WS не подключится — чат "мёртв"
**Фикс:** Добавить fallback:
```javascript
let isFallbackMode = false;
let pollInterval;

function setupWebSocket() {
  wsClient = new WebSocketClient(CONFIG.WS_URL, sessionId);
  
  wsClient.on('max_reconnect_attempts', () => {
    console.error('[Main] WS failed, falling back to polling');
    isFallbackMode = true;
    startPolling();
  });
  
  wsClient.connect();
}

function startPolling() {
  pollInterval = setInterval(async () => {
    try {
      const data = await apiPoll(API, lastIdRef.value);
      if (data && data.messages && data.messages.length) {
        renderMessages(chatLog, data.messages, lastIdRef);
      }
    } catch (e) {
      console.error('[Polling] Error:', e);
    }
  }, 3000);
}
```

## Средние (работает, но неоптимально)

### 🔶 4. Telegram bot на polling
**Проблема:** Bot использует HTTP polling вместо WS
**Решение:** Два варианта:
1. Оставить polling (проще)
2. Подключить к WS как обычный клиент

**Рекомендация:** Оставить polling для бота. Причины:
- Bot работает в Node.js (легко держать long-polling)
- Не критично для UX (бот не в реальном времени)
- Меньше moving parts

### 🔶 5. BroadcastService timeout 1 sec
**Файл:** `server/BroadcastService.php`
**Проблема:** Если WS сервер упал — каждый send/update блокируется на 1 сек
**Фикс:** Уменьшить timeout до 100ms:
```php
'timeout' => 0.1 // 100ms
```

### 🔶 6. WebSocket reconnect strategy
**Файл:** `public/js/websocket-client.js`
**Проблема:** Exponential backoff хорош, но после 5 попыток = game over
**Улучшение:** Добавить периодические retry после max_reconnect:
```javascript
if (this.reconnectAttempts < this.maxReconnectAttempts) {
  // Current logic
} else {
  // New: Keep trying every 30 seconds indefinitely
  console.log('[WS] Max attempts reached, will retry every 30s');
  setTimeout(() => {
    this.reconnectAttempts = 0; // Reset counter
    this.connect();
  }, 30000);
}
```

## Низкие (nice to have)

### 💡 7. Heartbeat на клиенте
**Файл:** `public/js/websocket-client.js`
**Улучшение:** Клиент может отправлять ping для проверки соединения

### 💡 8. Синхронизация lastIdRef после переподключения
**Проблема:** Если пользователь оффлайн 10 минут, при возврате могут быть пропуски
**Решение:** При `auth_ok` запросить `getSinceId(lastIdRef.value)` через HTTP API

## Тестирование

### Unit-тесты (уже есть):
- ✅ `MessageRepository`
- ✅ `SessionRepository`  
- ✅ `ApiHandler`
- ✅ Frontend API/render/quotes/history

### Integration-тесты (нужно добавить):
- [ ] WS сервер принимает подключения с session_id
- [ ] WS сервер отправляет `auth_ok`
- [ ] Broadcast `/broadcast` работает корректно
- [ ] BroadcastService вызывается после add/update

### Manual тесты:
- [ ] Открыть 2 вкладки — проверить real-time синхронизацию
- [ ] Отключить WS сервер — проверить fallback на polling
- [ ] Telegram bot — отправить сообщение через API → появляется ли в UI
- [ ] Production deploy — проверить wss:// работает

## Приоритеты внедрения

### Неделя 1 (критично):
1. Фикс #1 — Production WS_URL
2. Фикс #2 — nginx location
3. Deploy на прод + мануальные тесты

### Неделя 2 (важно):
4. Фикс #3 — Fallback на polling
5. Фикс #5 — BroadcastService timeout
6. Integration-тесты для WS

### Неделя 3 (улучшения):
7. Фикс #6 — Улучшенная стратегия reconnect
8. Фикс #8 — Синхронизация после офлайна

---

## Deployment Checklist

```bash
# 1. Update code
cd /var/www/html/pavilion
git pull origin main

# 2. Restart WS server
pm2 restart pavilion-ws

# 3. Check WS health
curl http://localhost:3002/health

# 4. Reload nginx
sudo nginx -t && sudo systemctl reload nginx

# 5. Monitor logs
pm2 logs pavilion-ws --lines 50
tail -f /var/log/nginx/error.log
```
