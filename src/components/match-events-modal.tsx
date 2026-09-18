import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { createMatchEvent, deleteMatchEvent, listMatchEvents, listTournamentRosters, listTournamentTeamAssignments, updateMatchEvent } from '@/features/auth/local-db';
import type { Match, MatchEvent, RosterPlayer, Team } from '@/types/database';
import { rosterFullName } from '@/types/database';

const EVENT_TYPES: MatchEvent['event_type'][] = ['score', 'yellow_card', 'red_card', 'timer_start', 'timer_pause', 'period_end', 'period_start', 'match_end'];

export function MatchEventsModal({ match, teams, onClose }: { match: Match; teams: Team[]; onClose: () => void }) {
  const { t } = useTranslation();
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<MatchEvent | null>(null);
  const [eventType, setEventType] = useState<MatchEvent['event_type']>('score');
  const [teamId, setTeamId] = useState<string | null>(match.home_team_id);
  const [playerName, setPlayerName] = useState('');
  const [rosterPlayerId, setRosterPlayerId] = useState<string | null>(null);
  const [clockSeconds, setClockSeconds] = useState('');
  const [scoreDeltaHome, setScoreDeltaHome] = useState('0');
  const [scoreDeltaAway, setScoreDeltaAway] = useState('0');
  const [homeRoster, setHomeRoster] = useState<RosterPlayer[]>([]);
  const [awayRoster, setAwayRoster] = useState<RosterPlayer[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [evts, homeR, awayR] = await Promise.all([
        listMatchEvents(match.id),
        listTournamentRostersForTeam(match.tournament_id, match.home_team_id),
        listTournamentRostersForTeam(match.tournament_id, match.away_team_id),
      ]);
      setEvents(evts);
      setHomeRoster(homeR);
      setAwayRoster(awayR);
    } finally {
      setLoading(false);
    }
  }, [match.id, match.tournament_id, match.home_team_id, match.away_team_id]);

  useEffect(() => { const timeout = setTimeout(() => { void load(); }, 0); return () => clearTimeout(timeout); }, [load]);

  const reset = useCallback(() => {
    setEditing(null);
    setEventType('score');
    setTeamId(match.home_team_id);
    setPlayerName('');
    setRosterPlayerId(null);
    setClockSeconds('');
    setScoreDeltaHome('0');
    setScoreDeltaAway('0');
  }, [match.home_team_id]);

  const edit = useCallback((evt: MatchEvent) => {
    setEditing(evt);
    setEventType(evt.event_type);
    setTeamId(evt.team_id);
    setPlayerName(evt.player_name ?? '');
    setRosterPlayerId(evt.roster_player_id);
    setClockSeconds(evt.clock_seconds?.toString() ?? '');
    setScoreDeltaHome(evt.score_delta_home?.toString() ?? '0');
    setScoreDeltaAway(evt.score_delta_away?.toString() ?? '0');
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const values: Omit<MatchEvent, 'id' | 'match_id' | 'created_at'> = {
        event_type: eventType,
        team_id: teamId,
        player_name: playerName || null,
        roster_player_id: rosterPlayerId,
        score_delta_home: Number(scoreDeltaHome) || 0,
        score_delta_away: Number(scoreDeltaAway) || 0,
        clock_seconds: clockSeconds === '' ? 0 : Number(clockSeconds),
      };
      if (editing) {
        await updateMatchEvent(match.id, editing.id, values);
      } else {
        await createMatchEvent(match.id, values);
      }
      await load();
      reset();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (evt: MatchEvent) => {
    await deleteMatchEvent(match.id, evt.id);
    await load();
  };

  const selectedRoster = useMemo(() => (teamId === match.home_team_id ? homeRoster : teamId === match.away_team_id ? awayRoster : []), [teamId, match.home_team_id, match.away_team_id, homeRoster, awayRoster]);
  const teamName = (id: string | null) => teams.find((team) => team.id === id)?.name ?? '';
  const selectedPlayerName = useMemo(() => {
    if (rosterPlayerId) {
      const player = [...homeRoster, ...awayRoster].find((p) => p.id === rosterPlayerId);
      return player ? rosterFullName(player) : playerName;
    }
    return playerName;
  }, [rosterPlayerId, homeRoster, awayRoster, playerName]);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-slate-950/80 px-4">
        <ScrollView className="max-h-[90%] w-full max-w-2xl rounded-2xl bg-white" contentContainerClassName="gap-4 p-6">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-black text-ink">{t('matchesAdmin.events')}</Text>
            <Pressable onPress={onClose} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"><Text className="text-xl font-black text-ink">×</Text></Pressable>
          </View>

          {loading ? <Text className="text-muted">{t('common.loading')}</Text> : null}

          {/* Existing events */}
          <View className="gap-2">
            {events.map((evt) => (
              <View key={evt.id} className="rounded-xl bg-slate-50 p-3">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="font-black text-ink">{t(`events.${evt.event_type}`)}</Text>
                    {evt.team_id ? <Text className="text-xs text-muted">{teamName(evt.team_id)}</Text> : null}
                    {evt.player_name ? <Text className="text-xs text-muted">{evt.player_name}</Text> : null}
                  </View>
                  <View className="items-end">
                    <Text className="font-mono text-brand">{formatClock(evt.clock_seconds)}</Text>
                    {evt.event_type === 'score' ? <Text className="text-xs text-muted">+{evt.score_delta_home}:{evt.score_delta_away}</Text> : null}
                  </View>
                </View>
                <View className="mt-2 flex-row gap-2">
                  <Pressable onPress={() => edit(evt)} className="rounded-lg bg-slate-200 px-3 py-2"><Text className="text-xs font-black text-ink">{t('common.edit')}</Text></Pressable>
                  <Pressable onPress={() => void remove(evt)} className="rounded-lg bg-red-100 px-3 py-2"><Text className="text-xs font-black text-red-600">{t('delete.button')}</Text></Pressable>
                </View>
              </View>
            ))}
            {!events.length && !loading ? <Text className="text-muted">{t('matchCenter.noEvents')}</Text> : null}
          </View>

          {/* Add/Edit form */}
          <View className="mt-4 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <Text className="font-black text-ink">{editing ? t('matchesAdmin.editEvent') : t('matchesAdmin.addEvent')}</Text>

            <View className="flex-row flex-wrap gap-2">
              {EVENT_TYPES.map((type) => (
                <Pressable key={type} onPress={() => setEventType(type)} className={`rounded-xl px-3 py-2 ${eventType === type ? 'bg-brand' : 'bg-white'}`}>
                  <Text className={eventType === type ? 'font-bold text-white' : 'font-bold text-ink'}>{t(`events.${type}`)}</Text>
                </Pressable>
              ))}
            </View>

            <View className="flex-row flex-wrap gap-2">
              {[match.home_team_id, match.away_team_id].map((id) => (
                <Pressable key={id} onPress={() => { setTeamId(id); setRosterPlayerId(null); }} className={`rounded-xl px-3 py-2 ${teamId === id ? 'bg-brand' : 'bg-white'}`}>
                  <Text className={teamId === id ? 'font-bold text-white' : 'font-bold text-ink'}>{teamName(id)}</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => setTeamId(null)} className={`rounded-xl px-3 py-2 ${teamId === null ? 'bg-brand' : 'bg-white'}`}>
                <Text className={teamId === null ? 'font-bold text-white' : 'font-bold text-ink'}>{t('scorekeeper.unattributed')}</Text>
              </Pressable>
            </View>

            {selectedRoster.length > 0 ? (
              <View className="flex-row flex-wrap gap-2">
                {selectedRoster.map((player) => (
                  <Pressable key={player.id} onPress={() => { setRosterPlayerId(player.id); setPlayerName(rosterFullName(player)); }} className={`rounded-xl px-3 py-2 ${rosterPlayerId === player.id ? 'bg-brand' : 'bg-white'}`}>
                    <Text className={rosterPlayerId === player.id ? 'font-bold text-white' : 'font-bold text-ink'}>#{player.jersey_number ?? '–'} {rosterFullName(player)}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <Field label={t('scorekeeper.player')} value={selectedPlayerName} onChangeText={(value) => { setPlayerName(value); setRosterPlayerId(null); }} />
            <Field label={t('matchesAdmin.clockSeconds')} value={clockSeconds} onChangeText={setClockSeconds} keyboardType="number-pad" />

            {eventType === 'score' ? (
              <View className="flex-row gap-3">
                <View className="flex-1"><Field label={t('matches.homeScore')} value={scoreDeltaHome} onChangeText={setScoreDeltaHome} keyboardType="number-pad" /></View>
                <View className="flex-1"><Field label={t('matches.awayScore')} value={scoreDeltaAway} onChangeText={setScoreDeltaAway} keyboardType="number-pad" /></View>
              </View>
            ) : null}

            <View className="flex-row gap-3">
              <View className="flex-1"><Button label={t('common.cancel')} variant="ghost" onPress={reset} /></View>
              <View className="flex-1"><Button label={t('common.save')} onPress={() => void save()} loading={saving} /></View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function formatClock(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

async function listTournamentRostersForTeam(tournamentId: string, teamId: string): Promise<RosterPlayer[]> {
  const assignments = await listTournamentTeamAssignments(tournamentId);
  const assignment = assignments.find((a: { team_id: string }) => a.team_id === teamId);
  if (!assignment) return [];
  return listTournamentRosters(assignment.id);
}
