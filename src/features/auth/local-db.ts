import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import * as sb from '@/features/auth/supabase-db';
import type { AdminMetrics, AppRole, EditableProfile, Match, MatchAccess, MatchEvent, PlayerStats, PublicMatch, RosterPlayer, Sport, Team, Tournament, TournamentStatus, TournamentTeam, UserProfile } from '@/types/database';

const browserHost = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === 'android' ? 'http://10.0.2.2:3210/api' : `http://${browserHost}:3210/api`);
const TOKEN_KEY = 'ligadokapsy.session-token';
const userListeners = new Set<() => void>();
const dataListeners = new Set<() => void>();
let sessionToken: string | null = null;

async function token() {
  if (Platform.OS !== 'web' && sessionToken === null) sessionToken = await SecureStore.getItemAsync(TOKEN_KEY);
  return sessionToken;
}

async function request<T>(path: string, options: RequestInit = {}) {
  const authToken = await token();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}), ...options.headers },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'request.failed');
  return result as T;
}

async function storeToken(value?: string) {
  if (!value) return;
  sessionToken = value;
  if (Platform.OS !== 'web') await SecureStore.setItemAsync(TOKEN_KEY, value);
}

export async function signInLocal(email: string, password: string) {
  if (sb.isSupabaseMode) return sb.sbSignIn(email, password);
  const result = await request<{ profile: UserProfile; token: string }>('/auth/sign-in', { method: 'POST', body: JSON.stringify({ email, password }) });
  await storeToken(result.token); return result.profile;
}
export async function signUpLocal(displayName: string, email: string, password: string) {
  if (sb.isSupabaseMode) return sb.sbSignUp(displayName, email, password);
  const result = await request<{ profile: UserProfile; token: string }>('/auth/sign-up', { method: 'POST', body: JSON.stringify({ displayName, email, password }) });
  await storeToken(result.token); userListeners.forEach((listener) => listener()); return result.profile;
}
export async function restoreLocalSession() { if (sb.isSupabaseMode) return sb.sbRestoreSession(); try { return (await request<{ profile: UserProfile }>('/auth/me')).profile; } catch { return null; } }
export async function signOutLocal() { if (sb.isSupabaseMode) return sb.sbSignOut(); await request('/auth/sign-out', { method: 'POST' }); sessionToken = null; if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(TOKEN_KEY); }
export async function listLocalUsers() { if (sb.isSupabaseMode) return sb.sbListUsers(); return request<UserProfile[]>('/users'); }
export async function updateLocalUser(id: string, values: Partial<EditableProfile> & { role?: AppRole }) { if (sb.isSupabaseMode) { const profile = await sb.sbUpdateUser(id, values); userListeners.forEach((listener) => listener()); return profile; } const profile = await request<UserProfile>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(values) }); userListeners.forEach((listener) => listener()); return profile; }
export async function deleteLocalUser(id: string) { if (sb.isSupabaseMode) { await sb.sbDeleteUser(id); userListeners.forEach((listener) => listener()); dataListeners.forEach((listener) => listener()); return; } await request(`/users/${id}`, { method: 'DELETE' }); userListeners.forEach((listener) => listener()); dataListeners.forEach((listener) => listener()); }
export async function getAdminMetrics() { if (sb.isSupabaseMode) return sb.sbMetrics(); return request<AdminMetrics>('/admin/metrics'); }
export function subscribeLocalUsers(listener: () => void) { userListeners.add(listener); return () => userListeners.delete(listener); }

export async function listTeams() { if (sb.isSupabaseMode) return sb.sbListTeams(); return request<Team[]>('/teams'); }
export async function createTeam(values: Omit<Team, 'id' | 'created_by'>, _actor: UserProfile) { if (sb.isSupabaseMode) { const result = await sb.sbCreateTeam(values); dataListeners.forEach((listener) => listener()); return result; } const result = await request<Team>('/teams', { method: 'POST', body: JSON.stringify(values) }); dataListeners.forEach((listener) => listener()); return result; }
export async function updateTeam(id: string, values: Omit<Team, 'id' | 'created_by'>, _actor: UserProfile) { if (sb.isSupabaseMode) { await sb.sbUpdateTeam(id, values); dataListeners.forEach((listener) => listener()); return; } await request<Team>(`/teams/${id}`, { method: 'PATCH', body: JSON.stringify(values) }); dataListeners.forEach((listener) => listener()); }
export async function deleteTeam(id: string, _actor: UserProfile) { if (sb.isSupabaseMode) { await sb.sbDeleteTeam(id); dataListeners.forEach((listener) => listener()); return; } await request(`/teams/${id}`, { method: 'DELETE' }); dataListeners.forEach((listener) => listener()); }

export async function listTournaments() { if (sb.isSupabaseMode) return sb.sbListTournaments(); return request<Tournament[]>('/tournaments'); }
export async function getTournament(id: string) { if (sb.isSupabaseMode) return sb.sbGetTournament(id); try { return await request<Tournament>(`/tournaments/${id}`); } catch { return null; } }
export async function createTournament(values: Omit<Tournament, 'id' | 'created_by' | 'status' | 'rosters_locked'>, _actor: UserProfile) { if (sb.isSupabaseMode) { const result = await sb.sbCreateTournament(values); dataListeners.forEach((listener) => listener()); return result; } const result = await request<Tournament>('/tournaments', { method: 'POST', body: JSON.stringify(values) }); dataListeners.forEach((listener) => listener()); return result; }
export async function updateTournament(id: string, values: Partial<Omit<Tournament, 'id' | 'created_by' | 'rosters_locked'>>, _actor: UserProfile) { if (sb.isSupabaseMode) { const result = await sb.sbUpdateTournament(id, values); dataListeners.forEach((listener) => listener()); return result; } const result = await request<Tournament>(`/tournaments/${id}`, { method: 'PATCH', body: JSON.stringify(values) }); dataListeners.forEach((listener) => listener()); return result; }
export async function updateTournamentStatus(id: string, status: TournamentStatus, actor: UserProfile) { return updateTournament(id, { status }, actor); }
export async function deleteTournament(id: string, _actor: UserProfile) { if (sb.isSupabaseMode) { await sb.sbDeleteTournament(id); dataListeners.forEach((listener) => listener()); return; } await request(`/tournaments/${id}`, { method: 'DELETE' }); dataListeners.forEach((listener) => listener()); }
export async function listTournamentTeams(tournamentId: string) { if (sb.isSupabaseMode) return sb.sbTournamentTeams(tournamentId); return request<Team[]>(`/tournaments/${tournamentId}/teams`); }
export async function addTeamToTournament(tournamentId: string, teamId: string, _actor: UserProfile) { if (sb.isSupabaseMode) { await sb.sbAddTournamentTeam(tournamentId, teamId); dataListeners.forEach((listener) => listener()); return; } await request(`/tournaments/${tournamentId}/teams`, { method: 'POST', body: JSON.stringify({ teamId }) }); dataListeners.forEach((listener) => listener()); }
export async function removeTeamFromTournament(tournamentId: string, teamId: string, _actor: UserProfile) { if (sb.isSupabaseMode) { await sb.sbRemoveTournamentTeam(tournamentId, teamId); dataListeners.forEach((listener) => listener()); return; } await request(`/tournaments/${tournamentId}/teams/${teamId}`, { method: 'DELETE' }); dataListeners.forEach((listener) => listener()); }
export async function listSports(includeInactive = false) { if (sb.isSupabaseMode) return sb.sbListSports(includeInactive); return request<Sport[]>(`/sports${includeInactive ? '?all=1' : ''}`); }
export async function createSport(values: Omit<Sport, 'id'>) { if (sb.isSupabaseMode) { const result = await sb.sbCreateSport(values); dataListeners.forEach((listener) => listener()); return result; } const result = await request<Sport>('/sports', { method: 'POST', body: JSON.stringify(values) }); dataListeners.forEach((listener) => listener()); return result; }
export async function updateSport(id: string, values: Partial<Omit<Sport, 'id'>>) { if (sb.isSupabaseMode) { const result = await sb.sbUpdateSport(id, values); dataListeners.forEach((listener) => listener()); return result; } const result = await request<Sport>(`/sports/${id}`, { method: 'PATCH', body: JSON.stringify(values) }); dataListeners.forEach((listener) => listener()); return result; }
export async function deleteSport(id: string) { if (sb.isSupabaseMode) { await sb.sbDeleteSport(id); dataListeners.forEach((listener) => listener()); return; } await request(`/sports/${id}`, { method: 'DELETE' }); dataListeners.forEach((listener) => listener()); }
export async function listMatches(tournamentId?: string) { if (sb.isSupabaseMode) return sb.sbListMatches(tournamentId); return request<Match[]>(`/matches${tournamentId ? `?tournamentId=${encodeURIComponent(tournamentId)}` : ''}`); }
export async function createMatch(values: Omit<Match, 'id' | 'status' | 'home_score' | 'away_score' | 'clock_seconds' | 'clock_started_at'>, _actor: UserProfile) { if (sb.isSupabaseMode) { const result = await sb.sbCreateMatch(values); dataListeners.forEach((listener) => listener()); return result; } const result = await request<Match>('/matches', { method: 'POST', body: JSON.stringify(values) }); dataListeners.forEach((listener) => listener()); return result; }
export async function updateMatch(id: string, values: Partial<Omit<Match, 'id' | 'tournament_id'>>, _actor: UserProfile) { if (sb.isSupabaseMode) { const result = await sb.sbUpdateMatch(id, values); dataListeners.forEach((listener) => listener()); return result; } const result = await request<Match>(`/matches/${id}`, { method: 'PATCH', body: JSON.stringify(values) }); dataListeners.forEach((listener) => listener()); return result; }
export async function deleteMatch(id: string, _actor: UserProfile) { if (sb.isSupabaseMode) { await sb.sbDeleteMatch(id); dataListeners.forEach((listener) => listener()); return; } await request(`/matches/${id}`, { method: 'DELETE' }); dataListeners.forEach((listener) => listener()); }
export async function generateRoundRobin(tournamentId: string, values: { match_date?: string; pitch_location?: string }, _actor: UserProfile) { if (sb.isSupabaseMode) { const result = await sb.sbRoundRobin(tournamentId, values); dataListeners.forEach((listener) => listener()); return result; } const result = await request<{ created: number }>(`/tournaments/${tournamentId}/generate-schedule`, { method: 'POST', body: JSON.stringify(values) }); dataListeners.forEach((listener) => listener()); return result; }
export async function listTournamentTeamAssignments(tournamentId: string) { if (sb.isSupabaseMode) return sb.sbTournamentTeamAssignments(tournamentId); return request<TournamentTeam[]>(`/tournaments/${tournamentId}/teams-assignments`); }
export async function updateRosterLock(tournamentTeamId: string, locked: boolean, _actor: UserProfile) { if (sb.isSupabaseMode) { await sb.sbUpdateRosterLock(tournamentTeamId, locked); dataListeners.forEach((listener) => listener()); return; } await request(`/tournament-teams/${tournamentTeamId}/roster-lock`, { method: 'PATCH', body: JSON.stringify({ locked }) }); dataListeners.forEach((listener) => listener()); }
export async function listTeamRosters(teamId: string) { if (sb.isSupabaseMode) return sb.sbListTeamRosters(teamId); return request<RosterPlayer[]>(`/teams/${teamId}/rosters`); }
export async function createTeamRoster(teamId: string, values: Omit<RosterPlayer, 'id' | 'team_id' | 'user_id' | 'created_by'>, _actor: UserProfile) { if (sb.isSupabaseMode) { const result = await sb.sbCreateTeamRoster(teamId, values); dataListeners.forEach((listener) => listener()); return result; } const result = await request<RosterPlayer>(`/teams/${teamId}/rosters`, { method: 'POST', body: JSON.stringify(values) }); dataListeners.forEach((listener) => listener()); return result; }
export async function updateTeamRoster(teamRosterId: string, values: Partial<Omit<RosterPlayer, 'id' | 'team_id' | 'user_id' | 'created_by'>>, _actor: UserProfile) { if (sb.isSupabaseMode) { const result = await sb.sbUpdateTeamRoster(teamRosterId, values); dataListeners.forEach((listener) => listener()); return result; } const result = await request<RosterPlayer>(`/team-rosters/${teamRosterId}`, { method: 'PATCH', body: JSON.stringify(values) }); dataListeners.forEach((listener) => listener()); return result; }
export async function deleteTeamRoster(teamRosterId: string, _actor: UserProfile) { if (sb.isSupabaseMode) { await sb.sbDeleteTeamRoster(teamRosterId); dataListeners.forEach((listener) => listener()); return; } await request(`/team-rosters/${teamRosterId}`, { method: 'DELETE' }); dataListeners.forEach((listener) => listener()); }
export async function listTournamentRosters(tournamentTeamId: string) { if (sb.isSupabaseMode) return sb.sbListTournamentRosters(tournamentTeamId); return request<RosterPlayer[]>(`/tournament-teams/${tournamentTeamId}/rosters`); }
export async function createTournamentRoster(tournamentTeamId: string, values: Omit<RosterPlayer, 'id' | 'tournament_team_id' | 'user_id'>, _actor: UserProfile) { if (sb.isSupabaseMode) { const result = await sb.sbCreateTournamentRoster(tournamentTeamId, values); dataListeners.forEach((listener) => listener()); return result; } const result = await request<RosterPlayer>(`/tournament-teams/${tournamentTeamId}/rosters`, { method: 'POST', body: JSON.stringify(values) }); dataListeners.forEach((listener) => listener()); return result; }
export async function bulkImportTournamentRosters(tournamentTeamId: string, lines: string[], _actor: UserProfile) { if (sb.isSupabaseMode) { const result = await sb.sbBulkImportTournamentRosters(tournamentTeamId, lines); dataListeners.forEach((listener) => listener()); return result; } const result = await request<{ created: number }>(`/tournament-teams/${tournamentTeamId}/rosters/bulk`, { method: 'POST', body: JSON.stringify({ lines }) }); dataListeners.forEach((listener) => listener()); return result; }
export async function syncMasterRoster(tournamentTeamId: string, _actor: UserProfile) { if (sb.isSupabaseMode) { await sb.sbSyncMasterRoster(tournamentTeamId); dataListeners.forEach((listener) => listener()); return; } await request(`/tournament-teams/${tournamentTeamId}/rosters/sync`, { method: 'POST' }); dataListeners.forEach((listener) => listener()); }
export async function linkRosterPlayer(tournamentTeamId: string, rosterId: string, userId: string | null, _actor: UserProfile) { if (sb.isSupabaseMode) { await sb.sbLinkRosterPlayer(tournamentTeamId, rosterId, userId); dataListeners.forEach((listener) => listener()); return; } await request(`/tournament-teams/${tournamentTeamId}/rosters/${rosterId}/link`, { method: 'PATCH', body: JSON.stringify({ userId }) }); dataListeners.forEach((listener) => listener()); }
export async function playerStats(userId: string): Promise<PlayerStats> { if (sb.isSupabaseMode) return sb.sbPlayerStats(userId); return request<PlayerStats>(`/users/${userId}/stats`); }
export async function generateMatchAccess(matchId: string) { if (sb.isSupabaseMode) return sb.sbGenerateAccess(matchId); return request<MatchAccess>(`/matches/${matchId}/access`, { method: 'POST' }); }
export async function getScorekeeperMatch(secret: string) { if (sb.isSupabaseMode) return sb.sbScorekeeperMatch(secret); return request<PublicMatch>('/scorekeeper/access', { method: 'POST', body: JSON.stringify({ secret }) }); }
export async function getPublicMatch(id: string) { if (sb.isSupabaseMode) return sb.sbPublicMatch(id); return request<PublicMatch>(`/public/matches/${id}`); }
export async function recordMatchEvent(secret: string, event: Pick<MatchEvent, 'event_type' | 'team_id' | 'roster_player_id' | 'player_name'>) { if (sb.isSupabaseMode) { await sb.sbRecordEvent(secret, event); dataListeners.forEach((listener) => listener()); return; } await request('/scorekeeper/event', { method: 'POST', body: JSON.stringify({ secret, ...event }) }); dataListeners.forEach((listener) => listener()); }
export async function undoMatchEvent(secret: string) { if (sb.isSupabaseMode) { await sb.sbUndoEvent(secret); dataListeners.forEach((listener) => listener()); return; } await request('/scorekeeper/undo', { method: 'POST', body: JSON.stringify({ secret }) }); dataListeners.forEach((listener) => listener()); }
export function subscribeLocalData(listener: () => void) { dataListeners.add(listener); return () => dataListeners.delete(listener); }
