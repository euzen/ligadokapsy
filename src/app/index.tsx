import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { useMatches, useTeams, useTournaments } from '@/features/auth/use-local-data';
import { useAuth } from '@/providers/auth-provider';

const featureOrder = ['scorekeeper', 'rosters', 'standings', 'passport', 'generator'] as const;

function StatItem({ value, label, loading }: { value: number; label: string; loading: boolean }) {
  return (
    <View className="min-w-40 flex-1 rounded-2xl border border-slate-700 bg-slate-800/60 p-5">
      <Text className="text-center text-4xl font-black text-emerald-400">{loading ? '–' : value}</Text>
      <Text className="mt-2 text-center text-xs font-black uppercase tracking-wider text-slate-300">{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { data: tournaments, loading: loadingTournaments } = useTournaments();
  const { data: teams, loading: loadingTeams } = useTeams();
  const { data: matches, loading: loadingMatches } = useMatches();

  const loading = loadingTournaments || loadingTeams || loadingMatches;

  const stats = useMemo(() => {
    const activeCompetitions = tournaments.filter((t) => t.status !== 'draft').length;
    const playedMatches = matches.filter((m) => m.status === 'finished' || m.status === 'live').length;
    const totalGoals = matches.reduce((sum, m) => sum + (m.home_score ?? 0) + (m.away_score ?? 0), 0);
    return {
      activeCompetitions,
      playedMatches,
      registeredTeams: teams.length,
      totalGoals,
    };
  }, [tournaments, matches, teams]);

  const previewTournaments = useMemo(() => tournaments.filter((t) => t.status !== 'draft').slice(0, 6), [tournaments]);

  return (
    <ScrollView className="flex-1 bg-slate-900" contentContainerClassName="items-center pb-24">
      <View className="w-full max-w-6xl px-5 py-10 md:py-20">
        <View className="overflow-hidden rounded-3xl bg-ink px-7 py-16 md:px-14 md:py-24">
          <View className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-emerald-500 opacity-10" />
          <View className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-brand opacity-10" />
          <View className="relative max-w-3xl">
            <View className="self-start rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2">
              <Text className="text-xs font-black uppercase tracking-widest text-emerald-400">{t('home.badge')}</Text>
            </View>
            <Text className="mt-7 text-5xl font-black text-white md:text-7xl">{t('home.heroTitle')}</Text>
            <Text className="mt-3 text-3xl font-black text-emerald-400 md:text-5xl">{t('home.tagline')}</Text>
            <Text className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">{t('home.heroSubtitle')}</Text>
            <View className="mt-9 flex-row flex-wrap gap-3">
              <Pressable onPress={() => router.push(profile ? '/admin/tournaments' : '/sign-up')} className="min-h-14 items-center justify-center rounded-xl bg-brand px-7">
                <Text className="font-black text-white">{t('home.createCompetition')}</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/tournaments')} className="min-h-14 items-center justify-center rounded-xl border border-slate-600 px-7">
                <Text className="font-bold text-white">{t('home.viewMatches')}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View className="mt-8 flex-row flex-wrap gap-4">
          <StatItem value={stats.activeCompetitions} label={t('home.stats.activeCompetitions')} loading={loading} />
          <StatItem value={stats.playedMatches} label={t('home.stats.playedMatches')} loading={loading} />
          <StatItem value={stats.registeredTeams} label={t('home.stats.registeredTeams')} loading={loading} />
          <StatItem value={stats.totalGoals} label={t('home.stats.totalGoals')} loading={loading} />
        </View>

        <View className="mt-16">
          <Text className="text-3xl font-black text-white">{t('home.competitionsTitle')}</Text>
          <Text className="mt-2 text-slate-400">{t('home.competitionsSubtitle')}</Text>
          {loading ? (
            <View className="mt-8 items-center">
              <ActivityIndicator color="#10B981" />
            </View>
          ) : (
            <View className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
              {previewTournaments.map((tournament) => (
                <Pressable
                  key={tournament.id}
                  onPress={() => router.push(`/tournaments/${tournament.id}` as never)}
                  className="flex h-full flex-col justify-between rounded-2xl border border-slate-700 bg-slate-800 p-5 active:bg-slate-700"
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <View className="flex-row flex-wrap items-center gap-2">
                        <Text className="text-xl font-black text-white">{tournament.name}</Text>
                        {tournament.is_private ? <Text className="rounded-full bg-slate-700 px-2 py-1 text-xs font-black text-slate-300">🔒 {t('tournaments.privateBadge')}</Text> : null}
                      </View>
                      <Text className="mt-1 text-sm text-slate-400">
                        {t(`sports.${tournament.sport}`)} · {tournament.location} · {new Date(tournament.start_date).toLocaleDateString()}
                      </Text>
                    </View>
                    <View className={`rounded-full px-3 py-1 ${tournament.status === 'published' ? 'bg-emerald-500/20' : 'bg-slate-700'}`}>
                      <Text className={`text-xs font-black uppercase ${tournament.status === 'published' ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {t(`tournaments.status.${tournament.status}`)}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
              {!previewTournaments.length && (
                <Text className="col-span-full rounded-2xl border border-dashed border-slate-700 bg-slate-800 py-8 text-center text-slate-400">
                  {t('home.noCompetitions')}
                </Text>
              )}
            </View>
          )}
        </View>

        <View className="mt-16">
          <Text className="text-3xl font-black text-white">{t('common.appName')}</Text>
          <Text className="mt-2 text-slate-400">{t('home.description')}</Text>
          <View className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
            {featureOrder.map((key, index) => (
              <View key={key} className="flex h-full flex-col justify-between rounded-2xl border border-slate-700 bg-slate-800 p-6">
                <View>
                  <Text className="font-mono text-sm font-black text-brand">0{index + 1}</Text>
                  <Text className="mt-4 text-xl font-black text-white">{t(`home.features.${key}`)}</Text>
                  <Text className="mt-2 text-sm leading-6 text-slate-400">{t(`home.features.${key}Desc`)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View className="mt-16 rounded-3xl bg-ink px-7 py-12 md:px-14 md:py-16">
          <Text className="text-3xl font-black text-white">{t('home.ctaTitle')}</Text>
          <Text className="mt-2 max-w-2xl text-slate-300">{t('home.ctaSubtitle')}</Text>
          <Pressable onPress={() => router.push(profile ? '/admin/tournaments' : '/sign-up')} className="mt-8 min-h-14 items-center justify-center self-start rounded-xl bg-brand px-7">
            <Text className="font-black text-white">{t('home.ctaButton')}</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
