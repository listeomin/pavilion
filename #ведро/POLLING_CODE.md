# Polling код для удаления

## server/api.php

**Строки 56-59** — удалить полностью:

```php
    if ($action === 'poll') {
        $result = $handler->poll($_GET);
        json($result);
    }
```

## server/ApiHandler.php

**Строки 100-104** — удалить метод `poll()`:

```php
    public function poll(array $query): array {
        $after = isset($query['after_id']) && $query['after_id'] !== '' ? intval($query['after_id']) : null;
        $messages = $this->msgRepo->getSinceId($after);
        return ['messages' => $messages];
    }
```

## server/MessageRepository.php

**Строки 56-63** — удалить метод `getSinceId()`:

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

## public/js/api.js

**Строки 33-38** — удалить функцию `apiPoll()`:

```javascript
export async function apiPoll(API, lastId) {
  const url = API + '?action=poll&after_id=' + encodeURIComponent(lastId);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  return await res.json();
}
```

---

## Как удалять

Открыть каждый файл, найти указанные строки и удалить их целиком.

После удаления запустить тесты:
```bash
bash test.sh
```

Если тесты пройдут — всё ок, polling код больше не используется.
