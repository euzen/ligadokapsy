export type AppRole = 'user' | 'admin';

export type UserProfile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: AppRole;
  favoriteSport: string;
  avatarUrl: string | null;
  profileColor: string;
  createdAt: string;
  language: 'cs' | 'en';
};

export type EditableProfile = Pick<UserProfile, 'first_name' | 'last_name' | 'email' | 'favoriteSport' | 'avatarUrl' | 'profileColor' | 'language'>;

export type SportSlug = string;
export type TournamentStatus = 'draft' | 'published' | 'completed';

export type Team = {
  id: string;
  name: string;
  primary_sport: SportSlug;
  color: string;
  logo_url: string | null;
  is_private: boolean;
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
  is_private: boolean;
  created_by: string;
  rosters_locked: boolean;
};

export type TournamentTeam = {
  id: string;
  tournament_id: string;
  team_id: string;
  rosters_locked: boolean;
};

export type RosterPlayer = {
  id: string;
  tournament_team_id?: string;
  team_id?: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  jersey_number: number | null;
  position: string | null;
  is_captain: boolean;
  created_at?: string;
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
  current_period: number;
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
  event_type: 'score' | 'yellow_card' | 'red_card' | 'timer_start' | 'timer_pause' | 'period_end' | 'period_start' | 'match_end';
  team_id: string | null;
  roster_player_id: string | null;
  player_name: string | null;
  score_delta_home: number;
  score_delta_away: number;
  clock_seconds: number;
  created_at: string;
};

export type MatchAccess = { pin: string; token: string; expires_at: string };
export type PublicMatch = { match: Match; homeTeam: Team; awayTeam: Team; events: MatchEvent[]; homeRoster: RosterPlayer[]; awayRoster: RosterPlayer[] };

export type EntityShare = {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  access_level: 'view' | 'edit';
};

export type PlayerStats = {
  matchesPlayed: number;
  goals: number;
  yellowCards: number;
  redCards: number;
};

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

export function fullName(profile: { first_name: string; last_name: string }) {
  return `${profile.first_name} ${profile.last_name}`.trim();
}

export function rosterFullName(player: { first_name: string; last_name: string }) {
  return `${player.first_name} ${player.last_name}`.trim();
}

export function initialsFromName(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}
