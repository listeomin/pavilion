#!/bin/bash
# Restore nest content from backup

if [ -z "$1" ]; then
    echo "Usage: $0 <backup_date>"
    echo "Available backups:"
    ls -1 backups/nest/nest_content_*.sql | sed 's/.*nest_content_\(.*\)\.sql/  \1/'
    exit 1
fi

DATE=$1
CONTENT_BACKUP="backups/nest/nest_content_${DATE}.sql"
SECTIONS_BACKUP="backups/nest/nest_sections_${DATE}.sql"

if [ ! -f "$CONTENT_BACKUP" ]; then
    echo "Error: Backup file $CONTENT_BACKUP not found"
    exit 1
fi

echo "Restoring nest content from $DATE..."
echo "Creating backup of current state..."
CURRENT_DATE=$(date +%Y-%m-%d_%H-%M-%S)
sqlite3 chat.sqlite ".dump nest_content" > "backups/nest/nest_content_before_restore_${CURRENT_DATE}.sql"
sqlite3 chat.sqlite ".dump nest_sections" > "backups/nest/nest_sections_before_restore_${CURRENT_DATE}.sql"

echo "Dropping existing tables..."
sqlite3 chat.sqlite "DROP TABLE IF EXISTS nest_content;"
sqlite3 chat.sqlite "DROP TABLE IF EXISTS nest_sections;"

echo "Restoring from backup..."
sqlite3 chat.sqlite < "$CONTENT_BACKUP"
[ -f "$SECTIONS_BACKUP" ] && sqlite3 chat.sqlite < "$SECTIONS_BACKUP"

echo "✓ Restore completed successfully!"
echo "Backup of previous state saved as:"
echo "  - nest_content_before_restore_${CURRENT_DATE}.sql"
echo "  - nest_sections_before_restore_${CURRENT_DATE}.sql"
