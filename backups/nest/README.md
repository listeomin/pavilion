# Nest Content Backup

## Текущие бэкапы

Бэкапы хранятся в `/var/www/hhrrr.ru/pavilion/backups/nest/`

Создан автоматический бэкап от: 2026-01-01 23:42:01

## Как создать бэкап вручную

```bash
cd /var/www/hhrrr.ru/pavilion
./backups/nest/backup_nest.sh
```

Это создаст новые файлы:
- `nest_content_YYYY-MM-DD_HH-MM-SS.sql` - контент страниц Nest
- `nest_sections_YYYY-MM-DD_HH-MM-SS.sql` - разделы пользователей

## Как восстановить из бэкапа

1. Посмотреть доступные бэкапы:
```bash
cd /var/www/hhrrr.ru/pavilion
./backups/nest/restore_nest.sh
```

2. Восстановить из конкретного бэкапа:
```bash
./backups/nest/restore_nest.sh 2026-01-01_23-42-01
```

**Важно**: Скрипт автоматически создаст бэкап текущего состояния перед восстановлением!

## Автоочистка

Скрипт бэкапа автоматически оставляет только последние 10 бэкапов, удаляя старые.
