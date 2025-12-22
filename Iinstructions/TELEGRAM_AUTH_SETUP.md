# Telegram Auth Integration - Setup Guide

## Что сделано

✅ Создан модуль авторизации `public/js/telegramAuth.js`
✅ Создан API endpoint `public/api/telegram_auth.php`
✅ Обновлён `animalProfile.js` - методы `showLogoutButton()`, `logout()`
✅ БД уже имеет нужные поля (`telegram_id`, `telegram_username`)
✅ Интегрировано в UI (`index.php`, `main.js`)
✅ Созданы тесты (PHP и JS)
✅ Добавлены стили `css/telegramAuth.css`

## Что нужно сделать

### 1. Создать бота для авторизации

Открой Telegram → @BotFather:

```
/newbot
```

Название: `Pavilion Auth` (или любое)
Username: `hhrrrr_auth_bot` (или другое, но обнови код)

Получишь токен вида: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`

### 2. Настроить домен бота

В @BotFather:

```
/setdomain
```

Выбери бота → введи домен: `hhrrr.ru`

### 3. Обновить .env

Открой файл `/Users/ufoanima/Dev/personal/pavilion/.env`:

```env
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_BOT_USERNAME=hhrrrr_auth_bot
```

**ВАЖНО:** Замени на реальный токен!

### 4. Если изменил username бота

Открой `public/js/main.js`, найди строку:

```javascript
telegramAuth.init('telegram-auth-container', 'hhrrrr_auth_bot', (authData) => {
```

Замени `'hhrrrr_auth_bot'` на свой username (без @).

## Проверка работы

### 1. Запусти тесты

```bash
# PHP тесты
cd /Users/ufoanima/Dev/personal/pavilion
./tester/test-php.sh

# JS тесты
./tester/test-js.sh
```

### 2. Открой приложение

```
http://localhost:8000/pavilion  # или твой URL
```

Должна появиться кнопка Telegram вверху справа (над кнопкой лапки).

### 3. Проверь авторизацию

1. Кликни кнопку Telegram
2. Откроется Widget → подтверди в Telegram
3. Кнопка Telegram исчезнет
4. Появится кнопка `[твой_username]`
5. Открой Звериный профиль (кнопка лапки)
6. Внизу появится кнопка "Разлогиниться"

## Структура файлов

```
pavilion/
├── .env                                  # Токен бота
├── public/
│   ├── index.php                         # Добавлен контейнер #telegram-auth-container
│   ├── api/
│   │   └── telegram_auth.php             # Backend API (auth, check, logout)
│   ├── css/
│   │   └── telegramAuth.css              # Стили кнопок
│   └── js/
│       ├── main.js                       # Инициализация TelegramAuth
│       ├── telegramAuth.js               # Модуль авторизации
│       ├── animalProfile.js              # Обновлён (logout, showLogoutButton)
│       └── __tests__/
│           └── telegramAuth.test.js      # JS тесты
└── tester/
    └── php/
        └── TelegramAuthTest.php          # PHP тесты
```

## Как работает

1. **Инициализация** (`main.js`)
   - Проверяет текущую сессию через `telegram_auth.php?action=check`
   - Если авторизован → показывает кнопку "[username]"
   - Если нет → показывает кнопку Telegram Widget

2. **Авторизация** (Telegram Widget)
   - Пользователь кликает → открывается Telegram
   - Telegram отправляет данные → `telegram_auth.php?action=auth`
   - PHP проверяет подпись, сохраняет в сессию + БД
   - Callback обновляет UI

3. **Разлогин** (кнопка в профиле)
   - Кликает "Разлогиниться"
   - `telegram_auth.php?action=logout` очищает сессию
   - Перезагружает страницу

## Troubleshooting

**Кнопка не появляется:**
- Проверь консоль браузера (F12 → Console)
- Проверь что `.env` загружается: `var_dump(getenv('TELEGRAM_BOT_TOKEN'));`

**Hash validation failed:**
- Проверь что токен в `.env` совпадает с токеном от BotFather

**Кнопка появляется, но не работает:**
- Проверь `/setdomain` в @BotFather
- Проверь что домен совпадает с URL приложения

**После авторизации ничего не меняется:**
- Проверь консоль браузера
- Проверь логи PHP: `tail -f server/php-error.log`

## Дальнейшие планы

- [ ] Связать Telegram ID с личными комнатами
- [ ] Добавить JWT токены для безопасности
- [ ] Интегрировать с Telegram ботом для сообщений
