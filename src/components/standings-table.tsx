import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';

import { calculateStandings } from '@/features/auth/standings';
import type { Match, Team } from '@/types/database';

export function StandingsTable({ teams, matches }: { teams: Team[]; matches: Match[] }) {
  const { t } = useTranslation();
  const standings = calculateStandings(teams, matches);
  const columns = ['played', 'wins', 'draws', 'losses'] as const;

  return (
    <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-scrolling-touch" contentContainerClassName="min-w-full">
        <View className="min-w-[28rem]">
          <View className="flex-row border-b border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-900">
            <Text className="w-8 text-xs font-black uppercase text-slate-500 dark:text-slate-400">#</Text>
            <Text className="w-40 flex-shrink-0 text-xs font-black uppercase text-slate-500 dark:text-slate-400">{t('standings.team')}</Text>
            {columns.map((key) => <Text key={key} className="w-10 text-center text-xs font-black uppercase text-slate-500 dark:text-slate-400">{t(`standings.${key}`)}</Text>)}
            <Text className="w-16 text-center text-xs font-black uppercase text-slate-500 dark:text-slate-400">GF:GA</Text>
            <Text className="w-10 text-center text-xs font-black uppercase text-slate-500 dark:text-slate-400">GD</Text>
            <Text className="w-12 text-center text-xs font-black uppercase text-slate-500 dark:text-slate-400">PTS</Text>
          </View>
          {standings.map((row, index) => (
            <View key={row.team.id} className="flex-row items-center border-b border-slate-100 px-3 py-3 last:border-0 dark:border-slate-700">
              <Text className="w-8 text-sm font-black text-slate-900 dark:text-white">{index + 1}</Text>
              <Text className="w-40 flex-shrink-0 text-sm font-bold text-slate-900 dark:text-white" numberOfLines={1}>{row.team.name}</Text>
              {columns.map((key) => <Text key={key} className="w-10 text-center text-sm text-slate-900 dark:text-white">{row[key]}</Text>)}
              <Text className="w-16 text-center text-sm text-slate-900 dark:text-white">{row.goalsFor}:{row.goalsAgainst}</Text>
              <Text className="w-10 text-center text-sm text-slate-900 dark:text-white">{row.goalDifference}</Text>
              <Text className="w-12 text-center text-sm font-black text-brand">{row.points}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
