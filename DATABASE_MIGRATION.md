# План миграции базы данных

## Текущее состояние

Все данные в одном файле `chat.sqlite`:
- users (6 записей)
- sessions (53)
- messages (13) — главный чат
- branches (7) + branch_messages
- direct_messages (43)
- nest_posts (333) — посты блогов
- nest_sections (1) — рубрики
- nest_content (4) — контент главных страниц гнёзд
- nest_discussions (4) + nest_discussion_comments

---

## Целевая архитектура

```
data/
├── shared/                              # Общие данные
│   ├── users.sqlite                     # Авторизованные пользователи
│   │   └── users
│   │
│   ├── sessions.sqlite                  # Анонимные сессии
│   │   └── sessions
│   │
│   ├── chat.sqlite                      # Главный чат (мурмурация)
│   │   └── messages
│   │
│   ├── branches_anon.sqlite             # Ветки созданные АНОНИМАМИ
│   │   ├── branches
│   │   └── branch_messages
│   │
│   └── dm_anon.sqlite                   # ЛС где участвует аноним
│       └── direct_messages              # Вайпится по cron раз в квартал
│
└── users/                               # Per-user данные (гнёзда)
    └── {username}/
        │
        ├── nest.sqlite                  # Блог пользователя
        │   ├── posts                    # Посты (без user_id!)
        │   ├── sections                 # Рубрики
        │   ├── content                  # Контент главной гнезда
        │   ├── discussions              # Обсуждения к постам
        │   └── discussion_comments      # Комментарии в обсуждениях
        │
        ├── branches.sqlite              # Ветки созданные ЭТИМ юзером
        │   ├── branches
        │   └── branch_messages
        │
        ├── dm.sqlite                    # ЛС с авторизованными юзерами
        │   └── direct_messages
        │
        └── uploads/
            ├── images/                  # Картинки к постам
            └── audio/                   # Музыка
```

---

## Принципы хранения

### Кто где хранит данные:

| Действие | Где хранится |
|----------|--------------|
| Сообщение в главный чат | `shared/chat.sqlite` |
| Аноним создаёт ветку | `shared/branches_anon.sqlite` |
| Авторизованный создаёт ветку | `users/{username}/branches.sqlite` |
| Аноним пишет в обсуждение поста | `users/{владелец_поста}/nest.sqlite` |
| ЛС аноним ↔ аноним | `shared/dm_anon.sqlite` |
| ЛС аноним → авторизованный | `shared/dm_anon.sqlite` |
| ЛС авторизованный ↔ авторизованный | `users/{username}/dm.sqlite` у обоих |

### При авторизации анонима:
- Его ветки из `shared/branches_anon.sqlite` → `users/{username}/branches.sqlite`
- ЛС остаются где были (уже сохранены у получателей)

### Вайп анонимных данных:
- `shared/dm_anon.sqlite` — удалять переписки где обе сессии неактивны > 90 дней
- `shared/branches_anon.sqlite` — удалять ветки где создатель неактивен > 90 дней

---

## Схемы таблиц

### shared/users.sqlite
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id BIGINT UNIQUE NOT NULL,
    telegram_username TEXT,
    telegram_first_name TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

### shared/sessions.sqlite
```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,              -- session_id (hash)
    user_id INTEGER,                  -- NULL для анонимов, id для авторизованных
    name TEXT NOT NULL,               -- "🐳 Кит" и т.п.
    created_at TEXT NOT NULL,
    last_active_at TEXT,              -- для определения "мёртвых" сессий
    telegram_id BIGINT,
    telegram_username TEXT
);
```

### shared/chat.sqlite
```sql
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    author TEXT NOT NULL,             -- имя на момент отправки
    text TEXT NOT NULL,
    metadata TEXT,                    -- JSON: картинки, превью и т.п.
    created_at TEXT NOT NULL
);
```

### shared/branches_anon.sqlite
```sql
CREATE TABLE branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    creator_session_id TEXT NOT NULL, -- сессия анонима
    source_message_id INTEGER,        -- откуда процитировано
    created_at TEXT NOT NULL
);

CREATE TABLE branch_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id INTEGER NOT NULL,
    session_id TEXT,
    author_name TEXT,
    text TEXT NOT NULL,
    metadata TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);
```

### users/{username}/nest.sqlite
```sql
-- Посты (БЕЗ user_id — он определён путём к файлу)
CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '{}',
    position INTEGER DEFAULT 0,
    tag TEXT,                         -- рубрика
    created_date TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Рубрики (одна запись на пользователя)
CREATE TABLE sections (
    id INTEGER PRIMARY KEY DEFAULT 1,
    sections TEXT NOT NULL DEFAULT '[]',  -- JSON массив рубрик
    updated_at TEXT NOT NULL
);

-- Контент главной страницы гнезда
CREATE TABLE content (
    id INTEGER PRIMARY KEY DEFAULT 1,
    content TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- Обсуждения к постам
CREATE TABLE discussions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    post_slug TEXT,
    quote_text TEXT,                  -- процитированный текст
    title TEXT,
    creator_user_id INTEGER,          -- NULL если аноним
    creator_session_id TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE discussion_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discussion_id INTEGER NOT NULL,
    user_id INTEGER,
    session_id TEXT,
    author_name TEXT,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (discussion_id) REFERENCES discussions(id) ON DELETE CASCADE
);
```

### users/{username}/branches.sqlite
```sql
-- Такая же структура как shared/branches_anon.sqlite
-- но creator_user_id вместо creator_session_id
CREATE TABLE branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    creator_user_id INTEGER NOT NULL,
    source_message_id INTEGER,
    created_at TEXT NOT NULL
);

CREATE TABLE branch_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id INTEGER NOT NULL,
    user_id INTEGER,
    session_id TEXT,
    author_name TEXT,
    text TEXT NOT NULL,
    metadata TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);
```

### users/{username}/dm.sqlite
```sql
CREATE TABLE direct_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_with_user_id INTEGER NOT NULL,  -- с кем переписка
    direction TEXT NOT NULL,                      -- 'in' или 'out'
    from_user_id INTEGER,
    to_user_id INTEGER,
    text TEXT NOT NULL,
    metadata TEXT,
    created_at TEXT NOT NULL
);
```

---

## План миграции

### Шаг 1: Создать структуру директорий
```bash
mkdir -p data/shared
mkdir -p data/users
```

### Шаг 2: Мигрировать shared данные
```sql
-- users.sqlite
CREATE TABLE users AS SELECT * FROM chat.users;

-- sessions.sqlite
CREATE TABLE sessions AS SELECT * FROM chat.sessions;

-- chat.sqlite (только messages)
CREATE TABLE messages AS SELECT * FROM chat.messages;
```

### Шаг 3: Разделить ветки на анонимные и авторизованные
```sql
-- branches_anon.sqlite — где creator_user_id IS NULL
-- users/{username}/branches.sqlite — где creator_user_id NOT NULL
```

### Шаг 4: Разделить DM
```sql
-- dm_anon.sqlite — где from_user_id IS NULL OR to_user_id IS NULL
-- users/{username}/dm.sqlite — где оба авторизованы
```

### Шаг 5: Мигрировать гнёзда (для каждого юзера с постами)
```sql
-- Для listeomin (user_id=2):
-- Создать data/users/listeomin/nest.sqlite
-- Скопировать posts WHERE user_id=2 (убрав колонку user_id)
-- Скопировать sections WHERE user_id=2
-- Скопировать content WHERE user_id=2
-- Скопировать discussions привязанные к его постам
```

### Шаг 6: Обновить код
- `server/db.php` — добавить функции для новой структуры
- `get_user_nest_db($username)` — уже есть, проверить
- `get_shared_chat_db()`, `get_shared_branches_anon_db()` и т.д.
- Обновить все API endpoints

### Шаг 7: Обновить права
```bash
sudo chown -R www-data:www-data /var/www/hhrrr.ru/pavilion/data/
sudo chmod -R 755 /var/www/hhrrr.ru/pavilion/data/
sudo chmod 664 /var/www/hhrrr.ru/pavilion/data/shared/*.sqlite
sudo chmod -R 664 /var/www/hhrrr.ru/pavilion/data/users/*/*.sqlite
```

---

## Пользователи для миграции

| user_id | username | posts | нужна папка |
|---------|----------|-------|-------------|
| 1 | testuser | 3 | да |
| 2 | listeomin | 329 | да |
| 3 | (пустой) | 0 | нет |
| 4 | developer | 0 | нет |
| 5 | owl_ai | 0 | нет |
| 6 | Bobvar | 1 | да |

---

## Важно!

1. **Сделать бэкап перед миграцией:**
   ```bash
   cp chat.sqlite chat.sqlite.backup_$(date +%Y%m%d)
   ```

2. **Не трогать старый chat.sqlite** пока новая система не заработает

3. **Тестировать на копии** — не на проде

4. **В per-user таблицах НЕТ user_id** — он определён путём к файлу

5. **Изображения и аудио** — переместить из `public/uploads/` в `data/users/{username}/uploads/`
