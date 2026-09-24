import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Animated, Image, Text, View } from 'react-native';

import { TvControls } from '@/components/tv-controls';
import { getPublicMatch } from '@/features/auth/local-db';
import { useRealtimeChannel } from '@/hooks/use-realtime';
import type { MatchEvent, PublicMatch } from '@/types/database';

const PULSE_DURATION = 800;

type Density = 'normal' | 'medium' | 'high';

function useDensity(count: number) {
  const density: Density = count <= 6 ? 'normal' : count <= 12 ? 'medium' : 'high';
  return useMemo(() => {
    if (density === 'normal') {
      return {
        row: 'p-3 gap-4',
        icon: 'text-4xl',
        player: 'text-xl',
        meta: 'text-sm',
        minute: 'text-lg h-12 w-12',
        badge: 'px-3 py-1.5 text-sm',
      };
    }
    if (density === 'medium') {
      return {
        row: 'p-2 gap-2',
        icon: 'text-2xl',
        player: 'text-base',
        meta: 'text-xs',
        minute: 'text-base h-10 w-10',
        badge: 'px-2.5 py-1 text-xs',
      };
    }
    return {
      row: 'p-1.5 gap-1',
      icon: 'text-xl',
      player: 'text-sm',
      meta: 'text-[10px]',
      minute: 'text-sm h-8 w-8',
      badge: 'px-2 py-0.5 text-[10px]',
    };
  }, [density]);
}

function formatClock(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('');
}

function teamLogo(team: { color: string; logo_url: string | null; name: string }) {
  return team.logo_url ? (
    <Image source={{ uri: team.logo_url }} className="h-full w-full" resizeMode="cover" />
  ) : (
    <Text className="text-4xl font-black text-white">{initials(team.name)}</Text>
  );
}

function eventIcon(metadata: MatchEvent['metadata']) {
  if (!metadata) return '⚽';
  if (metadata.goal_type === 'penalty') return '🥅';
  if (metadata.goal_type === 'own_goal') return '⛳';
  if (metadata.note === 'substitution') return '🔄';
  return '⚽';
}

function eventIconForType(type: MatchEvent['event_type']) {
  if (type === 'score') return '⚽';
  if (type === 'yellow_card') return '🟨';
  if (type === 'red_card') return '🟥';
  if (type === 'timer_start') return '⏱️';
  if (type === 'timer_pause') return '⏸️';
  if (type === 'match_end') return '🏁';
  return '•';
}

function eventIconFor(evt: MatchEvent) {
  if (evt.event_type === 'score') return eventIcon(evt.metadata);
  return eventIconForType(evt.event_type);
}

export default function TvMatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const [bundle, setBundle] = useState<PublicMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(0);
  const previousGoalCount = useRef(0);
  const [scale] = useState(() => new Animated.Value(1));

  const triggerPulse = useCallback(() => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.15, duration: PULSE_DURATION / 2, useNativeDriver: false }),
      Animated.timing(scale, { toValue: 1, duration: PULSE_DURATION / 2, useNativeDriver: false }),
    ]).start();
  }, [scale]);

  const load = useCallback(async () => {
    try {
      const data = await getPublicMatch(id);
      const goals = data.events.filter((e) => e.event_type === 'score').length;
      if (goals > previousGoalCount.current && previousGoalCount.current > 0) {
        triggerPulse();
      }
      previousGoalCount.current = goals;
      setBundle(data);
    } catch {
      setBundle(null);
    } finally {
      setLoading(false);
    }
  }, [id, triggerPulse]);

  useEffect(() => {
    const timeout = setTimeout(() => { setNow(Date.now()); void load(); }, 0);
    const interval = setInterval(() => { setNow(Date.now()); void load(); }, 1000);
    return () => { clearTimeout(timeout); clearInterval(interval); };
  }, [load]);

  const realtimeTables = useMemo(() => [
    { table: 'match_events', filter: `match_id=eq.${id}`, onEvent: () => void load() },
    { table: 'matches', filter: `id=eq.${id}`, onEvent: () => void load() },
  ], [id, load]);

  useRealtimeChannel('tv-match', realtimeTables);

  const publicUrl = useMemo(() => (typeof window !== 'undefined' ? `${window.location.origin}/matches/${id}` : ''), [id]);
  const density = useDensity(bundle?.events.length ?? 0);

  if (loading) {
    return (
      <View className="h-screen items-center justify-center overflow-hidden bg-slate-950">
        <ActivityIndicator color="#10B981" size="large" />
      </View>
    );
  }

  if (!bundle) {
    return (
      <View className="h-screen items-center justify-center overflow-hidden bg-slate-950 p-6">
        <Text className="text-2xl font-black text-white">{t('matches.notFound')}</Text>
      </View>
    );
  }

  const { match, homeTeam, awayTeam, events } = bundle;
  const statusLabel = match.status === 'live' ? `🔴 ${t('tv.live')}` : match.status === 'finished' ? t('tv.finished') : t('tv.preparation');
  const majorEvents = events
    .filter((e) => e.event_type === 'score' || e.event_type === 'yellow_card' || e.event_type === 'red_card' || e.event_type === 'match_end')
    .sort((a, b) => a.clock_seconds - b.clock_seconds);
  const clockValue = (match.clock_seconds ?? 0) + (match.clock_started_at ? Math.max(0, Math.floor((now - new Date(match.clock_started_at).getTime()) / 1000)) : 0);

  return (
    <View className="h-screen overflow-hidden bg-slate-950 p-6">
      <TvControls publicUrl={publicUrl} />

      {/* Header / Scoreboard */}
      <View className="shrink-0">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-black text-slate-400">{match.pitch_location}</Text>
          <View className="rounded-full bg-slate-900 px-4 py-1.5">
            <Text className="text-lg font-black text-emerald-400">{statusLabel}</Text>
          </View>
        </View>

        <View className="mt-2 flex-row items-center justify-center gap-4">
          <View className="flex-1 items-center gap-2">
            <View style={{ backgroundColor: homeTeam.color }} className="h-24 w-24 items-center justify-center overflow-hidden rounded-2xl shadow-lg shadow-emerald-500/10">
              {teamLogo(homeTeam)}
            </View>
            <Text className="text-center text-2xl font-black text-white" numberOfLines={1}>{homeTeam.name}</Text>
          </View>

          <View className="items-center gap-1">
            <Animated.View style={{ transform: [{ scale }] }}>
              <Text className="text-7xl font-black text-white md:text-9xl">{match.home_score ?? 0} - {match.away_score ?? 0}</Text>
            </Animated.View>
            <View className="rounded-xl bg-slate-900 px-6 py-2">
              <Text className="font-mono text-5xl font-black text-emerald-400 md:text-6xl">{formatClock(clockValue)}</Text>
            </View>
          </View>

          <View className="flex-1 items-center gap-2">
            <View style={{ backgroundColor: awayTeam.color }} className="h-24 w-24 items-center justify-center overflow-hidden rounded-2xl shadow-lg shadow-emerald-500/10">
              {teamLogo(awayTeam)}
            </View>
            <Text className="text-center text-2xl font-black text-white" numberOfLines={1}>{awayTeam.name}</Text>
          </View>
        </View>
      </View>

      {/* Central vertical timeline */}
      <View className="relative mt-4 flex-1 min-h-0 flex-row">
        <View className="absolute left-1/2 top-0 bottom-0 w-1 -translate-x-0.5 bg-slate-700" />

        <View className="flex-1 flex-col">
          {majorEvents.map((evt) => {
            const isHome = evt.team_id === homeTeam.id;
            const minute = Math.floor(evt.clock_seconds / 60);
            const content = isHome ? (
              <View className={`flex-row items-center justify-end ${density.row}`}>
                <View className="max-w-[80%] items-end">
                  <Text className={`font-black text-white ${density.player}`} numberOfLines={1}>{evt.player_name ?? t('scorekeeper.unattributed')}</Text>
                  {evt.metadata?.goal_type ? <Text className={`text-emerald-400 ${density.meta}`}>{t(`events.goalTypes.${evt.metadata.goal_type}`)}</Text> : null}
                </View>
                <Text className={`${density.icon} ml-3`}>{eventIconFor(evt)}</Text>
              </View>
            ) : (
              <View className={`flex-row items-center ${density.row}`}>
                <Text className={`${density.icon} mr-3`}>{eventIconFor(evt)}</Text>
                <View className="max-w-[80%] items-start">
                  <Text className={`font-black text-white ${density.player}`} numberOfLines={1}>{evt.player_name ?? t('scorekeeper.unattributed')}</Text>
                  {evt.metadata?.goal_type ? <Text className={`text-emerald-400 ${density.meta}`}>{t(`events.goalTypes.${evt.metadata.goal_type}`)}</Text> : null}
                </View>
              </View>
            );

            return (
              <View key={evt.id} className="flex-1 min-h-0 flex-row items-center">
                <View className="flex-1 justify-center overflow-hidden">{isHome ? content : null}</View>
                <View className={`z-10 items-center justify-center rounded-full border-2 border-slate-700 bg-slate-900 font-black text-emerald-400 ${density.minute}`}>
                  <Text className="font-black text-emerald-400">{`${minute}'`}</Text>
                </View>
                <View className="flex-1 justify-center overflow-hidden">{!isHome ? content : null}</View>
              </View>
            );
          })}
          {majorEvents.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <Text className="text-3xl font-black text-slate-500">{t('matchCenter.noEvents')}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
