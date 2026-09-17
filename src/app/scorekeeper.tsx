import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { getScorekeeperMatch, recordMatchEvent, undoMatchEvent } from '@/features/auth/local-db';
import type { MatchEvent, PublicMatch, RosterPlayer } from '@/types/database';
import { initialsFromName } from '@/types/database';

function clock(seconds: number) { return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`; }

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
    const roster = selectedPlayer?.teamId === team_id ? selectedPlayer.rosterId : null;
    await recordMatchEvent(activeSecret, { event_type, team_id, roster_player_id: roster, player_name: roster ? null : t('scorekeeper.unattributed') });
    await refresh();
  };

  const renderRoster = (teamId: string, roster: RosterPlayer[]) => (
    <View className="rounded-2xl bg-white p-4">
      <Text className="mb-3 font-black text-ink">{t('scorekeeper.roster')}</Text>
      <View className="flex-row flex-wrap gap-2">
        {roster.map((player) => (
          <Pressable key={player.id} onPress={() => setSelectedPlayer({ teamId, rosterId: player.id })} className={`rounded-xl px-3 py-2 ${selectedPlayer?.teamId === teamId && selectedPlayer.rosterId === player.id ? 'bg-brand' : 'bg-slate-100'}`}>
            <Text className={`font-bold ${selectedPlayer?.teamId === teamId && selectedPlayer.rosterId === player.id ? 'text-white' : 'text-ink'}`}>#{player.jersey_number ?? '–'} {player.first_name?.[0]?.toUpperCase() ?? ''}. {player.last_name}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => setSelectedPlayer(null)} className={`rounded-xl px-3 py-2 ${selectedPlayer === null ? 'bg-brand' : 'bg-slate-100'}`}>
          <Text className={`font-bold ${selectedPlayer === null ? 'text-white' : 'text-ink'}`}>{t('scorekeeper.unattributed')}</Text>
        </Pressable>
      </View>
    </View>
  );

  if (!bundle) return (
    <View className="flex-1 items-center justify-center bg-ink px-5">
      <View className="w-full max-w-md rounded-2xl bg-white p-6">
        <Text className="text-3xl font-black text-ink">{t('scorekeeper.title')}</Text>
        <Text className="mt-2 text-muted">{t('scorekeeper.enter')}</Text>
        <TextInput value={secret} onChangeText={setSecret} keyboardType="number-pad" className="mt-6 min-h-14 rounded-xl border border-slate-300 px-4 text-center text-2xl font-black text-ink outline-none" placeholder="123456" />
        <Pressable onPress={() => setActiveSecret(secret.trim())} className="mt-4 min-h-14 items-center justify-center rounded-xl bg-brand">
          <Text className="font-black text-white">{t('scorekeeper.open')}</Text>
        </Pressable>
        {error ? <Text className="mt-3 font-bold text-red-600">{error}</Text> : null}
      </View>
    </View>
  );

  const isRunning = Boolean(bundle.match.clock_started_at);
  const isFinished = bundle.match.status === 'finished';
  const currentPeriod = bundle.match.current_period ?? 0;
  const running = isRunning ? Math.max(0, Math.floor((now - new Date(bundle.match.clock_started_at!).getTime()) / 1000)) : 0;
  const elapsed = bundle.match.clock_seconds + running;

  return (
    <ScrollView className="flex-1 bg-ink" contentContainerClassName="items-center px-4 pb-12 pt-6">
      <View className="w-full max-w-xl gap-4">
        <Text className="text-center text-xs font-black uppercase tracking-widest text-emerald-400">{t('scorekeeper.sideline')}</Text>

        {/* Period indicator */}
        <Text className="text-center text-sm font-bold text-slate-400">
          {isFinished ? t('scorekeeper.matchFinished') : currentPeriod > 0 ? t('scorekeeper.period', { number: currentPeriod }) : t('scorekeeper.notStarted')}
        </Text>

        {/* Clock */}
        <Text className="text-center font-mono text-5xl font-black text-white">{clock(elapsed)}</Text>

        {/* Score */}
        <View className="flex-row rounded-2xl bg-white p-6">
          <View className="flex-1 items-center">
            <Text className="text-center font-black text-ink">{bundle.homeTeam.name}</Text>
            <Text className="mt-3 text-6xl font-black text-ink">{bundle.match.home_score ?? 0}</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-center font-black text-ink">{bundle.awayTeam.name}</Text>
            <Text className="mt-3 text-6xl font-black text-ink">{bundle.match.away_score ?? 0}</Text>
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
                <Text className="text-center font-black text-white">{initialsFromName(team.name)}</Text>
                <Pressable onPress={() => void action('score', team.id)} className="min-h-24 items-center justify-center rounded-2xl bg-brand">
                  <Text className="text-2xl font-black text-white">+1 {t('scorekeeper.point')}</Text>
                </Pressable>
                <Pressable onPress={() => void action('yellow_card', team.id)} className="min-h-16 items-center justify-center rounded-2xl bg-yellow-400">
                  <Text className="font-black text-ink">{t('scorekeeper.yellow')}</Text>
                </Pressable>
                <Pressable onPress={() => void action('red_card', team.id)} className="min-h-16 items-center justify-center rounded-2xl bg-red-600">
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
              <Pressable onPress={() => void action(isRunning ? 'timer_pause' : currentPeriod === 0 ? 'timer_start' : 'timer_start')} className="min-h-16 flex-1 items-center justify-center rounded-2xl bg-white">
                <Text className="font-black text-ink">
                  {isRunning ? t('scorekeeper.pause') : currentPeriod === 0 ? t('scorekeeper.startMatch') : t('scorekeeper.resume')}
                </Text>
              </Pressable>
              <Pressable onPress={() => void undoMatchEvent(activeSecret).then(refresh)} className="min-h-16 flex-1 items-center justify-center rounded-2xl border border-red-500">
                <Text className="font-black text-red-400">{t('scorekeeper.undo')}</Text>
              </Pressable>
            </View>

            {/* Period controls — only when clock is paused and a period is active */}
            {!isRunning && currentPeriod > 0 ? (
              <View className="flex-row gap-3">
                <Pressable onPress={() => void action('period_end').then(() => action('period_start'))} className="min-h-16 flex-1 items-center justify-center rounded-2xl bg-amber-500">
                  <Text className="font-black text-white">{t('scorekeeper.nextPeriod', { number: currentPeriod + 1 })}</Text>
                </Pressable>
                <Pressable onPress={() => { setConfirmEnd(true); }} className="min-h-16 flex-1 items-center justify-center rounded-2xl bg-slate-700">
                  <Text className="font-black text-white">{t('scorekeeper.endMatch')}</Text>
                </Pressable>
              </View>
            ) : null}

            {/* End match confirmation */}
            {confirmEnd ? (
              <View className="rounded-2xl bg-red-900 p-5">
                <Text className="text-center font-black text-white">{t('scorekeeper.endMatchConfirm')}</Text>
                <View className="mt-4 flex-row gap-3">
                  <Pressable onPress={() => setConfirmEnd(false)} className="min-h-14 flex-1 items-center justify-center rounded-xl bg-slate-600">
                    <Text className="font-black text-white">{t('common.cancel')}</Text>
                  </Pressable>
                  <Pressable onPress={() => { setConfirmEnd(false); void action('match_end'); }} className="min-h-14 flex-1 items-center justify-center rounded-xl bg-red-600">
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
