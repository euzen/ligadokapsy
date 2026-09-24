import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Animated, Image, Text, View } from 'react-native';

import { TvControls } from '@/components/tv-controls';
import { getPublicMatch } from '@/features/auth/local-db';
import { useRealtimeChannel } from '@/hooks/use-realtime';
import type { MatchEvent, PublicMatch } from '@/types/database';

const PULSE_DURATION = 800;

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
    <Text className="text-5xl font-black text-white">{initials(team.name)}</Text>
  );
}

function eventIcon(type: MatchEvent['event_type'], metadata: MatchEvent['metadata']) {
  if (type === 'score') {
    if (metadata?.goal_type === 'penalty') return '🥅';
    if (metadata?.note === 'substitution') return '🔄';
    return '⚽';
  }
  if (type === 'yellow_card') return '🟨';
  if (type === 'red_card') return '🟥';
  return '•';
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
      Animated.timing(scale, { toValue: 1.2, duration: PULSE_DURATION / 2, useNativeDriver: false }),
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

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator color="#10B981" size="large" />
      </View>
    );
  }

  if (!bundle) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950 p-6">
        <Text className="text-2xl font-black text-white">{t('matches.notFound')}</Text>
      </View>
    );
  }

  const { match, homeTeam, awayTeam, events } = bundle;
  const statusLabel = match.status === 'live' ? `🔴 ${t('tv.live')}` : match.status === 'finished' ? t('tv.finished') : t('tv.preparation');
  const majorEvents = events
    .filter((e) => e.event_type === 'score' || e.event_type === 'yellow_card' || e.event_type === 'red_card')
    .sort((a, b) => a.clock_seconds - b.clock_seconds);
  const clockValue = (match.clock_seconds ?? 0) + (match.clock_started_at ? Math.max(0, Math.floor((now - new Date(match.clock_started_at).getTime()) / 1000)) : 0);

  return (
    <View className="flex-1 bg-slate-950 p-8">
      <TvControls publicUrl={publicUrl} />

      {/* Header */}
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-3xl font-black text-white" numberOfLines={1}>🏆 {bundle.match.tournament_id ? t('common.appName') : ''}</Text>
          <Text className="mt-1 text-xl text-slate-400">{match.pitch_location}</Text>
        </View>
        <View className="rounded-full bg-slate-900 px-5 py-2">
          <Text className="text-xl font-black text-emerald-400">{statusLabel}</Text>
        </View>
      </View>

      {/* Scoreboard */}
      <View className="mt-10 flex-1 items-center justify-center">
        <View className="w-full flex-row items-center justify-center gap-6">
          <View className="flex-1 items-center gap-4">
            <View style={{ backgroundColor: homeTeam.color }} className="h-40 w-40 items-center justify-center overflow-hidden rounded-3xl shadow-lg shadow-emerald-500/10">
              {teamLogo(homeTeam)}
            </View>
            <Text className="text-center text-4xl font-black text-white" numberOfLines={2}>{homeTeam.name}</Text>
          </View>

          <View className="items-center gap-3">
            <Animated.View style={{ transform: [{ scale }] }}>
              <Text className="text-[120px] font-black leading-none text-white">{match.home_score ?? 0} - {match.away_score ?? 0}</Text>
            </Animated.View>
            <View className="rounded-2xl bg-slate-900 px-8 py-3">
              <Text className="font-mono text-6xl font-black text-emerald-400">{formatClock(clockValue)}</Text>
            </View>
          </View>

          <View className="flex-1 items-center gap-4">
            <View style={{ backgroundColor: awayTeam.color }} className="h-40 w-40 items-center justify-center overflow-hidden rounded-3xl shadow-lg shadow-emerald-500/10">
              {teamLogo(awayTeam)}
            </View>
            <Text className="text-center text-4xl font-black text-white" numberOfLines={2}>{awayTeam.name}</Text>
          </View>
        </View>
      </View>

      {/* Event stream */}
      <View className="mt-6 h-48 justify-end">
        <View className="flex-row flex-wrap items-end justify-center gap-4">
          {majorEvents.slice(-6).map((evt) => (
            <View key={evt.id} className="flex-row items-center gap-3 rounded-2xl bg-slate-900 px-5 py-3">
              <Text className="text-4xl">{eventIcon(evt.event_type, evt.metadata)}</Text>
              <View>
                <Text className="text-xl font-black text-white">{evt.player_name ?? t('scorekeeper.unattributed')}</Text>
                <Text className="text-sm font-bold text-emerald-400">{`${Math.floor(evt.clock_seconds / 60)}' · ${evt.team_id === homeTeam.id ? homeTeam.name : awayTeam.name}`}</Text>
              </View>
            </View>
          ))}
          {majorEvents.length === 0 ? <Text className="text-slate-500">{t('matchCenter.noEvents')}</Text> : null}
        </View>
      </View>
    </View>
  );
}
