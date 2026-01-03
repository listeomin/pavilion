<?php
// server/migrate_add_created_date.php
// Migration: Add created_date column to nest_posts for custom "Создано" date

require_once __DIR__ . '/db.php';

try {
    $db = get_db();

    echo "Adding created_date column to nest_posts table...\n";

    // Check if column already exists
    $columns = $db->query("PRAGMA table_info(nest_posts)")->fetchAll(PDO::FETCH_ASSOC);
    $hasCreatedDate = false;
    foreach ($columns as $col) {
        if ($col['name'] === 'created_date') {
            $hasCreatedDate = true;
            break;
        }
    }

    if ($hasCreatedDate) {
        echo "✓ Column created_date already exists\n";
    } else {
        $db->exec("
            ALTER TABLE nest_posts
            ADD COLUMN created_date TEXT DEFAULT NULL
        ");
        echo "✓ Column created_date added successfully\n";
    }

    echo "\nDate fields in nest_posts:\n";
    echo "- created_date: TEXT (nullable) - Custom 'Создано' date set by author\n";
    echo "- created_at: TEXT - Auto 'Опубликовано' timestamp (when post was published)\n";
    echo "- updated_at: TEXT - Auto 'Изменено' timestamp (last edit)\n";

} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
