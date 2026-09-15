export type AppRole = 'user' | 'admin';

export type UserProfile = {
  id: string;
  displayName: string;
  email: string;
  role: AppRole;
  favoriteSport: string;
  avatarUrl: string | null;
  profileColor: string;
  createdAt: string;
  language: 'cs' | 'en';
};

export type EditableProfile = Pick<UserProfile, 'displayName' | 'email' | 'favoriteSport' | 'avatarUrl' | 'profileColor' | 'language'>;

export type SportSlug = string;
export type TournamentStatus = 'draft' | 'published' | 'completed';

export type Team = {
  id: string;
  name: string;
  short_name: string;
  primary_sport: SportSlug;
  color: string;
  logo_url: string | null;
  created_by: string;
};

export type Tournament = {
  id: string;
  name: string;
  sport: SportSlug;
  location: string;
  start_date: string;
  status: TournamentStatus;
  logo_url: string | null;
  created_by: string;
};

export type TournamentTeam = {
  tournament_id: string;
  team_id: string;
};

export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'cancelled';
export type Match = {
  id: string;
  tournament_id: string;
  home_team_id: string;
  away_team_id: string;
  match_date: string;
  match_time: string;
  pitch_location: string;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  clock_seconds: number;
  clock_started_at: string | null;
};

export type Sport = {
  id: string;
  name: string;
  code: string;
  active: boolean;
  scoring_type: string;
  periods_config: string;
};

export type MatchEvent = {
  id: string;
  match_id: string;
  event_type: 'score' | 'yellow_card' | 'red_card' | 'timer_start' | 'timer_pause';
  team_id: string | null;
  player_name: string | null;
  score_delta_home: number;
  score_delta_away: number;
  clock_seconds: number;
  created_at: string;
};

export type MatchAccess = { pin: string; token: string; expires_at: string };
export type PublicMatch = { match: Match; homeTeam: Team; awayTeam: Team; events: MatchEvent[] };

export type Standing = {
  team: Team;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

export type AdminMetrics = {
  users: number;
  tournaments: number;
  activeTournaments: number;
  teams: number;
  matches: number;
  databaseBytes: number;
};
