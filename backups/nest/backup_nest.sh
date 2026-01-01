#!/bin/bash
# Backup nest content

cd /var/www/hhrrr.ru/pavilion
mkdir -p backups/nest

DATE=$(date +%Y-%m-%d_%H-%M-%S)

echo "Creating backup for $DATE..."
sqlite3 chat.sqlite ".dump nest_content" > "backups/nest/nest_content_${DATE}.sql"
sqlite3 chat.sqlite ".dump nest_sections" > "backups/nest/nest_sections_${DATE}.sql"

echo "✓ Backup created:"
ls -lh "backups/nest/nest_content_${DATE}.sql"
ls -lh "backups/nest/nest_sections_${DATE}.sql"

# Keep only last 10 backups
echo "Cleaning old backups (keeping last 10)..."
cd backups/nest
ls -t nest_content_*.sql | tail -n +11 | xargs -r rm
ls -t nest_sections_*.sql | tail -n +11 | xargs -r rm

echo "✓ Done!"
