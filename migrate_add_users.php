<?php
// migrate_add_users.php - Добавление таблицы users и связей

require_once __DIR__ . '/server/db.php';

$pdo = get_db();

echo "=== Миграция: Добавление таблицы users ===\n\n";

try {
    $pdo->beginTransaction();

    // 1. Создаем таблицу users
    echo "1. Создание таблицы users...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id BIGINT UNIQUE NOT NULL,
            telegram_username TEXT,
            telegram_first_name TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ");
    echo "   ✓ Таблица users создана\n\n";

    // 2. Добавляем поле user_id в sessions (если его нет)
    echo "2. Добавление поля user_id в sessions...\n";

    // Проверяем существует ли поле
    $columns = $pdo->query("PRAGMA table_info(sessions)")->fetchAll(PDO::FETCH_ASSOC);
    $hasUserId = false;
    foreach ($columns as $column) {
        if ($column['name'] === 'user_id') {
            $hasUserId = true;
            break;
        }
    }

    if (!$hasUserId) {
        $pdo->exec("ALTER TABLE sessions ADD COLUMN user_id INTEGER REFERENCES users(id)");
        echo "   ✓ Поле user_id добавлено\n";
    } else {
        echo "   ℹ Поле user_id уже существует\n";
    }
    echo "\n";

    // 3. Мигрируем существующие данные
    echo "3. Миграция существующих Telegram пользователей...\n";

    // Находим все сессии с telegram_id
    $stmt = $pdo->query("SELECT id, telegram_id, telegram_username, name, created_at FROM sessions WHERE telegram_id IS NOT NULL");
    $telegramSessions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $migratedCount = 0;
    foreach ($telegramSessions as $session) {
        // Проверяем существует ли уже пользователь с таким telegram_id
        $userStmt = $pdo->prepare("SELECT id FROM users WHERE telegram_id = :telegram_id");
        $userStmt->execute([':telegram_id' => $session['telegram_id']]);
        $existingUser = $userStmt->fetch(PDO::FETCH_ASSOC);

        if (!$existingUser) {
            // Создаем пользователя
            $insertStmt = $pdo->prepare("
                INSERT INTO users (telegram_id, telegram_username, telegram_first_name, created_at, updated_at)
                VALUES (:telegram_id, :telegram_username, '', :created_at, :updated_at)
            ");

            $insertStmt->execute([
                ':telegram_id' => $session['telegram_id'],
                ':telegram_username' => $session['telegram_username'] ?? '',
                ':created_at' => $session['created_at'],
                ':updated_at' => $session['created_at']
            ]);

            $userId = (int)$pdo->lastInsertId();
            echo "   ✓ Создан user ID={$userId} для telegram_id={$session['telegram_id']}\n";
        } else {
            $userId = $existingUser['id'];
            echo "   ℹ User ID={$userId} уже существует для telegram_id={$session['telegram_id']}\n";
        }

        // Связываем сессию с пользователем
        $updateStmt = $pdo->prepare("UPDATE sessions SET user_id = :user_id WHERE id = :session_id");
        $updateStmt->execute([
            ':user_id' => $userId,
            ':session_id' => $session['id']
        ]);

        $migratedCount++;
    }

    echo "   ✓ Мигрировано сессий: {$migratedCount}\n\n";

    // 4. Создаем индексы для производительности
    echo "4. Создание индексов...\n";
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)");
    echo "   ✓ Индексы созданы\n\n";

    $pdo->commit();

    // 5. Создаем первый бэкап
    echo "5. Создание бэкапа после миграции...\n";
    $backupDir = __DIR__ . '/backups';
    if (!file_exists($backupDir)) {
        mkdir($backupDir, 0755, true);
    }

    $timestamp = date('Y-m-d_H-i-s');
    $backupPath = "{$backupDir}/chat_backup_{$timestamp}_after_users_migration.sqlite";

    if (copy(__DIR__ . '/chat.sqlite', $backupPath)) {
        echo "   ✓ Бэкап создан: {$backupPath}\n";
    } else {
        echo "   ⚠ Не удалось создать бэкап\n";
    }

    echo "\n=== Миграция завершена успешно! ===\n";

    // Статистика
    $userCount = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    $sessionCount = $pdo->query("SELECT COUNT(*) FROM sessions WHERE user_id IS NOT NULL")->fetchColumn();

    echo "\nСтатистика:\n";
    echo "  Пользователей (users): {$userCount}\n";
    echo "  Связанных сессий: {$sessionCount}\n";

} catch (Exception $e) {
    $pdo->rollBack();
    echo "\n❌ ОШИБКА: " . $e->getMessage() . "\n";
    echo "Миграция отменена\n";
    exit(1);
}
