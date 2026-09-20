import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';

import { ExportButton } from '@/components/ui/export-button';
import { SortableHeader } from '@/components/ui/sortable-header';
import { Tooltip } from '@/components/ui/tooltip';
import { calculateStandings } from '@/features/auth/standings';
import { useSortable } from '@/hooks/use-sortable';
import type { Match, Standing, Team } from '@/types/database';

type SortKey = 'team' | 'played' | 'wins' | 'draws' | 'losses' | 'goalsFor' | 'goalDifference' | 'points';

const comparators: Record<SortKey, (a: Standing, b: Standing) => number> = {
  team: (a, b) => a.team.name.localeCompare(b.team.name),
  played: (a, b) => a.played - b.played,
  wins: (a, b) => a.wins - b.wins,
  draws: (a, b) => a.draws - b.draws,
  losses: (a, b) => a.losses - b.losses,
  goalsFor: (a, b) => a.goalsFor - b.goalsFor,
  goalDifference: (a, b) => a.goalDifference - b.goalDifference,
  points: (a, b) => a.points - b.points,
};

export function StandingsTable({ teams, matches }: { teams: Team[]; matches: Match[] }) {
  const { t } = useTranslation();
  const standings = calculateStandings(teams, matches);
  const { sorted, sort, toggle } = useSortable<Standing, SortKey>(standings, comparators);

  const tooltips: Record<string, string> = {
    played: t('standings.tooltips.played'),
    wins: t('standings.tooltips.wins'),
    draws: t('standings.tooltips.draws'),
    losses: t('standings.tooltips.losses'),
  };

  const exportHeaders = [t('standings.team'), t('standings.played'), t('standings.wins'), t('standings.draws'), t('standings.losses'), 'GF', 'GA', 'GD', 'PTS'];
  const exportRows = useMemo(() => sorted.map((row) => [row.team.name, row.played, row.wins, row.draws, row.losses, row.goalsFor, row.goalsAgainst, row.goalDifference, row.points]), [sorted]);

  type StatKey = 'played' | 'wins' | 'draws' | 'losses';
  const columns: { key: StatKey; sortKey: SortKey; label: string; width: string }[] = [
    { key: 'played', sortKey: 'played', label: t('standings.played'), width: 'w-10' },
    { key: 'wins', sortKey: 'wins', label: t('standings.wins'), width: 'w-10' },
    { key: 'draws', sortKey: 'draws', label: t('standings.draws'), width: 'w-10' },
    { key: 'losses', sortKey: 'losses', label: t('standings.losses'), width: 'w-10' },
  ];

  return (
    <View className="gap-2">
      <View className="flex-row justify-end">
        <ExportButton filename="standings" headers={exportHeaders} rows={exportRows} />
      </View>
      <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-scrolling-touch" contentContainerClassName="min-w-full">
          <View className="min-w-[28rem]">
            <View className="flex-row border-b border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-900">
              <Text className="w-8 text-xs font-black uppercase text-slate-500 dark:text-slate-400">#</Text>
              <View className="w-40 flex-shrink-0">
                <SortableHeader label={t('standings.team')} active={sort.key === 'team'} direction={sort.direction} onPress={() => toggle('team')} />
              </View>
              {columns.map((col) => (
                <View key={col.key} className={`${col.width} items-center`}>
                  <Tooltip text={tooltips[col.key] ?? col.label}>
                    <SortableHeader label={col.label} active={sort.key === col.sortKey} direction={sort.direction} onPress={() => toggle(col.sortKey)} />
                  </Tooltip>
                </View>
              ))}
              <View className="w-16 items-center">
                <Tooltip text={t('standings.tooltips.goals')}>
                  <SortableHeader label="GF:GA" active={sort.key === 'goalsFor'} direction={sort.direction} onPress={() => toggle('goalsFor')} />
                </Tooltip>
              </View>
              <View className="w-10 items-center">
                <Tooltip text={t('standings.tooltips.goalDifference')}>
                  <SortableHeader label="GD" active={sort.key === 'goalDifference'} direction={sort.direction} onPress={() => toggle('goalDifference')} />
                </Tooltip>
              </View>
              <View className="w-12 items-center">
                <Tooltip text={t('standings.tooltips.points')}>
                  <SortableHeader label="PTS" active={sort.key === 'points'} direction={sort.direction} onPress={() => toggle('points')} />
                </Tooltip>
              </View>
            </View>
            {sorted.map((row, index) => (
              <View key={row.team.id} className="flex-row items-center border-b border-slate-100 px-3 py-3 last:border-0 dark:border-slate-700">
                <Text className="w-8 text-sm font-black text-slate-900 dark:text-white">{index + 1}</Text>
                <Text className="w-40 flex-shrink-0 text-sm font-bold text-slate-900 dark:text-white" numberOfLines={1}>{row.team.name}</Text>
                {columns.map((col) => <Text key={col.key} className={`${col.width} text-center text-sm text-slate-900 dark:text-white`}>{row[col.key]}</Text>)}
                <Text className="w-16 text-center text-sm text-slate-900 dark:text-white">{row.goalsFor}:{row.goalsAgainst}</Text>
                <Text className="w-10 text-center text-sm text-slate-900 dark:text-white">{row.goalDifference}</Text>
                <Text className="w-12 text-center text-sm font-black text-brand">{row.points}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
