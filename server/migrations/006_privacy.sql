PRAGMA foreign_keys = ON;

ALTER TABLE teams ADD COLUMN is_private INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tournaments ADD COLUMN is_private INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS entity_shares (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('team', 'competition')),
  entity_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_level TEXT NOT NULL DEFAULT 'view' CHECK (access_level IN ('view', 'edit')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (entity_type, entity_id, user_id)
);

CREATE INDEX IF NOT EXISTS entity_shares_entity_idx ON entity_shares(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS entity_shares_user_idx ON entity_shares(user_id, entity_type);
