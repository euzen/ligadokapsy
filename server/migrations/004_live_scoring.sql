ALTER TABLE users ADD COLUMN language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('cs', 'en'));

CREATE TABLE sports (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE COLLATE NOCASE,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  scoring_type TEXT NOT NULL,
  periods_config TEXT NOT NULL DEFAULT '{}'
);

INSERT INTO sports (id, name, code, active, scoring_type, periods_config) VALUES
  ('sport-football', 'Football', 'football', 1, 'goals', '{"periods":2,"minutes":45}'),
  ('sport-basketball', 'Basketball', 'basketball', 1, 'points', '{"periods":4,"minutes":10}'),
  ('sport-tennis', 'Tennis', 'tennis', 1, 'sets', '{"bestOf":3}'),
  ('sport-hockey', 'Hockey', 'hockey', 1, 'goals', '{"periods":3,"minutes":20}'),
  ('sport-volleyball', 'Volleyball', 'volleyball', 1, 'sets', '{"bestOf":5}');

ALTER TABLE matches RENAME TO matches_legacy;
CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  home_team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  away_team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  match_date TEXT NOT NULL,
  match_time TEXT NOT NULL,
  pitch_location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'finished', 'cancelled')),
  home_score INTEGER CHECK (home_score IS NULL OR home_score >= 0),
  away_score INTEGER CHECK (away_score IS NULL OR away_score >= 0),
  clock_seconds INTEGER NOT NULL DEFAULT 0 CHECK (clock_seconds >= 0),
  clock_started_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (home_team_id <> away_team_id)
);
INSERT INTO matches (id, tournament_id, home_team_id, away_team_id, match_date, match_time, pitch_location, status, home_score, away_score, created_at)
SELECT id, tournament_id, home_team_id, away_team_id, match_date, match_time, pitch_location, CASE WHEN status = 'completed' THEN 'finished' ELSE status END, home_score, away_score, created_at FROM matches_legacy;
DROP TABLE matches_legacy;
CREATE INDEX matches_tournament_id_idx ON matches(tournament_id);
CREATE INDEX matches_date_idx ON matches(match_date, match_time);

CREATE TABLE match_access_codes (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  pin TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE match_events (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('score', 'yellow_card', 'red_card', 'timer_start', 'timer_pause')),
  team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
  player_name TEXT,
  score_delta_home INTEGER NOT NULL DEFAULT 0,
  score_delta_away INTEGER NOT NULL DEFAULT 0,
  clock_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX match_events_match_id_idx ON match_events(match_id, created_at);
