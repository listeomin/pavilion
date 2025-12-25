<?php
// migrate_animal_profiles_rebuild.php - Пересоздание таблицы с правильными constraints

$db_path = __DIR__ . '/public/data/animal.sqlite';

if (!file_exists($db_path)) {
    die("❌ База animal.sqlite не найдена\n");
}

$db = new SQLite3($db_path);

echo "=== Миграция: Пересоздание animal_profiles с правильными constraints ===\n\n";

try {
    $db->exec('BEGIN TRANSACTION');

    // 1. Создаем новую таблицу БЕЗ UNIQUE constraint
    echo "1. Создание новой таблицы...\n";
    $db->exec("
        CREATE TABLE animal_profiles_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            emoji TEXT NOT NULL,
            kind TEXT,
            arial TEXT,
            role TEXT,
            lifecycle TEXT,
            bio TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            user_id INTEGER
        )
    ");
    echo "   ✓ Таблица создана\n\n";

    // 2. Копируем данные из старой таблицы
    echo "2. Копирование данных...\n";
    $db->exec("
        INSERT INTO animal_profiles_new
        SELECT * FROM animal_profiles
    ");

    $count = $db->querySingle("SELECT COUNT(*) FROM animal_profiles_new");
    echo "   ✓ Скопировано записей: {$count}\n\n";

    // 3. Удаляем старую таблицу и переименовываем новую
    echo "3. Замена таблицы...\n";
    $db->exec("DROP TABLE animal_profiles");
    $db->exec("ALTER TABLE animal_profiles_new RENAME TO animal_profiles");
    echo "   ✓ Таблица заменена\n\n";

    // 4. Создаем правильные unique indexes
    echo "4. Создание unique indexes...\n";

    // Для неавторизованных пользователей (session_id + emoji, только если user_id NULL)
    $db->exec("
        CREATE UNIQUE INDEX idx_animal_session_emoji
        ON animal_profiles(session_id, emoji)
        WHERE user_id IS NULL
    ");
    echo "   ✓ Index для session_id создан\n";

    // Для авторизованных пользователей (user_id + emoji, только если user_id NOT NULL)
    $db->exec("
        CREATE UNIQUE INDEX idx_animal_user_emoji
        ON animal_profiles(user_id, emoji)
        WHERE user_id IS NOT NULL
    ");
    echo "   ✓ Index для user_id создан\n\n";

    // 5. Создаем индекс для производительности
    echo "5. Создание дополнительных indexes...\n";
    $db->exec("CREATE INDEX IF NOT EXISTS idx_animal_profiles_user_id ON animal_profiles(user_id)");
    echo "   ✓ Index создан\n\n";

    $db->exec('COMMIT');

    // 6. Создаем бэкап
    echo "6. Создание бэкапа...\n";
    $backupDir = __DIR__ . '/backups';
    if (!file_exists($backupDir)) {
        mkdir($backupDir, 0755, true);
    }

    $timestamp = date('Y-m-d_H-i-s');
    $backupPath = "{$backupDir}/animal_backup_{$timestamp}_after_rebuild.sqlite";

    if (copy($db_path, $backupPath)) {
        echo "   ✓ Бэкап создан: {$backupPath}\n";
    } else {
        echo "   ⚠ Не удалось создать бэкап\n";
    }

    echo "\n=== Миграция завершена успешно! ===\n";

    // Проверка
    echo "\nПроверка структуры:\n";
    $result = $db->query("SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='animal_profiles'");
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        echo "  - " . $row['sql'] . "\n";
    }

} catch (Exception $e) {
    $db->exec('ROLLBACK');
    echo "\n❌ ОШИБКА: " . $e->getMessage() . "\n";
    echo "Миграция отменена\n";
    exit(1);
}

$db->close();
