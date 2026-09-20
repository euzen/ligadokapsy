import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { roundLabel, BRACKET_PLACEHOLDER_TEAM } from '@/utils/bracket-generator';
import type { Match, Team } from '@/types/database';

type Props = { matches: Match[]; teams: Team[] };

export function BracketView({ matches, teams }: Props) {
  const { t } = useTranslation();
  const teamMap = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);

  const bracketMatches = useMemo(
    () => matches.filter((m) => m.round_number !== null && m.round_number !== undefined).sort((a, b) => (a.round_number ?? 0) - (b.round_number ?? 0) || (a.bracket_position ?? 0) - (b.bracket_position ?? 0)),
    [matches],
  );

  const rounds = useMemo(() => {
    const map = new Map<number, Match[]>();
    for (const m of bracketMatches) {
      const r = m.round_number ?? 0;
      if (!map.has(r)) map.set(r, []);
      map.get(r)!.push(m);
    }
    return [...map.entries()].sort(([a], [b]) => a - b);
  }, [bracketMatches]);

  const totalRounds = rounds.length;

  // Special matches
  const thirdPlaceMatch = bracketMatches.find((m) => m.bracket_type === 'third_place');

  if (!bracketMatches.length) {
    return (
      <View className="items-center rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-800">
        <Text className="text-center text-lg font-black text-slate-900 dark:text-white">{t('bracket.empty')}</Text>
        <Text className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">{t('bracket.emptyHint')}</Text>
      </View>
    );
  }

  const teamName = (id: string) => {
    if (!id || id === BRACKET_PLACEHOLDER_TEAM || id === '00000000-0000-0000-0000-000000000000') return t('bracket.tbd');
    return teamMap.get(id)?.name ?? t('bracket.tbd');
  };

  const teamColor = (id: string) => {
    if (!id || id === BRACKET_PLACEHOLDER_TEAM || id === '00000000-0000-0000-0000-000000000000') return '#94A3B8';
    return teamMap.get(id)?.color ?? '#94A3B8';
  };

  const statusBadge = (m: Match) => {
    if (m.status === 'live') return { label: t('bracket.live'), cls: 'bg-red-500 text-white' };
    if (m.status === 'finished') return { label: t('bracket.finished'), cls: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' };
    return null;
  };

  const isWinner = (m: Match, side: 'home' | 'away') => {
    if (m.status !== 'finished') return false;
    const h = m.home_score ?? 0;
    const a = m.away_score ?? 0;
    return side === 'home' ? h > a : a > h;
  };

  const renderMatch = (m: Match) => {
    const badge = statusBadge(m);
    return (
      <Pressable key={m.id} onPress={() => router.push(`/matches/${m.id}` as never)} className="w-56 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {badge ? <View className={`rounded-t-xl px-2 py-0.5 ${badge.cls}`}><Text className="text-center text-[10px] font-black">{badge.label}</Text></View> : null}
        {/* Home team */}
        <View className={`flex-row items-center gap-2 border-b border-slate-100 px-3 py-2.5 dark:border-slate-700 ${isWinner(m, 'home') ? 'bg-emerald-50 dark:bg-emerald-900/30' : ''}`}>
          <View style={{ backgroundColor: teamColor(m.home_team_id) }} className="h-5 w-5 rounded-md" />
          <Text className={`flex-1 text-sm ${isWinner(m, 'home') ? 'font-black text-slate-900 dark:text-white' : 'font-bold text-slate-600 dark:text-slate-300'}`} numberOfLines={1}>{teamName(m.home_team_id)}</Text>
          <Text className={`min-w-6 text-center text-sm font-black ${isWinner(m, 'home') ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>{m.home_score ?? '-'}</Text>
        </View>
        {/* Away team */}
        <View className={`flex-row items-center gap-2 px-3 py-2.5 ${isWinner(m, 'away') ? 'bg-emerald-50 dark:bg-emerald-900/30' : ''}`}>
          <View style={{ backgroundColor: teamColor(m.away_team_id) }} className="h-5 w-5 rounded-md" />
          <Text className={`flex-1 text-sm ${isWinner(m, 'away') ? 'font-black text-slate-900 dark:text-white' : 'font-bold text-slate-600 dark:text-slate-300'}`} numberOfLines={1}>{teamName(m.away_team_id)}</Text>
          <Text className={`min-w-6 text-center text-sm font-black ${isWinner(m, 'away') ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>{m.away_score ?? '-'}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View className="gap-6">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-6 p-2">
        {rounds.filter(([, ms]) => !ms.every((m) => m.bracket_type === 'third_place')).map(([roundNum, roundMatches]) => {
          const winnerMatches = roundMatches.filter((m) => m.bracket_type !== 'third_place');
          return (
            <View key={roundNum} className="items-center gap-4" style={{ minWidth: 240 }}>
              <Text className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{roundLabel(roundNum, totalRounds, t)}</Text>
              <View className="gap-6 justify-center flex-1">
                {winnerMatches.map((m) => renderMatch(m))}
              </View>
            </View>
          );
        })}
      </ScrollView>
      {thirdPlaceMatch ? (
        <View className="items-center gap-2">
          <Text className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('bracket.thirdPlace')}</Text>
          {renderMatch(thirdPlaceMatch)}
        </View>
      ) : null}
    </View>
  );
}
