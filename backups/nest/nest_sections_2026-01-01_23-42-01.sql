PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE nest_sections (
            user_id INTEGER PRIMARY KEY,
            sections TEXT NOT NULL DEFAULT '[]',
            updated_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
COMMIT;
