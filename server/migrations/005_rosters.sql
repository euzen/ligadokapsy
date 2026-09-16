ALTER TABLE tournament_teams RENAME TO tournament_teams_old;

CREATE TABLE tournament_teams (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  rosters_locked INTEGER NOT NULL DEFAULT 0 CHECK (rosters_locked IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tournament_id, team_id)
);

INSERT INTO tournament_teams (id, tournament_id, team_id, rosters_locked, created_at)
SELECT lower(hex(randomblob(16))), tournament_id, team_id, 0, created_at FROM tournament_teams_old;

DROP TABLE tournament_teams_old;

CREATE INDEX tournament_teams_tournament_idx ON tournament_teams(tournament_id);
CREATE INDEX tournament_teams_team_idx ON tournament_teams(team_id);

CREATE TABLE team_rosters (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  player_name TEXT NOT NULL,
  jersey_number INTEGER,
  position TEXT,
  is_captain INTEGER NOT NULL DEFAULT 0 CHECK (is_captain IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX team_rosters_team_idx ON team_rosters(team_id);

CREATE TABLE tournament_rosters (
  id TEXT PRIMARY KEY,
  tournament_team_id TEXT NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  player_name TEXT NOT NULL,
  jersey_number INTEGER,
  position TEXT,
  is_captain INTEGER NOT NULL DEFAULT 0 CHECK (is_captain IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX tournament_rosters_team_idx ON tournament_rosters(tournament_team_id);

ALTER TABLE tournaments ADD COLUMN rosters_locked INTEGER NOT NULL DEFAULT 0 CHECK (rosters_locked IN (0, 1));
ALTER TABLE match_events ADD COLUMN roster_player_id TEXT REFERENCES tournament_rosters(id) ON DELETE SET NULL;
CREATE INDEX match_events_roster_idx ON match_events(roster_player_id);
