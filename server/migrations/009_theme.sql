-- Add theme preference to user profiles
ALTER TABLE users ADD COLUMN theme_preference TEXT NOT NULL DEFAULT 'dark' CHECK (theme_preference IN ('system', 'light', 'dark'));
