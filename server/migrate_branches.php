#!/usr/bin/env php
<?php
// migrate_branches.php - Run branches migration

require_once __DIR__ . '/db.php';

echo "Running branches migration...\n";

try {
    $db = get_db();

    // Read and execute migration SQL
    $sql = file_get_contents(__DIR__ . '/migrate_branches.sql');
    $db->exec($sql);

    echo "✓ Migration completed successfully!\n";
    echo "  - Created 'branches' table\n";
    echo "  - Created 'branch_messages' table\n";
    echo "  - Created indexes\n";

} catch (Exception $e) {
    echo "✗ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
