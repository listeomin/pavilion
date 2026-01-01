<?php
// server/migrate_add_nest_sections.php
// Migration: Add nest_sections table for storing user's custom section order

require_once __DIR__ . '/db.php';

try {
    $db = get_db();

    echo "Creating nest_sections table...\n";

    $db->exec("
        CREATE TABLE IF NOT EXISTS nest_sections (
            user_id INTEGER PRIMARY KEY,
            sections TEXT NOT NULL DEFAULT '[]',
            updated_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ");

    echo "✓ Table nest_sections created successfully\n";
    echo "\nTable structure:\n";
    echo "- user_id: INTEGER (primary key, references users.id)\n";
    echo "- sections: TEXT (JSON array of section names in order)\n";
    echo "- updated_at: TEXT (ISO timestamp)\n";

} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
