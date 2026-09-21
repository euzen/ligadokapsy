import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useToast } from '@/components/ui/toast-provider';
import { getScorekeeperMatch, recordMatchEvent, undoMatchEvent } from '@/features/auth/local-db';
import { useRealtimeStatus } from '@/hooks/use-realtime';
import type { MatchEvent, PublicMatch, RosterPlayer } from '@/types/database';

function clock(seconds: number) { return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`; }

function optimisticEvent(matchId: string, event_type: MatchEvent['event_type'], team_id: string | null, clock_seconds: number, seq: number): MatchEvent {
  return {
    id: `opt-${seq}`,
    match_id: matchId,
    event_type,
    team_id,
    player_name: null,
    metadata: null,
    score_delta_home: event_type === 'score' && team_id ? 1 : 0,
    score_delta_away: event_type === 'score' && team_id ? 1 : 0,
    clock_seconds,
    roster_player_id: null,
    created_at: new Date().toISOString(),
  };
}

export default function ScorekeeperScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ secret?: string }>();
  const [secret, setSecret] = useState(params.secret ?? '');
  const [activeSecret, setActiveSecret] = useState(params.secret ?? '');
  const [bundle, setBundle] = useState<PublicMatch | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState<{ teamId: string; rosterId: string } | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const { online } = useRealtimeStatus();
  const toast = useToast();
  const optimisticSeq = useRef(0);

  const refresh = useCallback(async () => {
    if (!activeSecret) return;
    try { setBundle(await getScorekeeperMatch(activeSecret)); setError(''); }
    catch (reason) { setError(t(reason instanceof Error ? reason.message : 'scorekeeper.invalid')); }
  }, [activeSecret, t]);

  const homeRoster = useMemo(() => bundle?.homeRoster ?? [], [bundle?.homeRoster]);
  const awayRoster = useMemo(() => bundle?.awayRoster ?? [], [bundle?.awayRoster]);

  useEffect(() => {
    const timeout = setTimeout(refresh, 0);
    const interval = setInterval(() => { setNow(Date.now()); void refresh(); }, 1000);
    return () => { clearTimeout(timeout); clearInterval(interval); };
  }, [refresh]);

  const action = async (event_type: MatchEvent['event_type'], team_id: string | null = null) => {
    if (!bundle) return;
    const roster = selectedPlayer?.teamId === team_id ? selectedPlayer.rosterId : null;
    const clockSeconds = bundle.match.clock_seconds + (bundle.match.clock_started_at ? Math.max(0, Math.floor((now - new Date(bundle.match.clock_started_at).getTime()) / 1000)) : 0);
    optimisticSeq.current += 1;

    // Optimistic update
    setBundle((current) => {
      if (!current) return current;
      const next = { ...current, events: [...current.events, optimisticEvent(current.match.id, event_type, team_id, clockSeconds, optimisticSeq.current)] };
      if (event_type === 'score' && team_id) {
        if (team_id === current.match.home_team_id) next.match = { ...next.match, home_score: (next.match.home_score ?? 0) + 1 };
        if (team_id === current.match.away_team_id) next.match = { ...next.match, away_score: (next.match.away_score ?? 0) + 1 };
      }
      if (event_type === 'timer_start') next.match = { ...next.match, clock_started_at: new Date().toISOString() };
      if (event_type === 'timer_pause' || event_type === 'period_end' || event_type === 'match_end') next.match = { ...next.match, clock_started_at: null, clock_seconds: clockSeconds };
      if (event_type === 'period_start') next.match = { ...next.match, clock_started_at: new Date().toISOString(), current_period: (next.match.current_period ?? 0) + 1, clock_seconds: 0 };
      if (event_type === 'match_end') next.match = { ...next.match, status: 'finished' };
      return next;
    });

    try {
      await recordMatchEvent(activeSecret, { event_type, team_id, roster_player_id: roster, player_name: roster ? null : t('scorekeeper.unattributed') });
      if (event_type === 'match_end') toast.success(t('toast.matchEnded'));
      if (event_type === 'score') toast.success(t('toast.scoreAdded'));
      await refresh();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : t('scorekeeper.invalid');
      setError(message);
      toast.error(t('toast.eventFailed'), message);
      await refresh();
    }
  };

  const undo = async () => {
    try { await undoMatchEvent(activeSecret); await refresh(); }
    catch (reason) { const message = reason instanceof Error ? reason.message : t('scorekeeper.invalid'); setError(message); toast.error(t('toast.eventFailed'), message); }
  };

  const renderRoster = (teamId: string, roster: RosterPlayer[]) => (
    <View className="rounded-2xl bg-white p-4 dark:bg-slate-800">
      <Text className="mb-3 font-black text-slate-900 dark:text-white">{t('scorekeeper.roster')}</Text>
      <View className="flex-row flex-wrap gap-2">
        {roster.map((player) => (
          <Pressable key={player.id} onPress={() => setSelectedPlayer({ teamId, rosterId: player.id })} className={`min-h-11 min-w-11 items-center justify-center rounded-xl px-3 py-2 touch-manipulation ${selectedPlayer?.teamId === teamId && selectedPlayer.rosterId === player.id ? 'bg-brand' : 'bg-slate-100 dark:bg-slate-700'}`}>
            <Text className={`font-bold ${selectedPlayer?.teamId === teamId && selectedPlayer.rosterId === player.id ? 'text-white' : 'text-slate-900 dark:text-white'}`}>#{player.jersey_number ?? '–'} {player.first_name?.[0]?.toUpperCase() ?? ''}. {player.last_name}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => setSelectedPlayer(null)} className={`min-h-11 min-w-11 items-center justify-center rounded-xl px-3 py-2 touch-manipulation ${selectedPlayer === null ? 'bg-brand' : 'bg-slate-100 dark:bg-slate-700'}`}>
          <Text className={`font-bold ${selectedPlayer === null ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{t('scorekeeper.unattributed')}</Text>
        </Pressable>
      </View>
    </View>
  );

  if (!bundle) return (
    <View className="flex-1 items-center justify-center bg-slate-950 px-5">
      <View className="w-full max-w-md rounded-2xl border border-slate-700 bg-white p-6 dark:bg-slate-800">
        <Text className="text-3xl font-black text-slate-900 dark:text-white">{t('scorekeeper.title')}</Text>
        <Text className="mt-2 text-slate-500 dark:text-slate-400">{t('scorekeeper.enter')}</Text>
        <TextInput value={secret} onChangeText={setSecret} keyboardType="number-pad" inputMode="numeric" className="mt-6 min-h-14 rounded-xl border border-slate-300 bg-white px-4 text-center text-2xl font-black text-slate-900 outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white" placeholder="123456" />
        <Pressable onPress={() => setActiveSecret(secret.trim())} className="mt-4 min-h-14 min-w-11 items-center justify-center rounded-xl bg-brand touch-manipulation">
          <Text className="font-black text-white">{t('scorekeeper.open')}</Text>
        </Pressable>
        {error ? <Text className="mt-3 font-bold text-red-600 dark:text-red-400">{error}</Text> : null}
      </View>
    </View>
  );

  const isRunning = Boolean(bundle.match.clock_started_at);
  const isFinished = bundle.match.status === 'finished';
  const currentPeriod = bundle.match.current_period ?? 0;
  const lastEvent = bundle.events.length > 0 ? bundle.events[bundle.events.length - 1] : null;
  const periodEnded = lastEvent?.event_type === 'period_end';
  const running = isRunning ? Math.max(0, Math.floor((now - new Date(bundle.match.clock_started_at!).getTime()) / 1000)) : 0;
  const elapsed = bundle.match.clock_seconds + running;

  return (
    <ScrollView className="flex-1 bg-slate-950" contentContainerClassName="items-center px-4 pb-12 pt-6 safe-bottom overflow-scrolling-touch">
      <View className="w-full max-w-xl gap-4">
        <View className="items-center gap-1">
          <Text className="text-center text-xs font-black uppercase tracking-widest text-emerald-400">{t('scorekeeper.sideline')}</Text>
          <View className="rounded-full bg-slate-800 px-3 py-1">
            <Text className={`text-[10px] font-black uppercase ${online ? 'text-emerald-400' : 'text-amber-400'}`}>{online ? '🟢 Živě' : '🟠 Offline'}</Text>
          </View>
        </View>

        {/* Period indicator */}
        <Text className="text-center text-sm font-bold text-slate-400">
          {isFinished ? t('scorekeeper.matchFinished') : currentPeriod > 0 ? t('scorekeeper.period', { number: currentPeriod }) : t('scorekeeper.notStarted')}
        </Text>

        {/* Clock */}
        <Text className="text-center font-mono text-5xl font-black text-white">{clock(elapsed)}</Text>

        {/* Score */}
        <View className="flex-row rounded-2xl bg-white p-6 dark:bg-slate-800">
          <View className="flex-1 items-center">
            <Text className="text-center font-black text-slate-900 dark:text-white" numberOfLines={1}>{bundle.homeTeam.name}</Text>
            <Text className="mt-3 text-6xl font-black text-slate-900 dark:text-white">{bundle.match.home_score ?? 0}</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-center font-black text-slate-900 dark:text-white" numberOfLines={1}>{bundle.awayTeam.name}</Text>
            <Text className="mt-3 text-6xl font-black text-slate-900 dark:text-white">{bundle.match.away_score ?? 0}</Text>
          </View>
        </View>

        {/* Rosters */}
        {renderRoster(bundle.homeTeam.id, homeRoster)}
        {renderRoster(bundle.awayTeam.id, awayRoster)}

        {/* Scoring & card buttons (disabled when finished) */}
        {!isFinished ? (
          <View className="flex-row gap-3">
            {[bundle.homeTeam, bundle.awayTeam].map((team) => (
              <View key={team.id} className="flex-1 gap-3">
                <Text className="text-center font-black text-white" numberOfLines={1}>{team.name}</Text>
                <Pressable onPress={() => void action('score', team.id)} className="min-h-24 min-w-11 items-center justify-center rounded-2xl bg-brand touch-manipulation">
                  <Text className="text-2xl font-black text-white">+1 {t('scorekeeper.point')}</Text>
                </Pressable>
                <Pressable onPress={() => void action('yellow_card', team.id)} className="min-h-16 min-w-11 items-center justify-center rounded-2xl bg-yellow-400 touch-manipulation">
                  <Text className="font-black text-slate-900">{t('scorekeeper.yellow')}</Text>
                </Pressable>
                <Pressable onPress={() => void action('red_card', team.id)} className="min-h-16 min-w-11 items-center justify-center rounded-2xl bg-red-600 touch-manipulation">
                  <Text className="font-black text-white">{t('scorekeeper.red')}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {/* Timer controls */}
        {!isFinished ? (
          <View className="gap-3">
            {/* Start / Pause */}
            <View className="flex-row gap-3">
              <Pressable onPress={() => void action(isRunning ? 'timer_pause' : 'timer_start')} className="min-h-16 min-w-11 flex-1 items-center justify-center rounded-2xl bg-white touch-manipulation dark:bg-slate-800">
                <Text className="font-black text-slate-900 dark:text-white">
                  {isRunning ? t('scorekeeper.pause') : currentPeriod === 0 ? t('scorekeeper.startMatch') : t('scorekeeper.resume')}
                </Text>
              </Pressable>
              <Pressable onPress={() => void undo()} className="min-h-16 min-w-11 flex-1 items-center justify-center rounded-2xl border border-red-500 touch-manipulation">
                <Text className="font-black text-red-400">{t('scorekeeper.undo')}</Text>
              </Pressable>
            </View>

            {/* Period controls */}
            {!isRunning && currentPeriod > 0 && !periodEnded ? (
              <View className="flex-row gap-3">
                <Pressable onPress={() => void action('period_end')} className="min-h-16 min-w-11 flex-1 items-center justify-center rounded-2xl bg-amber-500 touch-manipulation">
                  <Text className="font-black text-white">{t('scorekeeper.endPeriod')}</Text>
                </Pressable>
                <Pressable onPress={() => { setConfirmEnd(true); }} className="min-h-16 min-w-11 flex-1 items-center justify-center rounded-2xl bg-slate-700 touch-manipulation">
                  <Text className="font-black text-white">{t('scorekeeper.endMatch')}</Text>
                </Pressable>
              </View>
            ) : null}

            {/* Next period start */}
            {!isRunning && periodEnded ? (
              <Pressable onPress={() => void action('period_start')} className="min-h-16 min-w-11 items-center justify-center rounded-2xl bg-emerald-600 touch-manipulation">
                <Text className="font-black text-white">{t('scorekeeper.startPeriod', { number: currentPeriod + 1 })}</Text>
              </Pressable>
            ) : null}

            {/* End match confirmation */}
            {confirmEnd ? (
              <View className="rounded-2xl bg-red-900 p-5">
                <Text className="text-center font-black text-white">{t('scorekeeper.endMatchConfirm')}</Text>
                <View className="mt-4 flex-row gap-3">
                  <Pressable onPress={() => setConfirmEnd(false)} className="min-h-14 min-w-11 flex-1 items-center justify-center rounded-xl bg-slate-600 touch-manipulation">
                    <Text className="font-black text-white">{t('common.cancel')}</Text>
                  </Pressable>
                  <Pressable onPress={() => { setConfirmEnd(false); void action('match_end'); }} className="min-h-14 min-w-11 flex-1 items-center justify-center rounded-xl bg-red-600 touch-manipulation">
                    <Text className="font-black text-white">{t('scorekeeper.confirmEnd')}</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        ) : (
          <View className="rounded-2xl bg-slate-800 p-6">
            <Text className="text-center text-2xl font-black text-white">{t('scorekeeper.matchFinished')}</Text>
            <Text className="mt-2 text-center text-slate-400">{bundle.match.home_score ?? 0} : {bundle.match.away_score ?? 0}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
