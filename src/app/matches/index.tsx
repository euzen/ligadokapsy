import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { useMatches, useTeams, useTournaments } from '@/features/auth/use-local-data';
import type { Match } from '@/types/database';

const STATUS_FILTERS: (Match['status'] | 'all')[] = ['all', 'live', 'scheduled', 'finished', 'cancelled'];
const DATE_FILTERS = ['all', 'today', 'week'] as const;

export default function MatchCenterScreen() {
  const { t } = useTranslation();
  const { data: matches } = useMatches();
  const { data: teams } = useTeams();
  const { data: tournaments } = useTournaments();
  const teamNames = useMemo(() => new Map(teams.map((team) => [team.id, team.name])), [teams]);
  const sportByTeam = useMemo(() => new Map(teams.map((team) => [team.id, team.primary_sport])), [teams]);
  const tournamentNames = useMemo(() => new Map(tournaments.map((item) => [item.id, item.name])), [tournaments]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Match['status'] | 'all'>('all');
  const [tournamentFilter, setTournamentFilter] = useState<string>('all');
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<(typeof DATE_FILTERS)[number]>('all');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return matches.filter((match) => {
      if (statusFilter !== 'all' && match.status !== statusFilter) return false;
      if (tournamentFilter !== 'all' && match.tournament_id !== tournamentFilter) return false;
      if (sportFilter !== 'all' && sportByTeam.get(match.home_team_id) !== sportFilter && sportByTeam.get(match.away_team_id) !== sportFilter) return false;
      if (dateFilter === 'today' && match.match_date !== today) return false;
      if (dateFilter === 'week' && (match.match_date < today || match.match_date > weekFromNow)) return false;
      if (!term) return true;
      const home = teamNames.get(match.home_team_id)?.toLowerCase() ?? '';
      const away = teamNames.get(match.away_team_id)?.toLowerCase() ?? '';
      const tournament = tournamentNames.get(match.tournament_id)?.toLowerCase() ?? '';
      return home.includes(term) || away.includes(term) || tournament.includes(term) || match.pitch_location?.toLowerCase().includes(term);
    });
  }, [matches, statusFilter, tournamentFilter, sportFilter, dateFilter, search, teamNames, tournamentNames, sportByTeam]);

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setTournamentFilter('all');
    setSportFilter('all');
    setDateFilter('all');
  };

  const uniqueSports = useMemo(() => Array.from(new Set(teams.map((t) => t.primary_sport))), [teams]);

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-900" contentContainerClassName="items-center px-4 pb-24 pt-6">
      <View className="w-full max-w-5xl gap-4">
        <View>
          <Text className="text-xs font-black uppercase tracking-widest text-brand">{t('matchCenter.badge')}</Text>
          <Text className="mt-1 text-3xl font-black text-slate-900 dark:text-white">{t('matchCenter.title')}</Text>
        </View>

        <View className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
          <View className="flex-row flex-wrap gap-2">
            <View className="min-w-[12rem] flex-1">
              <Field label={t('matches.search')} value={search} onChangeText={setSearch} />
            </View>
            <View className="flex-1 min-w-[10rem]">
              <Text className="mb-1 text-xs font-bold text-slate-500 dark:text-slate-400">{t('matches.tournament')}</Text>
              <View className="flex-row flex-wrap gap-2">
                <Pressable onPress={() => setTournamentFilter('all')} className={`rounded-lg px-3 py-2 ${tournamentFilter === 'all' ? 'bg-brand' : 'bg-slate-100 dark:bg-slate-700'}`}>
                  <Text className={`text-xs font-black ${tournamentFilter === 'all' ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{t('matches.all')}</Text>
                </Pressable>
                {tournaments.map((tournament) => (
                  <Pressable key={tournament.id} onPress={() => setTournamentFilter(tournament.id)} className={`rounded-lg px-3 py-2 ${tournamentFilter === tournament.id ? 'bg-brand' : 'bg-slate-100 dark:bg-slate-700'}`}>
                    <Text className={`text-xs font-black ${tournamentFilter === tournament.id ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{tournament.name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <View className="flex-row flex-wrap items-center gap-2">
            {STATUS_FILTERS.map((status) => (
              <Pressable key={status} onPress={() => setStatusFilter(status)} className={`rounded-lg px-3 py-2 ${statusFilter === status ? 'bg-brand' : 'bg-slate-100 dark:bg-slate-700'}`}>
                <Text className={`text-xs font-black ${statusFilter === status ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                  {status === 'all' ? t('matches.all') : status === 'live' ? `🔴 ${t('matches.live')}` : t(`matches.${status}`)}
                </Text>
              </Pressable>
            ))}
          </View>

          <View className="flex-row flex-wrap items-center gap-2">
            <View className="flex-row flex-wrap gap-2">
              <Text className="self-center text-xs font-bold text-slate-500 dark:text-slate-400">{t('matches.sport')}:</Text>
              {uniqueSports.map((sport) => (
                <Pressable key={sport} onPress={() => setSportFilter(sportFilter === sport ? 'all' : sport)} className={`rounded-lg px-3 py-2 ${sportFilter === sport ? 'bg-brand' : 'bg-slate-100 dark:bg-slate-700'}`}>
                  <Text className={`text-xs font-black ${sportFilter === sport ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{t(`sports.${sport}`)}</Text>
                </Pressable>
              ))}
            </View>
            <View className="ml-auto flex-row gap-2">
              {DATE_FILTERS.map((item) => (
                <Pressable key={item} onPress={() => setDateFilter(item)} className={`rounded-lg px-3 py-2 ${dateFilter === item ? 'bg-brand' : 'bg-slate-100 dark:bg-slate-700'}`}>
                  <Text className={`text-xs font-black ${dateFilter === item ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{item === 'all' ? t('matches.all') : t(`matches.${item}`)}</Text>
                </Pressable>
              ))}
              <Button label={t('matches.reset')} variant="ghost" onPress={resetFilters} />
            </View>
          </View>
        </View>

        <View className="gap-2">
          {filtered.map((match) => (
            <Pressable
              key={match.id}
              onPress={() => router.push(`/matches/${match.id}` as never)}
              className="flex-row items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
            >
              <View className={`h-2.5 w-2.5 rounded-full ${match.status === 'live' ? 'bg-red-500' : match.status === 'finished' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-500'}`} />
              <View className="flex-1">
                <Text className="text-sm font-bold text-slate-900 dark:text-white">
                  {teamNames.get(match.home_team_id)} — {teamNames.get(match.away_team_id)}
                </Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400">
                  {tournamentNames.get(match.tournament_id)} · {match.match_date} · {match.match_time}
                  {match.pitch_location ? ` · ${match.pitch_location}` : ''}
                </Text>
              </View>
              <Text className="font-mono text-xl font-black text-slate-900 dark:text-white">
                {match.home_score ?? '–'} : {match.away_score ?? '–'}
              </Text>
              <Text className="text-[10px] font-black uppercase text-brand">{t(`matches.status.${match.status}`)}</Text>
            </Pressable>
          ))}
          {!filtered.length ? (
            <Text className="rounded-xl border border-dashed border-slate-300 py-6 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">{t('matches.empty')}</Text>
          ) : null}
        </View>
      </View>
      <Footer />
    </ScrollView>
  );
}
