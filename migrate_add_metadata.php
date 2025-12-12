<?php
// migrate_add_metadata.php
require_once __DIR__ . '/server/db.php';

$db = get_db();

try {
    $db->exec("ALTER TABLE messages ADD COLUMN metadata TEXT DEFAULT NULL");
    echo "Migration completed: added metadata column\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'duplicate column name') !== false) {
        echo "Column metadata already exists\n";
    } else {
        throw $e;
    }
}
