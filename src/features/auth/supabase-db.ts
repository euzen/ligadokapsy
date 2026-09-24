import { createClient } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';
import { getLocales } from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

import type { AdminMetrics, AppRole, EditableProfile, EntityShare, Match, MatchAccess, MatchEvent, Page, PageCategory, PlayerStats, PublicMatch, RosterPlayer, Sport, Team, Tournament, TournamentTeam, UserProfile } from '@/types/database';

export const isSupabaseMode = process.env.EXPO_PUBLIC_DATA_MODE !== 'local';
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder';
if ((Platform.OS !== 'web' || typeof window !== 'undefined') && url.includes('placeholder.supabase.co')) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL is not set. Create a .env file with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then rebuild the native app or clear Metro cache with npx expo start --clear.');
}
const nativeStorage = { getItem: (name: string) => SecureStore.getItemAsync(name), setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value), removeItem: (name: string) => SecureStore.deleteItemAsync(name) };
export const supabase = createClient(url, key, { auth: { ...(Platform.OS === 'web' ? {} : { storage: nativeStorage }), persistSession: true, autoRefreshToken: true, detectSessionInUrl: Platform.OS === 'web' } });

function mapProfile(row: any): UserProfile { return { id: row.id, first_name: row.first_name, last_name: row.last_name, email: row.email, role: row.role, favoriteSport: row.favorite_sport, themePreference: row.theme_preference ?? 'dark', avatarUrl: row.avatar_url, profileColor: row.profile_color, createdAt: row.created_at, language: row.language }; }
function mapSport(row: any): Sport { return { ...row, active: Boolean(row.active), periods_config: typeof row.periods_config === 'string' ? row.periods_config : JSON.stringify(row.periods_config) }; }
function parseRosterLine(line: string, tournament_team_id: string) {
  const trimmed = line.trim();
  const match = trimmed.match(/^(?:(\d+)\s+)?(.+)$/);
  const jersey_number = match?.[1] ? Number(match[1]) : null;
  const name = (match?.[2] ?? trimmed).trim();
  const lastSpace = name.lastIndexOf(' ');
  if (lastSpace > 0) {
    return { tournament_team_id, first_name: name.slice(0, lastSpace).trim(), last_name: name.slice(lastSpace + 1).trim(), jersey_number, position: null, is_captain: false };
  }
  return { tournament_team_id, first_name: name, last_name: '', jersey_number, position: null, is_captain: false };
}
function fail(error: { message: string } | null) { if (error) throw new Error(error.message); }
async function currentUserId() { const { data } = await supabase.auth.getUser(); if (!data.user) throw new Error('auth.required'); return data.user.id; }

async function uploadDataUri(value: string | null | undefined, bucket: 'avatars' | 'logos') {
  if (!value?.startsWith('data:')) return value;
  const userId = await currentUserId(); const mime = value.slice(5, value.indexOf(';')) || 'image/jpeg'; const extension = mime.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'; const path = `${userId}/${Crypto.randomUUID()}.${extension}`; const bytes = await fetch(value).then((response) => response.arrayBuffer());
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, { contentType: mime, upsert: false }); fail(error); return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function sbSignIn(email: string, password: string) { const { data, error } = await supabase.auth.signInWithPassword({ email, password }); fail(error); if (!data.user) throw new Error('auth.required'); const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', data.user.id).single(); fail(profileError); return mapProfile(profile); }
export async function sbSignUp(firstName: string, lastName: string, email: string, password: string) { const languageCode = getLocales()[0]?.languageCode; const language = languageCode === 'cs' || languageCode === 'sk' ? 'cs' : 'en'; const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { first_name: firstName, last_name: lastName, language } } }); fail(error); if (!data.session) throw new Error('auth.emailConfirmationRequired'); const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', data.user!.id).single(); fail(profileError); return mapProfile(profile); }
export async function sbRestoreSession() { const { data } = await supabase.auth.getSession(); if (!data.session) return null; const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.session.user.id).maybeSingle(); return profile ? mapProfile(profile) : null; }
export async function sbSignOut() { const { error } = await supabase.auth.signOut(); fail(error); }
export async function sbListUsers() { const { data, error } = await supabase.from('profiles').select('*').order('created_at'); fail(error); return (data ?? []).map(mapProfile); }
export async function sbUpdateUser(id: string, values: Partial<EditableProfile> & { role?: AppRole }) { const { data: auth } = await supabase.auth.getUser(); if (auth.user?.id === id && values.email && values.email !== auth.user.email) { const { error } = await supabase.auth.updateUser({ email: values.email }); fail(error); } const avatarUrl = Object.hasOwn(values, 'avatarUrl') ? await uploadDataUri(values.avatarUrl, 'avatars') : undefined; const payload: any = { first_name: values.first_name, last_name: values.last_name, email: values.email, favorite_sport: values.favoriteSport, theme_preference: values.themePreference, profile_color: values.profileColor, language: values.language, role: values.role }; if (avatarUrl !== undefined) payload.avatar_url = avatarUrl; Object.keys(payload).forEach((name) => payload[name] === undefined && delete payload[name]); const { data, error } = await supabase.from('profiles').update(payload).eq('id', id).select().single(); fail(error); return mapProfile(data); }
export async function sbDeleteUser(id: string) { const { error } = await supabase.rpc('admin_delete_user', { target: id }); fail(error); }
export async function sbMetrics(): Promise<AdminMetrics> { const [users, tournaments, active, teams, matches] = await Promise.all([supabase.from('profiles').select('*', { count: 'exact', head: true }), supabase.from('tournaments').select('*', { count: 'exact', head: true }), supabase.from('tournaments').select('*', { count: 'exact', head: true }).eq('status', 'published'), supabase.from('teams').select('*', { count: 'exact', head: true }), supabase.from('matches').select('*', { count: 'exact', head: true })]); return { users: users.count ?? 0, tournaments: tournaments.count ?? 0, activeTournaments: active.count ?? 0, teams: teams.count ?? 0, matches: matches.count ?? 0, databaseBytes: 0 }; }

export async function sbListTeams() { const { data, error } = await supabase.from('teams').select('*').order('name'); fail(error); return data as Team[]; }
export async function sbCreateTeam(values: Omit<Team, 'id' | 'created_by'>) { const created_by = await currentUserId(); const logo_url = await uploadDataUri(values.logo_url, 'logos'); const { data, error } = await supabase.from('teams').insert({ ...values, logo_url, created_by }).select().single(); fail(error); return data as Team; }
export async function sbUpdateTeam(id: string, values: Omit<Team, 'id' | 'created_by'>) { const logo_url = await uploadDataUri(values.logo_url, 'logos'); const { error } = await supabase.from('teams').update({ ...values, logo_url }).eq('id', id); fail(error); }
export async function sbDeleteTeam(id: string) { const { error } = await supabase.from('teams').delete().eq('id', id); fail(error); }

export async function sbListTournaments() { const { data, error } = await supabase.from('tournaments').select('*').order('start_date'); fail(error); return data as Tournament[]; }
export async function sbGetTournament(id: string) { const { data } = await supabase.from('tournaments').select('*').eq('id', id).maybeSingle(); return data as Tournament | null; }
export async function sbCreateTournament(values: Omit<Tournament, 'id' | 'created_by' | 'status' | 'rosters_locked'>) { const created_by = await currentUserId(); const logo_url = await uploadDataUri(values.logo_url, 'logos'); const { data, error } = await supabase.from('tournaments').insert({ ...values, logo_url, created_by, status: 'draft' }).select().single(); fail(error); return data as Tournament; }
export async function sbUpdateTournament(id: string, values: Partial<Omit<Tournament, 'id' | 'created_by' | 'rosters_locked'>>) { const payload: any = { ...values }; if (Object.hasOwn(values, 'logo_url')) payload.logo_url = await uploadDataUri(values.logo_url, 'logos'); const { data, error } = await supabase.from('tournaments').update(payload).eq('id', id).select().single(); fail(error); return data as Tournament; }
export async function sbDeleteTournament(id: string) { const { error } = await supabase.from('tournaments').delete().eq('id', id); fail(error); }
export async function sbTournamentTeams(id: string) { const { data, error } = await supabase.from('tournament_teams').select('team:teams(*)').eq('tournament_id', id); fail(error); return (data ?? []).map((item: any) => item.team) as Team[]; }
export async function sbTournamentTeamAssignments(id: string) { const { data, error } = await supabase.from('tournament_teams').select('*, team:teams(*)').eq('tournament_id', id); fail(error); return (data ?? []).map((item: any) => ({ ...item, team: item.team })) as TournamentTeam[]; }
export async function sbAddTournamentTeam(tournament_id: string, team_id: string) { const { error } = await supabase.from('tournament_teams').insert({ tournament_id, team_id }); fail(error); }
export async function sbRemoveTournamentTeam(tournament_id: string, team_id: string) { const { error } = await supabase.from('tournament_teams').delete().match({ tournament_id, team_id }); fail(error); }
export async function sbUpdateRosterLock(tournamentTeamId: string, locked: boolean) { const { error } = await supabase.from('tournament_teams').update({ rosters_locked: locked }).eq('id', tournamentTeamId); fail(error); }

export async function sbListTeamRosters(teamId: string) { const { data, error } = await supabase.from('team_rosters').select('*').eq('team_id', teamId).order('last_name').order('first_name'); fail(error); return data as RosterPlayer[]; }
export async function sbCreateTeamRoster(teamId: string, values: Omit<RosterPlayer, 'id' | 'team_id' | 'user_id' | 'created_by'>) { const created_by = await currentUserId(); const { data, error } = await supabase.from('team_rosters').insert({ ...values, team_id: teamId, created_by }).select().single(); fail(error); return data as RosterPlayer; }
export async function sbUpdateTeamRoster(teamRosterId: string, values: Partial<Omit<RosterPlayer, 'id' | 'team_id' | 'user_id' | 'created_by'>>) { const { data, error } = await supabase.from('team_rosters').update(values).eq('id', teamRosterId).select().single(); fail(error); return data as RosterPlayer; }
export async function sbLinkTeamRosterPlayer(teamRosterId: string, userId: string | null) {
  const { data: row, error: fetchError } = await supabase.from('team_rosters').select('team_id, first_name, last_name, jersey_number').eq('id', teamRosterId).single();
  fail(fetchError);
  if (!row) throw new Error('rosters.notFound');
  const { error: teamError } = await supabase.from('team_rosters').update({ user_id: userId }).eq('id', teamRosterId);
  fail(teamError);
  const { data: assignments, error: assignmentError } = await supabase.from('tournament_teams').select('id').eq('team_id', row.team_id);
  fail(assignmentError);
  if (!assignments || assignments.length === 0) return;
  const updates = (assignments as { id: string }[]).map(async (assignment) => {
    const { data: matches, error: matchError } = await supabase
      .from('tournament_rosters')
      .select('id')
      .eq('tournament_team_id', assignment.id)
      .eq('first_name', row.first_name)
      .eq('last_name', row.last_name)
      .is('user_id', null);
    if (matchError) throw matchError;
    const candidates = (matches ?? []).filter((r: any) => (r.jersey_number ?? null) === (row.jersey_number ?? null));
    if (candidates.length === 1) {
      const { error: updateError } = await supabase.from('tournament_rosters').update({ user_id: userId }).eq('id', candidates[0].id);
      fail(updateError);
    }
  });
  await Promise.all(updates);
}
export async function sbDeleteTeamRoster(teamRosterId: string) { const { error } = await supabase.from('team_rosters').delete().eq('id', teamRosterId); fail(error); }

export async function sbListTournamentRosters(tournamentTeamId: string) { const { data, error } = await supabase.from('tournament_rosters').select('*').eq('tournament_team_id', tournamentTeamId).order('is_captain', { ascending: false }).order('last_name').order('first_name'); fail(error); return data as RosterPlayer[]; }
export async function sbCreateTournamentRoster(tournamentTeamId: string, values: Omit<RosterPlayer, 'id' | 'tournament_team_id' | 'user_id'>) { const { data, error } = await supabase.from('tournament_rosters').insert({ ...values, tournament_team_id: tournamentTeamId }).select().single(); fail(error); return data as RosterPlayer; }
export async function sbBulkImportTournamentRosters(tournamentTeamId: string, lines: string[]) { const inserts = lines.map((line) => parseRosterLine(line, tournamentTeamId)).filter((row) => row.first_name.length > 0); if (!inserts.length) return { created: 0 }; const { data, error } = await supabase.from('tournament_rosters').insert(inserts).select(); fail(error); return { created: (data ?? []).length }; }
export async function sbSyncMasterRoster(tournamentTeamId: string) {
  const { data: tt, error: ttError } = await supabase.from('tournament_teams').select('team_id, rosters_locked').eq('id', tournamentTeamId).single();
  fail(ttError);
  if (!tt) throw new Error('tournaments.notFound');
  if (tt.rosters_locked) throw new Error('rosters.locked');
  const { data: existing, error: existingError } = await supabase.from('tournament_rosters').select('id').eq('tournament_team_id', tournamentTeamId).limit(1);
  fail(existingError);
  if (existing && existing.length > 0) throw new Error('rosters.exists');
  const { data: master, error: masterError } = await supabase.from('team_rosters').select('*').eq('team_id', tt.team_id).order('last_name').order('first_name');
  fail(masterError);
  const rows = (master ?? []).map((row: any) => ({
    tournament_team_id: tournamentTeamId,
    user_id: row.user_id ?? null,
    first_name: row.first_name,
    last_name: row.last_name,
    jersey_number: row.jersey_number ?? null,
    position: row.position ?? null,
    is_captain: row.is_captain ?? false,
  }));
  if (rows.length === 0) return { created: 0 };
  const { data: inserted, error: insertError } = await supabase.from('tournament_rosters').insert(rows).select();
  fail(insertError);
  return { created: inserted?.length ?? 0 };
}
export async function sbLinkRosterPlayer(tournamentTeamId: string, rosterId: string, userId: string | null) { const { error } = await supabase.from('tournament_rosters').update({ user_id: userId }).eq('id', rosterId); fail(error); }

export async function sbPlayerStats(userId: string): Promise<PlayerStats> { const { data, error } = await supabase.rpc('player_stats', { target: userId }); fail(error); return data as PlayerStats; }
export async function sbUserTeams(userId: string): Promise<Team[]> { const { data, error } = await supabase.rpc('user_teams', { target: userId }); fail(error); return (data ?? []) as Team[]; }
export async function sbListTeamShares(teamId: string): Promise<EntityShare[]> { const { data, error } = await supabase.from('entity_shares').select('id, user_id, access_level, user:profiles(email, first_name, last_name)').eq('entity_type', 'team').eq('entity_id', teamId); fail(error); return (data ?? []).map((item: any) => ({ id: item.id, user_id: item.user_id, email: item.user?.email ?? '', first_name: item.user?.first_name ?? '', last_name: item.user?.last_name ?? '', access_level: item.access_level })); }
export async function sbAddTeamShare(teamId: string, userId: string, accessLevel: 'view' | 'edit' = 'view') { const { error } = await supabase.from('entity_shares').insert({ entity_type: 'team', entity_id: teamId, user_id: userId, access_level: accessLevel }); fail(error); }
export async function sbRemoveTeamShare(teamId: string, userId: string) { const { error } = await supabase.from('entity_shares').delete().match({ entity_type: 'team', entity_id: teamId, user_id: userId }); fail(error); }
export async function sbListTournamentShares(tournamentId: string): Promise<EntityShare[]> { const { data, error } = await supabase.from('entity_shares').select('id, user_id, access_level, user:profiles(email, first_name, last_name)').eq('entity_type', 'competition').eq('entity_id', tournamentId); fail(error); return (data ?? []).map((item: any) => ({ id: item.id, user_id: item.user_id, email: item.user?.email ?? '', first_name: item.user?.first_name ?? '', last_name: item.user?.last_name ?? '', access_level: item.access_level })); }
export async function sbAddTournamentShare(tournamentId: string, userId: string, accessLevel: 'view' | 'edit' = 'view') { const { error } = await supabase.from('entity_shares').insert({ entity_type: 'competition', entity_id: tournamentId, user_id: userId, access_level: accessLevel }); fail(error); }
export async function sbRemoveTournamentShare(tournamentId: string, userId: string) { const { error } = await supabase.from('entity_shares').delete().match({ entity_type: 'competition', entity_id: tournamentId, user_id: userId }); fail(error); }

export async function sbListSports(includeInactive = false) { let query = supabase.from('sports').select('*').order('name'); if (!includeInactive) query = query.eq('active', true); const { data, error } = await query; fail(error); return (data ?? []).map(mapSport); }
export async function sbCreateSport(values: Omit<Sport, 'id'>) { const { data, error } = await supabase.from('sports').insert({ ...values, periods_config: JSON.parse(values.periods_config) }).select().single(); fail(error); return mapSport(data); }
export async function sbUpdateSport(id: string, values: Partial<Omit<Sport, 'id'>>) { const payload: any = { ...values }; if (values.periods_config) payload.periods_config = JSON.parse(values.periods_config); const { data, error } = await supabase.from('sports').update(payload).eq('id', id).select().single(); fail(error); return mapSport(data); }
export async function sbDeleteSport(id: string) { const { error } = await supabase.from('sports').delete().eq('id', id); fail(error); }

export async function sbListMatches(tournamentId?: string) { let query = supabase.from('matches').select('*').order('match_date').order('match_time'); if (tournamentId) query = query.eq('tournament_id', tournamentId); const { data, error } = await query; fail(error); return data as Match[]; }
export async function sbCreateMatch(values: Omit<Match, 'id' | 'status' | 'home_score' | 'away_score' | 'clock_seconds' | 'clock_started_at' | 'current_period' | 'round_number' | 'bracket_position' | 'next_match_id' | 'next_match_slot' | 'bracket_type'>) { const { data, error } = await supabase.from('matches').insert({ ...values, status: 'scheduled' }).select().single(); fail(error); return data as Match; }
export async function sbUpdateMatch(id: string, values: Partial<Omit<Match, 'id' | 'tournament_id'>>) { const { data, error } = await supabase.from('matches').update(values).eq('id', id).select().single(); fail(error); return data as Match; }
export async function sbDeleteMatch(id: string) { const { error } = await supabase.from('matches').delete().eq('id', id); fail(error); }
export async function sbRoundRobin(tournamentId: string, values: { match_date?: string; pitch_location?: string }) { const teams = await sbTournamentTeams(tournamentId); const existing = await sbListMatches(tournamentId); let created = 0; for (let home = 0; home < teams.length; home++) for (let away = home + 1; away < teams.length; away++) if (!existing.some((match) => new Set([match.home_team_id, match.away_team_id]).has(teams[home].id) && new Set([match.home_team_id, match.away_team_id]).has(teams[away].id))) { await sbCreateMatch({ tournament_id: tournamentId, home_team_id: teams[home].id, away_team_id: teams[away].id, match_date: values.match_date ?? new Date().toISOString().slice(0, 10), match_time: `${String(9 + Math.floor(created / 2)).padStart(2, '0')}:${created % 2 ? '30' : '00'}`, pitch_location: values.pitch_location ?? 'TBD' }); created++; } return { created }; }
export async function sbGenerateAccess(matchId: string) { const { data, error } = await supabase.rpc('generate_match_access', { target_match: matchId }); fail(error); const row = Array.isArray(data) ? data[0] : data; return row as MatchAccess; }
export async function sbScorekeeperMatch(secret: string) { const { data, error } = await supabase.rpc('scorekeeper_match', { secret }); fail(error); const result = data as PublicMatch; if (!result.sport) { const { data: tournament } = await supabase.from('tournaments').select('sport').eq('id', result.match.tournament_id).single(); if (tournament) { const { data: sportRow } = await supabase.from('sports').select('*').eq('code', tournament.sport).single(); result.sport = sportRow ? mapSport(sportRow) : null; } } const { data: assignments } = await supabase.from('tournament_teams').select('id, team_id').eq('tournament_id', result.match.tournament_id).in('team_id', [result.match.home_team_id, result.match.away_team_id]); const byTeam = new Map((assignments ?? []).map((a: any) => [a.team_id, a.id as string])); const [homeR, awayR] = await Promise.all([ byTeam.get(result.match.home_team_id) ? sbListTournamentRosters(byTeam.get(result.match.home_team_id)!) : Promise.resolve([] as RosterPlayer[]), byTeam.get(result.match.away_team_id) ? sbListTournamentRosters(byTeam.get(result.match.away_team_id)!) : Promise.resolve([] as RosterPlayer[]), ]); result.homeRoster = homeR; result.awayRoster = awayR; return result; }
export async function sbPublicMatch(id: string) { const { data: match, error } = await supabase.from('matches').select('*, homeTeam:teams!matches_home_team_id_fkey(*), awayTeam:teams!matches_away_team_id_fkey(*), events:match_events(*)').eq('id', id).single(); fail(error); const { homeTeam, awayTeam, events, tournament_id, ...rest } = match as any; const { data: tournament } = await supabase.from('tournaments').select('sport').eq('id', tournament_id).single(); let sportRow = null; if (tournament) { const { data: row } = await supabase.from('sports').select('*').eq('code', tournament.sport).single(); sportRow = row ? mapSport(row) : null; } return { match: rest, homeTeam, awayTeam, events, homeRoster: [], awayRoster: [], sport: sportRow } as PublicMatch; }
export async function sbListMatchEvents(matchId: string) { const { data, error } = await supabase.from('match_events').select('*').eq('match_id', matchId).order('created_at').order('id'); fail(error); return data as MatchEvent[]; }
export async function sbCreateMatchEvent(matchId: string, values: Omit<MatchEvent, 'id' | 'match_id' | 'created_at'>) { const { data, error } = await supabase.from('match_events').insert({ ...values, match_id: matchId }).select().single(); fail(error); return data as MatchEvent; }
export async function sbUpdateMatchEvent(_matchId: string, eventId: string, values: Partial<Omit<MatchEvent, 'id' | 'match_id' | 'created_at'>>) { const { data, error } = await supabase.from('match_events').update(values).eq('id', eventId).select().single(); fail(error); return data as MatchEvent; }
export async function sbDeleteMatchEvent(_matchId: string, eventId: string) { const { error } = await supabase.from('match_events').delete().eq('id', eventId); fail(error); }
export async function sbRecordEvent(secret: string, event: Pick<MatchEvent, 'event_type' | 'team_id' | 'roster_player_id' | 'player_name'>) { const { error } = await supabase.rpc('record_match_event', { secret, event_name: event.event_type, target_team: event.team_id, player: event.player_name, roster: event.roster_player_id }); fail(error); }
export async function sbUndoEvent(secret: string) { const { error } = await supabase.rpc('undo_match_event', { secret }); fail(error); }

export async function sbAdvanceWinner(matchId: string) {
  const { data: match, error } = await supabase.from('matches').select('*').eq('id', matchId).single();
  fail(error);
  if (!match || match.status !== 'finished' || !match.next_match_id) return;
  const homeScore = match.home_score ?? 0;
  const awayScore = match.away_score ?? 0;
  if (homeScore === awayScore) return;
  const winnerId = homeScore > awayScore ? match.home_team_id : match.away_team_id;
  const slot = match.next_match_slot;
  if (!slot) return;
  const update: Record<string, string> = slot === 'home' ? { home_team_id: winnerId } : { away_team_id: winnerId };
  const { error: updateError } = await supabase.from('matches').update(update).eq('id', match.next_match_id);
  fail(updateError);
}

export async function sbGeneratePlayoffBracket(tournamentId: string, bracketMatches: { round_number: number; bracket_position: number; home_team_id: string; away_team_id: string; next_match_slot: 'home' | 'away' | null; bracket_type: 'winner' | 'loser' | 'third_place'; _next_index: number | null }[], matchDate: string, pitchLocation: string) {
  const PLACEHOLDER = '__BYE__';
  const createdIds: string[] = [];
  for (const bm of bracketMatches) {
    const home = bm.home_team_id === PLACEHOLDER ? null : bm.home_team_id;
    const away = bm.away_team_id === PLACEHOLDER ? null : bm.away_team_id;
    const { data, error } = await supabase.from('matches').insert({
      tournament_id: tournamentId,
      home_team_id: home ?? '00000000-0000-0000-0000-000000000000',
      away_team_id: away ?? '00000000-0000-0000-0000-000000000000',
      match_date: matchDate,
      match_time: '10:00',
      pitch_location: pitchLocation || 'TBD',
      status: 'scheduled',
      round_number: bm.round_number,
      bracket_position: bm.bracket_position,
      bracket_type: bm.bracket_type,
      next_match_slot: bm.next_match_slot,
    }).select().single();
    fail(error);
    createdIds.push(data.id);
  }
  // Link next_match_id pointers
  for (let i = 0; i < bracketMatches.length; i++) {
    const nextIdx = bracketMatches[i]._next_index;
    if (nextIdx !== null && nextIdx < createdIds.length) {
      const { error } = await supabase.from('matches').update({ next_match_id: createdIds[nextIdx] }).eq('id', createdIds[i]);
      fail(error);
    }
  }
  return { created: createdIds.length };
}

export async function sbListPages(category?: PageCategory) { let query = supabase.from('pages').select('*').order('order_index').order('title'); if (category) query = query.eq('category', category); const { data, error } = await query; fail(error); return (data ?? []) as Page[]; }
export async function sbGetPage(slug: string) { const { data, error } = await supabase.from('pages').select('*').eq('slug', slug).eq('is_published', true).single(); fail(error); return data as Page; }
export async function sbCreatePage(values: Omit<Page, 'id' | 'updated_at' | 'created_by'>) { const created_by = await currentUserId(); const { data, error } = await supabase.from('pages').insert({ ...values, created_by }).select().single(); fail(error); return data as Page; }
export async function sbUpdatePage(id: string, values: Partial<Omit<Page, 'id' | 'updated_at' | 'created_by'>>) { const { data, error } = await supabase.from('pages').update({ ...values, updated_at: new Date().toISOString() }).eq('id', id).select().single(); fail(error); return data as Page; }
export async function sbDeletePage(id: string) { const { error } = await supabase.from('pages').delete().eq('id', id); fail(error); }
