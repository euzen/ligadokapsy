PRAGMA foreign_keys = ON;

-- Add format to tournaments
ALTER TABLE tournaments ADD COLUMN format TEXT NOT NULL DEFAULT 'league' CHECK (format IN ('league', 'playoff', 'hybrid'));

-- Add bracket fields to matches
ALTER TABLE matches ADD COLUMN round_number INTEGER;
ALTER TABLE matches ADD COLUMN bracket_position INTEGER;
ALTER TABLE matches ADD COLUMN next_match_id TEXT REFERENCES matches(id) ON DELETE SET NULL;
ALTER TABLE matches ADD COLUMN next_match_slot TEXT CHECK (next_match_slot IS NULL OR next_match_slot IN ('home', 'away'));
ALTER TABLE matches ADD COLUMN bracket_type TEXT NOT NULL DEFAULT 'winner' CHECK (bracket_type IN ('winner', 'loser', 'third_place'));

CREATE INDEX IF NOT EXISTS matches_bracket_idx ON matches(tournament_id, round_number, bracket_position);
