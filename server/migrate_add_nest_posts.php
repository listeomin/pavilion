<?php
// server/migrate_add_nest_posts.php
// Migration: Add nest_posts table for individual posts

require_once __DIR__ . '/db.php';

try {
    $db = get_db();

    echo "Creating nest_posts table...\n";

    $db->exec("
        CREATE TABLE IF NOT EXISTS nest_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            slug TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(user_id, slug),
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ");

    echo "✓ Table nest_posts created successfully\n";
    echo "\nTable structure:\n";
    echo "- id: INTEGER (primary key, auto increment)\n";
    echo "- user_id: INTEGER (references users.id)\n";
    echo "- slug: TEXT (URL-friendly name, e.g. 'veter')\n";
    echo "- title: TEXT (post title)\n";
    echo "- content: TEXT (JSON format, EditorJS blocks)\n";
    echo "- created_at: TEXT (ISO timestamp)\n";
    echo "- updated_at: TEXT (ISO timestamp)\n";
    echo "- UNIQUE(user_id, slug)\n";

} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
