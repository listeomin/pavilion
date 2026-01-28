# Стратегия резервного копирования

## Принцип 3-2-1

- **3** копии данных (оригинал + 2 бэкапа)
- **2** разных носителя (VPS + облако)
- **1** копия offsite (вне сервера)

---

## Структура бэкапов

```
/var/www/hhrrr.ru/
├── pavilion/                    # Проект (код + данные)
│   ├── data/                    # SQLite базы
│   └── ...
│
└── backups/                     # Локальные бэкапы (на том же VPS)
    ├── daily/                   # Ежедневные (хранить 7 дней)
    ├── weekly/                  # Еженедельные (хранить 4 недели)
    └── monthly/                 # Ежемесячные (хранить 12 месяцев)
```

---

## Скрипт автобэкапа

Создать `/var/www/hhrrr.ru/backup.sh`:

```bash
#!/bin/bash

# Конфигурация
PROJECT_DIR="/var/www/hhrrr.ru/pavilion"
BACKUP_ROOT="/var/www/hhrrr.ru/backups"
DATE=$(date +%Y-%m-%d)
DATETIME=$(date +%Y-%m-%d_%H-%M-%S)

# Создать директории если нет
mkdir -p "$BACKUP_ROOT/daily"
mkdir -p "$BACKUP_ROOT/weekly"
mkdir -p "$BACKUP_ROOT/monthly"

# === ЕЖЕДНЕВНЫЙ БЭКАП ===
DAILY_DIR="$BACKUP_ROOT/daily/$DATE"
mkdir -p "$DAILY_DIR"

# Бэкап SQLite баз (с блокировкой для консистентности)
echo "[$DATETIME] Starting daily backup..."

# Главная база (если ещё используется)
if [ -f "$PROJECT_DIR/chat.sqlite" ]; then
    sqlite3 "$PROJECT_DIR/chat.sqlite" ".backup '$DAILY_DIR/chat.sqlite'"
fi

# Shared базы
for db in "$PROJECT_DIR/data/shared"/*.sqlite; do
    if [ -f "$db" ]; then
        filename=$(basename "$db")
        sqlite3 "$db" ".backup '$DAILY_DIR/shared_$filename'"
    fi
done

# Per-user базы
for userdir in "$PROJECT_DIR/data/users"/*/; do
    if [ -d "$userdir" ]; then
        username=$(basename "$userdir")
        for db in "$userdir"*.sqlite; do
            if [ -f "$db" ]; then
                filename=$(basename "$db")
                sqlite3 "$db" ".backup '$DAILY_DIR/user_${username}_$filename'"
            fi
        done
    fi
done

# Архивировать uploads (изображения, аудио)
tar -czf "$DAILY_DIR/uploads.tar.gz" -C "$PROJECT_DIR/data/users" . 2>/dev/null || true

# Сжать всё в один архив
cd "$BACKUP_ROOT/daily"
tar -czf "backup_$DATE.tar.gz" "$DATE" && rm -rf "$DATE"

echo "[$DATETIME] Daily backup complete: backup_$DATE.tar.gz"

# === РОТАЦИЯ ===

# Удалить daily старше 7 дней
find "$BACKUP_ROOT/daily" -name "*.tar.gz" -mtime +7 -delete

# Удалить weekly старше 28 дней
find "$BACKUP_ROOT/weekly" -name "*.tar.gz" -mtime +28 -delete

# Удалить monthly старше 365 дней
find "$BACKUP_ROOT/monthly" -name "*.tar.gz" -mtime +365 -delete

# === ЕЖЕНЕДЕЛЬНЫЙ (по воскресеньям) ===
if [ "$(date +%u)" -eq 7 ]; then
    cp "$BACKUP_ROOT/daily/backup_$DATE.tar.gz" "$BACKUP_ROOT/weekly/"
    echo "[$DATETIME] Weekly backup saved"
fi

# === ЕЖЕМЕСЯЧНЫЙ (1-го числа) ===
if [ "$(date +%d)" -eq "01" ]; then
    cp "$BACKUP_ROOT/daily/backup_$DATE.tar.gz" "$BACKUP_ROOT/monthly/"
    echo "[$DATETIME] Monthly backup saved"
fi

echo "[$DATETIME] Backup rotation complete"
```

---

## Cron задачи

Добавить в crontab (`crontab -e`):

```cron
# Ежедневный бэкап в 4:00 ночи
0 4 * * * /var/www/hhrrr.ru/backup.sh >> /var/log/pavilion-backup.log 2>&1

# Синхронизация в облако в 5:00 (после бэкапа)
0 5 * * * rclone sync /var/www/hhrrr.ru/backups remote:pavilion-backups --quiet
```

---

## Offsite бэкап (облако)

### Вариант 1: rclone + любое облако

Установить rclone:
```bash
curl https://rclone.org/install.sh | sudo bash
rclone config  # настроить провайдера
```

Поддерживает: Google Drive, Dropbox, S3, Backblaze B2, Yandex Disk и др.

### Вариант 2: rsync на второй сервер

```bash
rsync -avz /var/www/hhrrr.ru/backups/ user@backup-server:/backups/pavilion/
```

### Вариант 3: GitHub (только код, не данные!)

```bash
# Код уже в git, но убедись что .gitignore содержит:
*.sqlite
data/
backups/
```

---

## Мониторинг бэкапов

### Простой healthcheck

Добавить в конец `backup.sh`:

```bash
# Отправить уведомление если бэкап успешен
curl -fsS -m 10 --retry 5 "https://hc-ping.com/YOUR-UUID" > /dev/null

# Или в Telegram
curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/sendMessage" \
    -d chat_id="$CHAT_ID" \
    -d text="✅ Backup complete: $DATE"
```

### Проверка размера бэкапов

```bash
# Добавить в скрипт — алерт если бэкап подозрительно маленький
BACKUP_SIZE=$(stat -f%z "$BACKUP_ROOT/daily/backup_$DATE.tar.gz" 2>/dev/null || echo 0)
MIN_SIZE=10000  # минимум 10KB

if [ "$BACKUP_SIZE" -lt "$MIN_SIZE" ]; then
    echo "WARNING: Backup suspiciously small: $BACKUP_SIZE bytes"
    # Отправить алерт
fi
```

---

## Быстрое восстановление

### Восстановить из daily бэкапа:

```bash
cd /var/www/hhrrr.ru/backups/daily
tar -xzf backup_2026-01-17.tar.gz

# Восстановить конкретную базу
cp 2026-01-17/shared_chat.sqlite /var/www/hhrrr.ru/pavilion/data/shared/chat.sqlite

# Или все базы
cp 2026-01-17/shared_*.sqlite /var/www/hhrrr.ru/pavilion/data/shared/
cp 2026-01-17/user_listeomin_*.sqlite /var/www/hhrrr.ru/pavilion/data/users/listeomin/
```

### Восстановить uploads:

```bash
tar -xzf 2026-01-17/uploads.tar.gz -C /var/www/hhrrr.ru/pavilion/data/users/
```

---

## Git для кода

Код уже в git — это хорошо. Дополнительно:

### Pre-commit hook для защиты

`.git/hooks/pre-commit`:
```bash
#!/bin/bash
# Не дать случайно закоммитить базы данных
if git diff --cached --name-only | grep -qE '\.sqlite$'; then
    echo "ERROR: Attempting to commit .sqlite files!"
    echo "Remove them from staging: git reset HEAD *.sqlite"
    exit 1
fi
```

### Автопуш после коммита (опционально)

`.git/hooks/post-commit`:
```bash
#!/bin/bash
git push origin main
```

---

## Чеклист: сделать один раз

- [ ] Создать директорию `/var/www/hhrrr.ru/backups/`
- [ ] Создать скрипт `backup.sh` и сделать исполняемым (`chmod +x`)
- [ ] Добавить cron задачу
- [ ] Настроить rclone для облачного бэкапа
- [ ] Проверить что .gitignore исключает `*.sqlite` и `data/`
- [ ] Добавить pre-commit hook
- [ ] Запустить бэкап вручную и проверить
- [ ] Попробовать восстановление из бэкапа (тест!)

---

## Рекомендуемые облачные провайдеры

| Провайдер | Бесплатно | Цена | Комментарий |
|-----------|-----------|------|-------------|
| Backblaze B2 | 10 GB | $0.005/GB | Лучшее соотношение цена/качество |
| Yandex Disk | 10 GB | — | Русский, простой |
| Google Drive | 15 GB | — | Надёжный |
| Dropbox | 2 GB | — | Маловато |

---

## Итого

После настройки:
- Ежедневные бэкапы в 4:00
- Хранение: 7 daily + 4 weekly + 12 monthly
- Копия в облаке
- Уведомления об успехе/ошибке
- Восстановление за 5 минут

**Больше не переживаешь за данные!**
