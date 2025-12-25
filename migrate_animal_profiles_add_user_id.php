<?php
// migrate_animal_profiles_add_user_id.php - Добавление user_id в animal_profiles

$db_path = __DIR__ . '/public/data/animal.sqlite';

if (!file_exists($db_path)) {
    die("❌ База animal.sqlite не найдена\n");
}

$db = new SQLite3($db_path);

echo "=== Миграция: Добавление user_id в animal_profiles ===\n\n";

try {
    // 1. Проверяем существует ли поле user_id
    echo "1. Проверка структуры таблицы...\n";
    $result = $db->query("PRAGMA table_info(animal_profiles)");
    $hasUserId = false;

    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        if ($row['name'] === 'user_id') {
            $hasUserId = true;
            break;
        }
    }

    if ($hasUserId) {
        echo "   ℹ Поле user_id уже существует\n\n";
    } else {
        // 2. Добавляем поле user_id
        echo "   + Добавление поля user_id...\n";
        $db->exec("ALTER TABLE animal_profiles ADD COLUMN user_id INTEGER");
        echo "   ✓ Поле user_id добавлено\n\n";
    }

    // 3. Создаем индекс для быстрого поиска по user_id
    echo "2. Создание индекса...\n";
    $db->exec("CREATE INDEX IF NOT EXISTS idx_animal_profiles_user_id ON animal_profiles(user_id)");
    echo "   ✓ Индекс создан\n\n";

    // 4. Создаем бэкап
    echo "3. Создание бэкапа...\n";
    $backupDir = __DIR__ . '/backups';
    if (!file_exists($backupDir)) {
        mkdir($backupDir, 0755, true);
    }

    $timestamp = date('Y-m-d_H-i-s');
    $backupPath = "{$backupDir}/animal_backup_{$timestamp}_after_user_id_migration.sqlite";

    if (copy($db_path, $backupPath)) {
        echo "   ✓ Бэкап создан: {$backupPath}\n";
    } else {
        echo "   ⚠ Не удалось создать бэкап\n";
    }

    echo "\n=== Миграция завершена успешно! ===\n";

    // Статистика
    $profileCount = $db->querySingle("SELECT COUNT(*) FROM animal_profiles");
    echo "\nСтатистика:\n";
    echo "  Всего профилей: {$profileCount}\n";

} catch (Exception $e) {
    echo "\n❌ ОШИБКА: " . $e->getMessage() . "\n";
    exit(1);
}

$db->close();
