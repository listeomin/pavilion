<?php
// migrate_animal_profiles_fix_unique.php - Добавление unique constraint для user_id

$db_path = __DIR__ . '/public/data/animal.sqlite';

if (!file_exists($db_path)) {
    die("❌ База animal.sqlite не найдена\n");
}

$db = new SQLite3($db_path);

echo "=== Миграция: Добавление unique index для user_id + emoji ===\n\n";

try {
    // 1. Создаем partial unique index для user_id (только для Telegram пользователей)
    echo "1. Создание unique index для (user_id, emoji)...\n";
    $db->exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_animal_user_emoji ON animal_profiles(user_id, emoji) WHERE user_id IS NOT NULL");
    echo "   ✓ Index создан\n\n";

    // 2. Создаем бэкап
    echo "2. Создание бэкапа...\n";
    $backupDir = __DIR__ . '/backups';
    if (!file_exists($backupDir)) {
        mkdir($backupDir, 0755, true);
    }

    $timestamp = date('Y-m-d_H-i-s');
    $backupPath = "{$backupDir}/animal_backup_{$timestamp}_after_unique_fix.sqlite";

    if (copy($db_path, $backupPath)) {
        echo "   ✓ Бэкап создан: {$backupPath}\n";
    } else {
        echo "   ⚠ Не удалось создать бэкап\n";
    }

    echo "\n=== Миграция завершена успешно! ===\n";

    // Проверка
    $result = $db->query("SELECT sql FROM sqlite_master WHERE type='index' AND name='idx_animal_user_emoji'");
    $row = $result->fetchArray(SQLITE3_ASSOC);
    if ($row) {
        echo "\nСоздан index:\n";
        echo "  " . $row['sql'] . "\n";
    }

} catch (Exception $e) {
    echo "\n❌ ОШИБКА: " . $e->getMessage() . "\n";
    exit(1);
}

$db->close();
