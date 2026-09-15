PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  home_team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  away_team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  match_date TEXT NOT NULL,
  match_time TEXT NOT NULL,
  pitch_location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
  home_score INTEGER CHECK (home_score IS NULL OR home_score >= 0),
  away_score INTEGER CHECK (away_score IS NULL OR away_score >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (home_team_id <> away_team_id)
);

CREATE INDEX IF NOT EXISTS matches_tournament_id_idx ON matches(tournament_id);
CREATE INDEX IF NOT EXISTS matches_date_idx ON matches(match_date, match_time);

INSERT OR IGNORE INTO matches (id, tournament_id, home_team_id, away_team_id, match_date, match_time, pitch_location, status)
VALUES ('match-spring-1', 'tournament-spring', 'team-lions', 'team-wolves', '2026-05-10', '10:00', 'Main Pitch', 'scheduled');
