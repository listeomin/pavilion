-- Migration: Create tables for nest discussions feature
-- Date: 2026-01-10
-- Description: Tables for text quotations and discussions in blog posts
-- Database: SQLite

-- Table for discussions (quotations)
CREATE TABLE IF NOT EXISTS nest_discussions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,

  -- Quote text and identification
  quote_text TEXT NOT NULL,
  quote_hash TEXT NOT NULL,  -- MD5 hash for duplicate detection

  -- Position in text (W3C TextPositionSelector approach)
  position_start INTEGER NOT NULL,      -- Character offset from start
  position_end INTEGER NOT NULL,        -- Character offset from end

  -- Context for finding quote if text changes (W3C TextQuoteSelector)
  context_before TEXT,      -- Text before quote
  context_after TEXT,       -- Text after quote

  -- Author info (anonymous users before auth implementation)
  created_by_session TEXT NOT NULL,  -- Session ID
  created_by_emoji TEXT,              -- User emoji
  created_by_name TEXT,              -- User name

  -- Metadata
  is_context_valid INTEGER DEFAULT 1,     -- 1 = TRUE, 0 = FALSE (if original text was changed/deleted)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for nest_discussions
CREATE INDEX IF NOT EXISTS idx_discussions_post_id ON nest_discussions(post_id);
CREATE INDEX IF NOT EXISTS idx_discussions_quote_hash ON nest_discussions(quote_hash);
CREATE INDEX IF NOT EXISTS idx_discussions_created_at ON nest_discussions(created_at);

-- Table for comments in discussions
CREATE TABLE IF NOT EXISTS nest_discussion_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discussion_id INTEGER NOT NULL,

  -- Comment content
  comment_text TEXT NOT NULL,

  -- Author info (same as discussions)
  created_by_session TEXT NOT NULL,
  created_by_emoji TEXT,
  created_by_name TEXT,

  -- Metadata
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  -- Foreign key
  FOREIGN KEY (discussion_id) REFERENCES nest_discussions(id) ON DELETE CASCADE
);

-- Indexes for nest_discussion_comments
CREATE INDEX IF NOT EXISTS idx_comments_discussion_id ON nest_discussion_comments(discussion_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON nest_discussion_comments(created_at);
