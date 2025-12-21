<?php
// server/db.php
function get_db(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;
    $path = __DIR__ . '/../chat.sqlite';
    $needInit = !file_exists($path);
    $pdo = new PDO('sqlite:' . $path);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec('PRAGMA foreign_keys = ON');
    if ($needInit) {
        $pdo->beginTransaction();
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL,
                telegram_id BIGINT UNIQUE,
                telegram_username TEXT,
                is_owner BOOLEAN DEFAULT 0
            );
        ");
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                author TEXT NOT NULL,
                text TEXT NOT NULL,
                metadata TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
            );
        ");
        $pdo->commit();
    }
    return $pdo;
}
