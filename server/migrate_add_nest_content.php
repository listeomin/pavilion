<?php
// server/migrate_add_nest_content.php
// Migration: Add nest_content table for storing user's Nest page content

require_once __DIR__ . '/db.php';

try {
    $db = get_db();

    echo "Creating nest_content table...\n";

    $db->exec("
        CREATE TABLE IF NOT EXISTS nest_content (
            user_id INTEGER PRIMARY KEY,
            content TEXT NOT NULL DEFAULT '{}',
            updated_at TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ");

    echo "✓ Table nest_content created successfully\n";
    echo "\nTable structure:\n";
    echo "- user_id: INTEGER (primary key, references users.id)\n";
    echo "- content: TEXT (JSON format, stores Quill Delta or blocks)\n";
    echo "- updated_at: TEXT (ISO timestamp)\n";
    echo "- created_at: TEXT (ISO timestamp)\n";

} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
