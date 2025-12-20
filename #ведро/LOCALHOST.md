# 🚀 Локальная разработка и тестирование

## Запуск localhost (в фоне)

### Быстрый старт
```bash
cd /Users/ufoanima/Dev/personal/pavilion
chmod +x dev.sh  # только один раз
./dev.sh
```

### Команды управления

**Запустить серверы:**
```bash
./dev.sh start
# или просто
./dev.sh
```

**Остановить серверы:**
```bash
./dev.sh stop
```

**Проверить статус:**
```bash
./dev.sh status
```

**Смотреть логи в реальном времени:**
```bash
./dev.sh logs
```

**Перезапустить:**
```bash
./dev.sh restart
```

### Что запускается
- ✅ WebSocket сервер — `ws://localhost:3001` + `http://localhost:3002`
- ✅ PHP dev server — `http://localhost:8080`

### Логи
- `logs/ws.log` — WebSocket сервер
- `logs/php.log` — PHP сервер

### Браузер
```
http://localhost:8080
```

---

## Запуск вручную (два терминала)

Если нужна разработка с живыми логами:

**Терминал 1 — WebSocket:**
```bash
cd /Users/ufoanima/Dev/personal/pavilion/ws-server
npm run dev
```

**Терминал 2 — PHP:**
```bash
cd /Users/ufoanima/Dev/personal/pavilion
php -S localhost:8080 router.php
```

---

## Запуск тестов

### Все тесты (PHP + JS)
```bash
bash test.sh
```

### Только PHP тесты
```bash
./vendor/bin/phpunit tests/php --testdox --colors=always
```

### Только JavaScript тесты
```bash
npm test
```

---

## Быстрая шпаргалка

```bash
# Запустить всё
./dev.sh

# Проверить работает ли
./dev.sh status

# Посмотреть что происходит
./dev.sh logs

# Остановить
./dev.sh stop

# Тесты
bash test.sh
```
