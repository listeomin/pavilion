# 🧹 Чистка после миграции на WebSocket

## Файлы на удаление

### Документация (устаревшая)
```bash
rm CURRENT_FUNCTIONALITY.md
rm TESTING_PLAN.md
rm TESTING_README.md
rm WEBSOCKET_FIXES.md
rm FIXES_STATUS.md
```

### Скрипты миграции
```bash
rm migrate.php
rm ._migrate.php
rm migrate_add_metadata.php
rm test-fallback.sh
```

## Код на удаление

### server/api.php
Удалить endpoint `poll` (строки 56-59):
```php
if ($action === 'poll') {
    $result = $handler->poll($_GET);
    json($result);
}
```

### server/ApiHandler.php
Удалить метод `poll()` (строки 86-90):
```php
public function poll(array $query): array {
    $after = isset($query['after_id']) && $query['after_id'] !== '' ? intval($query['after_id']) : null;
    $messages = $this->msgRepo->getSinceId($after);
    return ['messages' => $messages];
}
```

### server/MessageRepository.php
Удалить метод `getSinceId()` (строки 52-59):
```php
public function getSinceId(?int $afterId): array {
    if ($afterId === null) {
        return $this->getAll();
    }
    $stmt = $this->db->prepare('SELECT id, session_id, author, text, metadata, created_at FROM messages WHERE id > :after ORDER BY id ASC');
    $stmt->execute([':after' => $afterId]);
    return $this->decodeMetadata($stmt->fetchAll(PDO::FETCH_ASSOC));
}
```

### public/js/api.js
Удалить функцию `apiPoll()` (строки 33-38):
```javascript
export async function apiPoll(API, lastId) {
  const url = API + '?action=poll&after_id=' + encodeURIComponent(lastId);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  return await res.json();
}
```

## ✅ Обновлено

- `README.md` — новая структура с акцентом на WebSocket архитектуру

## 📝 Что ещё можно сделать

1. **Удалить тесты polling** — если есть тесты для `apiPoll()`, `poll()`, `getSinceId()`
2. **Проверить импорты** — `apiPoll` может импортироваться где-то в тестах
3. **Архивировать документацию** — переместить старые MD файлы в `/docs/archive/`
4. **Обновить комментарии** — проверить упоминания "polling" в комментариях
5. **Changelog** — добавить запись о миграции на WebSocket

## 🎯 Следующие шаги

После удаления запустить тесты:
```bash
./run_tests.sh
```

Если всё ок — коммит:
```bash
git add .
git commit -m "chore: удалён polling код после миграции на WebSocket"
```
