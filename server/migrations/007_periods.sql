-- Add current_period to matches for period tracking
ALTER TABLE matches ADD COLUMN current_period INTEGER NOT NULL DEFAULT 0;

-- Expand match_events event_type to include period_end and match_end
CREATE TABLE match_events_new (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('score', 'yellow_card', 'red_card', 'timer_start', 'timer_pause', 'period_end', 'period_start', 'match_end')),
  team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
  player_name TEXT,
  roster_player_id TEXT REFERENCES tournament_rosters(id) ON DELETE SET NULL,
  metadata TEXT,
  score_delta_home INTEGER NOT NULL DEFAULT 0,
  score_delta_away INTEGER NOT NULL DEFAULT 0,
  clock_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO match_events_new SELECT id, match_id, event_type, team_id, player_name, roster_player_id, NULL, score_delta_home, score_delta_away, clock_seconds, created_at FROM match_events;
DROP TABLE match_events;
ALTER TABLE match_events_new RENAME TO match_events;
CREATE INDEX match_events_match_id_idx ON match_events(match_id, created_at);
CREATE INDEX match_events_roster_idx ON match_events(roster_player_id);
