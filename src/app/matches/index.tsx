import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useMatches, useTeams } from '@/features/auth/use-local-data';

export default function MatchCenterScreen() {
  const { t } = useTranslation(); const { data: matches } = useMatches(); const { data: teams } = useTeams(); const names = new Map(teams.map((team) => [team.id, team.name]));
  return <ScrollView className="flex-1 bg-canvas" contentContainerClassName="items-center px-5 pb-24 pt-10"><View className="w-full max-w-5xl"><Text className="text-xs font-black uppercase tracking-widest text-brand">{t('matchCenter.badge')}</Text><Text className="mt-2 text-4xl font-black text-ink">{t('matchCenter.title')}</Text><View className="mt-7 gap-3">{matches.map((match) => <Pressable key={match.id} onPress={() => router.push(`/matches/${match.id}` as never)} className="flex-row items-center gap-4 rounded-2xl bg-white p-5"><View className={`h-3 w-3 rounded-full ${match.status === 'live' ? 'bg-red-500' : 'bg-slate-300'}`} /><View className="flex-1"><Text className="font-black text-ink">{names.get(match.home_team_id)} — {names.get(match.away_team_id)}</Text><Text className="mt-1 text-sm text-muted">{match.match_date} · {match.match_time}</Text></View><Text className="font-mono text-2xl font-black text-ink">{match.home_score ?? '–'} : {match.away_score ?? '–'}</Text><Text className="text-xs font-black uppercase text-brand">{t(`matches.status.${match.status}`)}</Text></Pressable>)}</View></View></ScrollView>;
}
