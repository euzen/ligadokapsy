-- Add metadata JSON column to match_events for special event labels (e.g. penalty, own goal)
ALTER TABLE match_events ADD COLUMN metadata TEXT;
