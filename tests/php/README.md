# MessageRepositoryTest

Создан полный набор тестов для `MessageRepository.php`

## Запуск

```bash
cd /Users/ufoanima/Dev/personal/pavilion
composer install
./vendor/bin/phpunit tests/php/MessageRepositoryTest.php
```

## Покрытие

Все 11 тестов из плана:
- ✅ add() возвращает корректную структуру
- ✅ add() сохраняет metadata как JSON
- ✅ getAll() возвращает все сообщения
- ✅ getLastPage() возвращает указанное количество
- ✅ getSinceId(null) возвращает все
- ✅ getSinceId(5) возвращает только id > 5
- ✅ getSinceId() сортирует по id ASC
- ✅ update() обновляет своё сообщение
- ✅ update() возвращает null для чужого
- ✅ update() корректно обновляет text и metadata
- ✅ metadata корректно десериализуется

## Особенности

- In-memory SQLite (полная изоляция)
- Reflection API для инжекта mock PDO
- Проверка JSON сериализации на уровне БД
- Проверка авторства при update()
