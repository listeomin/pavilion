PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE nest_sections (
            user_id INTEGER PRIMARY KEY,
            sections TEXT NOT NULL DEFAULT '[]',
            updated_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
INSERT INTO nest_sections VALUES(2,'["\u0441\u0442\u0438\u0445\u0438","\u0440\u0430\u0441\u0441\u043a\u0430\u0437\u044b","\u0440\u0430\u0437\u0440\u0430\u0431\u043e\u0442\u043a\u0430","\u0432\u043e\u0441\u043f\u043e\u043c\u0438\u043d\u0430\u043d\u0438\u044f"]','2026-01-02 00:11:49');
COMMIT;
