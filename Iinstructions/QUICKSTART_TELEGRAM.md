# 🚀 Quick Start

## 1. Создай бота

Telegram → @BotFather:
```
/newbot
Pavilion Auth
hhrrrr_auth_bot
```

Получишь токен: `1234567890:ABC...`

## 2. Настрой домен

```
/setdomain
hhrrr.ru
```

## 3. Обнови .env

```bash
cd /Users/ufoanima/Dev/personal/pavilion
nano .env
```

Вставь реальный токен:
```
TELEGRAM_BOT_TOKEN=твой_токен_здесь
```

## 4. Запусти миграцию

```bash
php migrate_telegram.php
```

## 5. Запусти тесты

```bash
./tester/test-php.sh
./tester/test-js.sh
```

## 6. Открой приложение

Кнопка Telegram должна быть вверху справа ✅

---

Подробности: `TELEGRAM_AUTH_SETUP.md`
