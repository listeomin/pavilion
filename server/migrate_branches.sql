-- Migration for branches feature

-- Table for branches (topics/threads)
CREATE TABLE IF NOT EXISTS branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    creator_user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_user_id) REFERENCES users(id)
);

-- Table for branch messages
CREATE TABLE IF NOT EXISTS branch_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id INTEGER NOT NULL,
    user_id INTEGER,
    session_id TEXT,
    text TEXT NOT NULL,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_branch_messages_branch_id ON branch_messages(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_messages_created_at ON branch_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_branches_creator ON branches(creator_user_id);
