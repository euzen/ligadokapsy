import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';

import { AdminSectionNav } from '@/components/admin-section-nav';
import { ConfirmDeleteModal } from '@/components/confirm-delete-modal';
import { TvShareButton } from '@/components/tv-share-button';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast-provider';
import {
    createMatchEvent,
    deleteMatchEvent,
    listMatchEvents,
    listTournamentRosters,
    listTournamentTeamAssignments,
    updateMatch,
    updateMatchEvent,
} from '@/features/auth/local-db';
import { useMatches, useTeams } from '@/features/auth/use-local-data';
import { useRealtimeChannel } from '@/hooks/use-realtime';
import { useAuth } from '@/providers/auth-provider';
import type { MatchEvent, MatchEventMetadata, RosterPlayer, Team } from '@/types/database';
import { rosterFullName } from '@/types/database';

type AdminFormKind = 'score' | 'penalty' | 'substitution' | 'yellow_card' | 'red_card';
type DisplayKind = AdminFormKind | 'timer_start' | 'timer_pause' | 'period_start' | 'period_end' | 'match_end';

const EVENT_KINDS: AdminFormKind[] = ['score', 'penalty', 'substitution', 'yellow_card', 'red_card'];

const EVENT_ICONS: Record<DisplayKind, string> = {
  score: '⚽',
  penalty: '🥅',
  substitution: '🔄',
  yellow_card: '🟨',
  red_card: '🟥',
  timer_start: '⏱️',
  timer_pause: '⏸️',
  period_start: '▶️',
  period_end: '⏹️',
  match_end: '🏁',
};

function initialsFromName(name: string) {
  return name
    .split(' ')
    .map((part) => part[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('');
}

function formatMinute(seconds: number) {
  return Math.floor(seconds / 60).toString();
}

function calcScores(events: MatchEvent[]) {
  return events.reduce(
    (acc, evt) => ({ home: acc.home + (evt.score_delta_home ?? 0), away: acc.away + (evt.score_delta_away ?? 0) }),
    { home: 0, away: 0 },
  );
}

function teamLogo(team: Team) {
  return team.logo_url ? (
    <Image source={{ uri: team.logo_url }} className="h-full w-full" resizeMode="cover" />
  ) : (
    <Text className="text-xs font-black text-white">{initialsFromName(team.name)}</Text>
  );
}

function eventKind(evt: MatchEvent): DisplayKind {
  if (evt.event_type === 'score') {
    if (evt.metadata?.goal_type === 'penalty') return 'penalty';
    if (evt.metadata?.note === 'substitution') return 'substitution';
    return 'score';
  }
  if (
    evt.event_type === 'yellow_card' ||
    evt.event_type === 'red_card' ||
    evt.event_type === 'timer_start' ||
    evt.event_type === 'timer_pause' ||
    evt.event_type === 'period_start' ||
    evt.event_type === 'period_end' ||
    evt.event_type === 'match_end'
  ) {
    return evt.event_type;
  }
  return 'score';
}

export default function MatchEventsAdminPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const toast = useToast();
  const { profile, loading: authLoading } = useAuth();
  const { data: matches, refresh: refreshMatches } = useMatches();
  const { data: teams } = useTeams();

  const match = useMemo(() => matches.find((m) => m.id === id), [matches, id]);
  const homeTeam = useMemo(() => teams.find((t) => t.id === match?.home_team_id), [teams, match?.home_team_id]);
  const awayTeam = useMemo(() => teams.find((t) => t.id === match?.away_team_id), [teams, match?.away_team_id]);

  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [homeRoster, setHomeRoster] = useState<RosterPlayer[]>([]);
  const [awayRoster, setAwayRoster] = useState<RosterPlayer[]>([]);
  const [loading, setLoading] = useState(false);

  const [kind, setKind] = useState<AdminFormKind>('score');
  const [teamId, setTeamId] = useState<string | null>(null);
  const effectiveTeamId = teamId ?? match?.home_team_id ?? null;
  const [rosterPlayerId, setRosterPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [minute, setMinute] = useState('');
  const [note, setNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<MatchEvent | null>(null);

  function formKind(evt: MatchEvent): AdminFormKind {
    const display = eventKind(evt);
    return display === 'score' || display === 'penalty' || display === 'substitution' || display === 'yellow_card' || display === 'red_card'
      ? display
      : 'score';
  }

  const recalcScore = useCallback(async (evts: MatchEvent[]) => {
    if (!match || !profile) return;
    const { home, away } = calcScores(evts);
    if (home !== (match.home_score ?? 0) || away !== (match.away_score ?? 0)) {
      await updateMatch(match.id, { home_score: home, away_score: away }, profile);
      await refreshMatches();
      toast.info(t('toast.scoreRecalculated'));
    }
  }, [match, profile, refreshMatches, toast, t]);

  const load = useCallback(async () => {
    if (!match) return;
    setLoading(true);
    try {
      const [evts, assignments] = await Promise.all([
        listMatchEvents(match.id),
        listTournamentTeamAssignments(match.tournament_id),
      ]);
      const homeAssignment = assignments.find((a) => a.team_id === match.home_team_id);
      const awayAssignment = assignments.find((a) => a.team_id === match.away_team_id);
      const [homeR, awayR] = await Promise.all([
        homeAssignment ? listTournamentRosters(homeAssignment.id) : Promise.resolve([] as RosterPlayer[]),
        awayAssignment ? listTournamentRosters(awayAssignment.id) : Promise.resolve([] as RosterPlayer[]),
      ]);
      setEvents(evts);
      setHomeRoster(homeR);
      setAwayRoster(awayR);
      await recalcScore(evts);
    } finally {
      setLoading(false);
    }
  }, [match, recalcScore]);

  useEffect(() => {
    if (!match) return;
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load, match]);

  const realtimeTables = useMemo(() => [
    { table: 'match_events', filter: `match_id=eq.${id}`, onEvent: () => void load() },
    { table: 'matches', filter: `id=eq.${id}`, onEvent: () => void refreshMatches() },
  ], [id, load, refreshMatches]);

  useRealtimeChannel('match-events-admin', realtimeTables);

  const selectedRoster = useMemo(
    () => (effectiveTeamId === match?.home_team_id ? homeRoster : effectiveTeamId === match?.away_team_id ? awayRoster : []),
    [effectiveTeamId, match?.home_team_id, match?.away_team_id, homeRoster, awayRoster],
  );

  const reset = useCallback(() => {
    setEditingId(null);
    setKind('score');
    setTeamId(null);
    setRosterPlayerId(null);
    setPlayerName('');
    setMinute('');
    setNote('');
  }, []);

  const edit = (evt: MatchEvent) => {
    setEditingId(evt.id);
    setKind(formKind(evt));
    setTeamId(evt.team_id ?? match?.home_team_id ?? null);
    setRosterPlayerId(evt.roster_player_id);
    setPlayerName(evt.player_name ?? '');
    setMinute(formatMinute(evt.clock_seconds));
    setNote(evt.metadata?.note && evt.metadata.note !== 'substitution' ? evt.metadata.note : '');
  };

  const buildPayload = (): Omit<MatchEvent, 'id' | 'match_id' | 'created_at'> | null => {
    if (!match) return null;
    const seconds = Number(minute) * 60;
    if (Number.isNaN(seconds) || minute === '') return null;

    const metadata: MatchEventMetadata | null =
      kind === 'penalty'
        ? { goal_type: 'penalty' }
        : kind === 'substitution'
          ? { note: 'substitution' }
          : kind === 'score'
            ? note
              ? { note }
              : null
            : note
              ? { note }
              : null;

    let score_delta_home = 0;
    let score_delta_away = 0;
    if (kind === 'score' || kind === 'penalty') {
      if (effectiveTeamId === match.home_team_id) score_delta_home = 1;
      else if (effectiveTeamId === match.away_team_id) score_delta_away = 1;
    }

    const base: Omit<MatchEvent, 'id' | 'match_id' | 'created_at'> = {
      event_type: kind === 'penalty' || kind === 'substitution' ? 'score' : kind,
      team_id: effectiveTeamId,
      player_name: playerName || null,
      roster_player_id: rosterPlayerId,
      metadata,
      score_delta_home,
      score_delta_away,
      clock_seconds: seconds,
    };
    return base;
  };

  const save = async () => {
    if (!match || !profile) return;
    const payload = buildPayload();
    if (!payload) {
      toast.error(t('validation.required'));
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateMatchEvent(match.id, editingId, payload);
        toast.success(t('toast.eventUpdated'));
      } else {
        await createMatchEvent(match.id, payload);
        toast.success(t('toast.eventAdded'));
      }
      await load();
      reset();
    } catch (reason) {
      toast.error(t('toast.saveFailed'), reason instanceof Error ? reason.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (evt: MatchEvent) => {
    if (!match || !profile) return;
    try {
      await deleteMatchEvent(match.id, evt.id);
      await load();
      toast.info(t('toast.eventDeleted'));
    } catch (reason) {
      toast.error(t('toast.saveFailed'), reason instanceof Error ? reason.message : undefined);
    }
  };

  const adjustMinute = (delta: number) => {
    const current = Number(minute) || 0;
    setMinute(String(Math.max(0, current + delta)));
  };

  if (authLoading) return <View className="flex-1 bg-canvas" />;
  if (!profile) return <Redirect href="/sign-in" />;
  if (profile.role !== 'admin') return <Redirect href="/" />;
  if (!match || !homeTeam || !awayTeam) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-5">
        <Text className="text-ink">{t('matches.notFound')}</Text>
      </View>
    );
  }

  const statusLabel = t(`matches.status.${match.status}`);
  const orderedEvents = [...events].sort((a, b) => a.clock_seconds - b.clock_seconds);

  return (
    <View className="flex-1 md:flex-row">
      <AdminSectionNav active="matches" />
      <ScrollView className="flex-1 bg-canvas" contentContainerClassName="p-6">
        <View className="mx-auto w-full max-w-6xl gap-6">
          <View className="flex-row items-center justify-between">
            <Pressable onPress={() => router.push('/admin/matches')} className="min-h-11 self-start justify-center touch-manipulation">
              <Text className="font-black text-brand">← {t('matchesAdmin.backToMatches')}</Text>
            </Pressable>
            <TvShareButton mode="match" id={id} />
          </View>

          {/* Header banner */}
          <View className="rounded-3xl bg-ink p-6 md:p-10">
            <View className="flex-row flex-wrap items-center justify-center gap-4 md:gap-8">
              <View className="items-center gap-2">
                <View style={{ backgroundColor: homeTeam.color }} className="h-14 w-14 items-center justify-center overflow-hidden rounded-2xl">
                  {teamLogo(homeTeam)}
                </View>
                <Text className="text-center font-black text-white" numberOfLines={1}>{homeTeam.name}</Text>
              </View>
              <View className="items-center gap-1">
                <Text className="text-4xl font-black text-white md:text-6xl">{match.home_score ?? 0} : {match.away_score ?? 0}</Text>
                <Text className={`rounded-full px-3 py-1 text-xs font-black uppercase ${match.status === 'live' ? 'bg-emerald-500/20 text-emerald-400' : match.status === 'finished' ? 'bg-slate-700 text-slate-300' : 'bg-amber-500/20 text-amber-400'}`}>
                  {statusLabel}
                </Text>
              </View>
              <View className="items-center gap-2">
                <View style={{ backgroundColor: awayTeam.color }} className="h-14 w-14 items-center justify-center overflow-hidden rounded-2xl">
                  {teamLogo(awayTeam)}
                </View>
                <Text className="text-center font-black text-white" numberOfLines={1}>{awayTeam.name}</Text>
              </View>
            </View>
            <Text className="mt-5 text-center text-slate-400">
              {new Date(match.match_date).toLocaleDateString()} · {match.match_time} · {match.pitch_location}
            </Text>
          </View>

          <View className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Timeline / event list */}
            <View className="gap-4 lg:col-span-2">
              <Text className="text-2xl font-black text-ink">{t('matchesAdmin.matchEventsTitle')}</Text>
              {loading && events.length === 0 ? <ActivityIndicator color="#10B981" /> : null}
              <View className="gap-3">
                {orderedEvents.map((evt) => {
                  const kindLabel = eventKind(evt);
                  const team = evt.team_id === homeTeam.id ? homeTeam : evt.team_id === awayTeam.id ? awayTeam : null;
                  return (
                    <View key={evt.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                      <View className="flex-row items-center justify-between gap-3">
                        <View className="flex-row items-center gap-3">
                          <Text className="text-2xl">{EVENT_ICONS[kindLabel]}</Text>
                          <View>
                            <Text className="font-black text-ink">{t(`events.${evt.event_type}`)}{evt.metadata?.goal_type ? ` (${t(`events.goalTypes.${evt.metadata.goal_type}`)})` : null}</Text>
                            {team ? <Text className="text-xs text-muted">{team.name}</Text> : null}
                            {evt.player_name ? <Text className="text-xs text-slate-500 dark:text-slate-400">{evt.player_name}</Text> : null}
                            {evt.metadata?.note && evt.metadata.note !== 'substitution' ? <Text className="text-xs text-slate-500 dark:text-slate-400">{evt.metadata.note}</Text> : null}
                          </View>
                        </View>
                        <Text className="font-mono text-xl font-black text-brand">{`${formatMinute(evt.clock_seconds)}'`}</Text>
                      </View>
                      <View className="mt-3 flex-row gap-2">
                        <Pressable onPress={() => edit(evt)} className="rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-700">
                          <Text className="text-xs font-black text-ink">{t('common.edit')}</Text>
                        </Pressable>
                        <Pressable onPress={() => setDeleting(evt)} className="rounded-lg bg-red-100 px-3 py-2 dark:bg-red-900/30">
                          <Text className="text-xs font-black text-red-600 dark:text-red-400">{t('delete.button')}</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
                {!events.length && !loading ? <Text className="text-muted">{t('matchCenter.noEvents')}</Text> : null}
              </View>
            </View>

            {/* Sticky quick entry form */}
            <View className="lg:sticky lg:top-4">
              <View className={`rounded-3xl border p-5 ${editingId ? 'border-brand bg-emerald-50 dark:bg-emerald-950/20' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'}`}>
                <View className="flex-row items-center justify-between">
                  <Text className="text-xl font-black text-ink">{editingId ? t('matchesAdmin.editEvent') : t('matchesAdmin.addEvent')}</Text>
                  {editingId ? (
                    <Pressable onPress={reset} className="rounded-lg bg-slate-100 px-3 py-1 dark:bg-slate-700">
                      <Text className="text-xs font-black text-ink">{t('common.cancel')}</Text>
                    </Pressable>
                  ) : null}
                </View>

                {/* Event kind selector */}
                <View className="mt-4 flex-row flex-wrap gap-2">
                  {EVENT_KINDS.map((k) => (
                    <Pressable
                      key={k}
                      onPress={() => setKind(k)}
                      className={`min-h-11 flex-row items-center gap-1 rounded-xl px-3 py-2 touch-manipulation ${kind === k ? 'bg-brand' : 'bg-slate-100 dark:bg-slate-700'}`}
                    >
                      <Text>{EVENT_ICONS[k]}</Text>
                      <Text className={`text-xs font-bold ${kind === k ? 'text-white' : 'text-ink'}`}>{t(`matchesAdmin.eventTypes.${k}`)}</Text>
                    </Pressable>
                  ))}
                </View>

                {/* Team selector */}
                <View className="mt-4 flex-row flex-wrap gap-2">
                  {[homeTeam, awayTeam].map((team) => (
                    <Pressable
                      key={team.id}
                      onPress={() => { setTeamId(team.id); setRosterPlayerId(null); }}
                      className={`min-h-11 flex-1 items-center justify-center rounded-xl px-3 py-2 touch-manipulation ${effectiveTeamId === team.id ? 'bg-brand' : 'bg-slate-100 dark:bg-slate-700'}`}
                    >
                      <Text className={`text-xs font-bold ${effectiveTeamId === team.id ? 'text-white' : 'text-ink'}`} numberOfLines={1}>{team.name}</Text>
                    </Pressable>
                  ))}
                </View>

                {/* Player selector */}
                {selectedRoster.length > 0 ? (
                  <View className="mt-4 gap-2">
                    <Text className="text-xs font-black uppercase tracking-wider text-muted">{t('matchesAdmin.player')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                      <View className="flex-row gap-2">
                        {selectedRoster.map((player) => (
                          <Pressable
                            key={player.id}
                            onPress={() => { setRosterPlayerId(player.id); setPlayerName(rosterFullName(player)); }}
                            className={`min-h-11 rounded-xl px-3 py-2 ${rosterPlayerId === player.id ? 'bg-brand' : 'bg-slate-100 dark:bg-slate-700'}`}
                          >
                            <Text className={`text-xs font-bold ${rosterPlayerId === player.id ? 'text-white' : 'text-ink'}`}>#{player.jersey_number ?? '–'} {rosterFullName(player)}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                ) : null}

                <View className="mt-4">
                  <Field label={t('scorekeeper.player')} value={playerName} onChangeText={(value) => { setPlayerName(value); setRosterPlayerId(null); }} />
                </View>

                {/* Minute with quick buttons */}
                <View className="mt-4">
                  <View className="flex-row items-center gap-2">
                    <Pressable onPress={() => adjustMinute(-1)} className="min-h-11 min-w-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700">
                      <Text className="font-black text-ink">−1</Text>
                    </Pressable>
                    <View className="flex-1">
                      <Field label={t('matchesAdmin.minute')} value={minute} onChangeText={setMinute} keyboardType="number-pad" />
                    </View>
                    <Pressable onPress={() => adjustMinute(1)} className="min-h-11 min-w-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700">
                      <Text className="font-black text-ink">+1</Text>
                    </Pressable>
                  </View>
                </View>

                <View className="mt-4">
                  <Field label={t('matchesAdmin.assist')} value={note} onChangeText={setNote} />
                </View>

                <View className="mt-5 flex-row gap-2">
                  <View className="flex-1">
                    <Button label={t('common.cancel')} variant="ghost" onPress={reset} />
                  </View>
                  <View className="flex-1">
                    <Button label={editingId ? t('common.save') : t('matchesAdmin.addEvent')} onPress={() => void save()} loading={saving} />
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {deleting ? (
        <ConfirmDeleteModal
          name={`${t(`events.${deleting.event_type}`)} ${formatMinute(deleting.clock_seconds)}'`}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => { await remove(deleting); setDeleting(null); }}
        />
      ) : null}
    </View>
  );
}
