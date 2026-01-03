<?php
// server/migrate_add_post_tag.php
// Migration: Add tag column to nest_posts for categorization

require_once __DIR__ . '/db.php';

try {
    $db = get_db();

    echo "Adding tag column to nest_posts table...\n";

    // Check if column already exists
    $columns = $db->query("PRAGMA table_info(nest_posts)")->fetchAll(PDO::FETCH_ASSOC);
    $hasTag = false;
    foreach ($columns as $col) {
        if ($col['name'] === 'tag') {
            $hasTag = true;
            break;
        }
    }

    if ($hasTag) {
        echo "✓ Column tag already exists\n";
    } else {
        $db->exec("
            ALTER TABLE nest_posts
            ADD COLUMN tag TEXT DEFAULT 'черновик'
        ");
        echo "✓ Column tag added successfully\n";
    }

    echo "\nTag system:\n";
    echo "- черновик: Draft, visible only to author\n";
    echo "- лента: Published to feed, visible to all but not in sidebar\n";
    echo "- Custom tags (стихи, рассказы, etc): Visible in sidebar categories\n";

} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
