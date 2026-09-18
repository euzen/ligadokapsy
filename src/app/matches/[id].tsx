import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, Text, View } from 'react-native';

import { MatchTimeline } from '@/components/match-timeline';
import { getPublicMatch } from '@/features/auth/local-db';
import type { PublicMatch, Team } from '@/types/database';

function TeamCard({ team, score }: { team: Team; score: number | null }) {
  return (
    <View className="flex-1 items-center">
      <View style={{ backgroundColor: team.color }} className="h-16 w-16 items-center justify-center overflow-hidden rounded-2xl">
        {team.logo_url ? <Image source={{ uri: team.logo_url }} className="h-full w-full" /> : <Text className="text-2xl">🛡️</Text>}
      </View>
      <Text className="mt-2 text-center text-sm font-bold text-slate-900 dark:text-white">{team.name}</Text>
      <Text className="mt-2 text-6xl font-black text-slate-900 dark:text-white">{score ?? 0}</Text>
    </View>
  );
}

function clock(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export default function PublicMatchScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [bundle, setBundle] = useState<PublicMatch | null>(null);
  const [now, setNow] = useState(0);

  const refresh = useCallback(() => { void getPublicMatch(id).then(setBundle); }, [id]);
  useEffect(() => {
    const timeout = setTimeout(refresh, 0);
    const interval = setInterval(() => { setNow(Date.now()); refresh(); }, 1000);
    return () => { clearTimeout(timeout); clearInterval(interval); };
  }, [refresh]);

  if (!bundle) return <View className="flex-1 bg-slate-50 dark:bg-slate-900" />;

  const elapsed = bundle.match.clock_seconds + (bundle.match.clock_started_at ? Math.max(0, Math.floor((now - new Date(bundle.match.clock_started_at).getTime()) / 1000)) : 0);
  const badge = bundle.match.status === 'live' ? 'bg-red-600 text-white' : bundle.match.status === 'finished' ? 'bg-slate-700 text-white' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400';

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-900" contentContainerClassName="items-center px-4 pb-24 pt-6">
      <View className="w-full max-w-3xl gap-4">
        <View className="items-center">
          <View className={`rounded-full px-3 py-1.5 ${badge.split(' ')[0]}`}>
            <Text className={`text-[10px] font-black uppercase ${badge.split(' ')[1]}`}>{t(`matches.status.${bundle.match.status}`)}</Text>
          </View>
          <Text className="mt-3 font-mono text-4xl font-black text-slate-900 dark:text-white">{clock(elapsed)}</Text>
          <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">{bundle.match.match_date} · {bundle.match.match_time} · {bundle.match.pitch_location}</Text>
        </View>
        <View className="flex-row items-center rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <TeamCard team={bundle.homeTeam} score={bundle.match.home_score} />
          <Text className="text-2xl font-black text-slate-300 dark:text-slate-500">:</Text>
          <TeamCard team={bundle.awayTeam} score={bundle.match.away_score} />
        </View>
        <View className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <Text className="text-lg font-bold text-slate-900 dark:text-white">{t('matchCenter.timeline')}</Text>
          <View className="mt-3">
            <MatchTimeline match={bundle.match} events={bundle.events} sport={bundle.sport} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
