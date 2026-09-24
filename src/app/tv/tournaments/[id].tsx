import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, Text, View } from 'react-native';

import { BracketView } from '@/components/bracket-view';
import { TvControls } from '@/components/tv-controls';
import { calculateStandings } from '@/features/auth/standings';
import { useMatches, useTournamentTeams, useTournaments } from '@/features/auth/use-local-data';
import { useRealtimeChannel } from '@/hooks/use-realtime';
import type { Match, Team } from '@/types/database';

const ROTATION_INTERVAL_MS = 15000;

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('');
}

function teamBlock(team: Team) {
  return (
    <View className="flex-row items-center gap-2">
      <View style={{ backgroundColor: team.color }} className="h-8 w-8 items-center justify-center rounded-lg">
        <Text className="text-xs font-black text-white">{initials(team.name)}</Text>
      </View>
      <Text className="flex-1 text-lg font-bold text-white" numberOfLines={1}>{team.name}</Text>
    </View>
  );
}

function AutoScrollContainer({ children, active }: { children: React.ReactNode; active: boolean }) {
  const [height, setHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [translateY] = useState(() => new Animated.Value(0));
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!active || height <= 0 || contentHeight <= height) {
      translateY.setValue(0);
      animationRef.current?.stop();
      return;
    }
    const max = contentHeight - height;
    const duration = Math.max(4000, max * 20);

    animationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, { toValue: -max, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(translateY, { toValue: 0, duration: duration * 0.4, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ]),
    );
    animationRef.current.start();
    return () => { animationRef.current?.stop(); };
  }, [active, height, contentHeight, translateY]);

  return (
    <View className="flex-1 overflow-hidden" onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      <Animated.View onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)} style={{ transform: [{ translateY }] }}>
        {children}
      </Animated.View>
    </View>
  );
}

export default function TvTournamentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { data: allTournaments } = useTournaments();
  const tournament = useMemo(() => allTournaments.find((t) => t.id === id), [allTournaments, id]);
  const { data: registered } = useTournamentTeams(id);
  const { data: matches, refresh: refreshMatches } = useMatches(id);

  const [viewIndex, setViewIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const standings = useMemo(() => calculateStandings(registered, matches ?? []), [registered, matches]);

  const hasSchedule = (matches?.length ?? 0) > 0;
  const hasStandings = registered.length > 0;
  const bracketMatches = useMemo(() => (matches ?? []).filter((m) => m.round_number !== null && m.round_number !== undefined), [matches]);
  const hasBracket = bracketMatches.length > 0;

  const availableViews = useMemo(() => {
    const views: ('schedule' | 'standings' | 'bracket')[] = [];
    if (hasSchedule) views.push('schedule');
    if (hasStandings) views.push('standings');
    if (hasBracket) views.push('bracket');
    return views;
  }, [hasSchedule, hasStandings, hasBracket]);

  const currentView = availableViews[viewIndex % availableViews.length] ?? 'schedule';

  useEffect(() => {
    if (availableViews.length <= 1 || paused) return;
    const interval = setInterval(() => {
      setViewIndex((i) => (i + 1) % availableViews.length);
    }, ROTATION_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [availableViews.length, paused]);

  const reload = useCallback(() => { void refreshMatches(); }, [refreshMatches]);

  useRealtimeChannel('tv-tournament', [
    { table: 'matches', filter: `tournament_id=eq.${id}`, onEvent: () => void reload() },
    { table: 'match_events', filter: `match_id=in.(${(matches ?? []).map((m) => m.id).join(',')})`, onEvent: () => void reload() },
  ]);

  const publicUrl = useMemo(() => (typeof window !== 'undefined' ? `${window.location.origin}/tournaments/${id}` : ''), [id]);

  if (!tournament) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950 p-6">
        <ActivityIndicator color="#10B981" size="large" />
      </View>
    );
  }

  const liveMatches = (matches ?? []).filter((m) => m.status === 'live');
  const upcoming = (matches ?? []).filter((m) => m.status === 'scheduled').sort((a, b) => `${a.match_date}T${a.match_time}`.localeCompare(`${b.match_date}T${b.match_time}`));

  return (
    <View className="flex-1 bg-slate-950 p-8">
      <TvControls publicUrl={publicUrl} showRotation={availableViews.length > 1} rotationPaused={paused} onToggleRotation={() => setPaused((p) => !p)} />

      {/* Header */}
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-5xl font-black text-white" numberOfLines={1}>{tournament.name}</Text>
          <Text className="text-xl text-slate-400">{tournament.location}</Text>
        </View>
        <View className="rounded-full bg-emerald-500/20 px-5 py-2">
          <Text className="text-xl font-black text-emerald-400">{t(`tv.${currentView}`)}</Text>
        </View>
      </View>

      {/* View content */}
      <View className="mt-6 flex-1">
        {currentView === 'schedule' ? (
          <AutoScrollContainer active>
            <View className="gap-6">
              {liveMatches.length > 0 ? (
                <View>
                  <Text className="mb-3 text-2xl font-black text-emerald-400">🔴 {t('tv.live')}</Text>
                  <View className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {liveMatches.map((m) => <MatchCard key={m.id} match={m} teams={registered} />)}
                  </View>
                </View>
              ) : null}
              <View>
                <Text className="mb-3 text-2xl font-black text-white">{t('tv.upcoming')}</Text>
                <View className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {upcoming.slice(0, 8).map((m) => <MatchCard key={m.id} match={m} teams={registered} />)}
                </View>
              </View>
            </View>
          </AutoScrollContainer>
        ) : currentView === 'standings' ? (
          <AutoScrollContainer active>
            <View className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
              <View className="flex-row border-b border-slate-700 pb-3">
                <Text className="w-16 text-xl font-black text-emerald-400">#</Text>
                <Text className="flex-1 text-xl font-black text-white">{t('standings.team')}</Text>
                <Text className="w-20 text-center text-xl font-black text-white">{t('standings.played')}</Text>
                <Text className="w-20 text-center text-xl font-black text-white">{t('standings.wins')}</Text>
                <Text className="w-20 text-center text-xl font-black text-white">{t('standings.draws')}</Text>
                <Text className="w-20 text-center text-xl font-black text-white">{t('standings.losses')}</Text>
                <Text className="w-24 text-center text-xl font-black text-white">GD</Text>
                <Text className="w-20 text-center text-xl font-black text-emerald-400">{t('tv.points')}</Text>
              </View>
              {standings.map((row, index) => (
                <View key={row.team.id} className="flex-row items-center border-b border-slate-800 py-4 last:border-0">
                  <Text className="w-16 text-2xl font-black text-slate-400">{index + 1}</Text>
                  <View className="flex-1">{teamBlock(row.team)}</View>
                  <Text className="w-20 text-center text-xl font-bold text-white">{row.played}</Text>
                  <Text className="w-20 text-center text-xl font-bold text-white">{row.wins}</Text>
                  <Text className="w-20 text-center text-xl font-bold text-white">{row.draws}</Text>
                  <Text className="w-20 text-center text-xl font-bold text-white">{row.losses}</Text>
                  <Text className="w-24 text-center text-xl font-bold text-white">{row.goalDifference}</Text>
                  <Text className="w-20 text-center text-2xl font-black text-emerald-400">{row.points}</Text>
                </View>
              ))}
            </View>
          </AutoScrollContainer>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1">
            <View className="min-w-full flex-1">
              <BracketView matches={bracketMatches} teams={registered} />
            </View>
          </ScrollView>
        )}
      </View>

      {/* View dots */}
      {availableViews.length > 1 ? (
        <View className="mt-4 flex-row justify-center gap-3">
          {availableViews.map((v, i) => (
            <Pressable key={v} onPress={() => setViewIndex(i)} className={`h-3 w-3 rounded-full ${i === viewIndex % availableViews.length ? 'bg-emerald-400' : 'bg-slate-700'}`} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function MatchCard({ match, teams }: { match: Match; teams: Team[] }) {
  const home = teams.find((t) => t.id === match.home_team_id);
  const away = teams.find((t) => t.id === match.away_team_id);
  const { t } = useTranslation();
  if (!home || !away) return null;
  return (
    <View className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <View className="flex-row items-center justify-between">
        {teamBlock(home)}
        <Text className="mx-4 text-5xl font-black text-white">{match.home_score ?? 0}-{match.away_score ?? 0}</Text>
        {teamBlock(away)}
      </View>
      <View className="mt-3 flex-row justify-between">
        <Text className="text-lg text-slate-400">{match.pitch_location}</Text>
        <Text className={`text-lg font-black ${match.status === 'live' ? 'text-emerald-400' : 'text-slate-400'}`}>
          {match.status === 'live' ? `🔴 ${t('tv.live')}` : `${match.match_date} ${match.match_time}`}
        </Text>
      </View>
    </View>
  );
}
