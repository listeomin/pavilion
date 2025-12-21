<?php
// migrate_telegram.php - Добавляет Telegram поля в sessions таблицу

try {
    $path = __DIR__ . '/chat.sqlite';
    $pdo = new PDO('sqlite:' . $path);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec('PRAGMA foreign_keys = ON');

    echo "Checking sessions table schema...\n";
    
    // Get current columns
    $stmt = $pdo->query("PRAGMA table_info(sessions)");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $columnNames = array_column($columns, 'name');
    
    echo "Current columns: " . implode(', ', $columnNames) . "\n";
    
    $needsMigration = false;
    
    // Check if telegram columns exist
    if (!in_array('telegram_id', $columnNames)) {
        echo "Adding telegram_id column...\n";
        $pdo->exec("ALTER TABLE sessions ADD COLUMN telegram_id BIGINT");
        $needsMigration = true;
    }
    
    if (!in_array('telegram_username', $columnNames)) {
        echo "Adding telegram_username column...\n";
        $pdo->exec("ALTER TABLE sessions ADD COLUMN telegram_username TEXT");
        $needsMigration = true;
    }
    
    if (!in_array('is_owner', $columnNames)) {
        echo "Adding is_owner column...\n";
        $pdo->exec("ALTER TABLE sessions ADD COLUMN is_owner BOOLEAN DEFAULT 0");
        $needsMigration = true;
    }
    
    if ($needsMigration) {
        echo "✅ Migration completed successfully!\n";
    } else {
        echo "✅ No migration needed - all columns exist\n";
    }
    
    // Show final schema
    echo "\nFinal schema:\n";
    $stmt = $pdo->query("PRAGMA table_info(sessions)");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($columns as $col) {
        echo "  - {$col['name']} ({$col['type']})\n";
    }
    
} catch (Exception $e) {
    echo '❌ ERROR: ' . $e->getMessage() . "\n";
    exit(1);
}
