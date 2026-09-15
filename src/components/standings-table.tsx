import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { calculateStandings } from '@/features/auth/standings';
import type { Match, Team } from '@/types/database';

export function StandingsTable({ teams, matches }: { teams: Team[]; matches: Match[] }) {
  const { t } = useTranslation(); const standings = calculateStandings(teams, matches); const columns = ['played', 'wins', 'draws', 'losses'] as const;
  return <View className="overflow-hidden rounded-2xl bg-white p-5"><View className="flex-row border-b border-slate-200 pb-3"><Text className="flex-1 text-xs font-black uppercase text-muted">{t('standings.team')}</Text>{columns.map((key) => <Text key={key} className="w-9 text-center text-xs font-black text-muted">{t(`standings.${key}`)}</Text>)}<Text className="w-14 text-center text-xs font-black text-muted">GF:GA</Text><Text className="w-10 text-center text-xs font-black text-muted">GD</Text><Text className="w-10 text-center text-xs font-black text-muted">PTS</Text></View>{standings.map((row, index) => <View key={row.team.id} className="flex-row items-center border-b border-slate-100 py-4"><Text className="flex-1 font-black text-ink">{index + 1}. {row.team.name}</Text>{columns.map((key) => <Text key={key} className="w-9 text-center text-sm text-ink">{row[key]}</Text>)}<Text className="w-14 text-center text-sm text-ink">{row.goalsFor}:{row.goalsAgainst}</Text><Text className="w-10 text-center text-sm text-ink">{row.goalDifference}</Text><Text className="w-10 text-center font-black text-brand">{row.points}</Text></View>)}</View>;
}
