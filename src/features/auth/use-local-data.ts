import { useCallback, useEffect, useState } from 'react';

import { listMatches, listSports, listTeamRosters, listTeams, listTournamentRosters, listTournaments, listTournamentTeamAssignments, listTournamentTeams, subscribeLocalData } from '@/features/auth/local-db';
import type { Match, RosterPlayer, Sport, Team, Tournament } from '@/types/database';

type TournamentTeam = { id: string; tournament_id: string; team_id: string; rosters_locked: boolean };

export function useTeamRosters(teamId: string) {
  const loader = useCallback(() => listTeamRosters(teamId), [teamId]);
  return useCollection<RosterPlayer>(loader);
}

function useCollection<T>(loader: () => Promise<T[]>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(() => { void loader().then((items) => { setData(items); setLoading(false); }); }, [loader]);
  useEffect(() => { const timeout = setTimeout(refresh, 0); const unsubscribe = subscribeLocalData(refresh); return () => { clearTimeout(timeout); unsubscribe(); }; }, [refresh]);
  return { data, loading, refresh };
}

const loadTeams = () => listTeams();
const loadTournaments = () => listTournaments();
export function useTeams() { return useCollection<Team>(loadTeams); }
export function useTournaments() { return useCollection<Tournament>(loadTournaments); }
export function useTournamentTeams(tournamentId: string) {
  const loader = useCallback(() => listTournamentTeams(tournamentId), [tournamentId]);
  return useCollection<Team>(loader);
}
export function useSports(includeInactive = false) {
  const loader = useCallback(() => listSports(includeInactive), [includeInactive]);
  return useCollection<Sport>(loader);
}
export function useMatches(tournamentId?: string) {
  const loader = useCallback(() => listMatches(tournamentId), [tournamentId]);
  return useCollection<Match>(loader);
}
export function useTournamentTeamAssignments(tournamentId: string) {
  const loader = useCallback(() => listTournamentTeamAssignments(tournamentId), [tournamentId]);
  return useCollection<TournamentTeam>(loader);
}
export function useTournamentRosters(tournamentTeamId: string) {
  const loader = useCallback(() => listTournamentRosters(tournamentTeamId), [tournamentTeamId]);
  return useCollection<RosterPlayer>(loader);
}
