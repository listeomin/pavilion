-- Create table for storing post counts per tag/category
-- This eliminates the need to count posts on every request
CREATE TABLE IF NOT EXISTS nest_post_counts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  tag TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, tag),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_nest_post_counts_user_tag ON nest_post_counts(user_id, tag);

-- Initialize counters from existing posts
INSERT OR REPLACE INTO nest_post_counts (user_id, tag, count, updated_at)
SELECT
  user_id,
  LOWER(tag) as tag,
  COUNT(*) as count,
  datetime('now') as updated_at
FROM nest_posts
WHERE tag IS NOT NULL AND tag != ''
GROUP BY user_id, LOWER(tag);
