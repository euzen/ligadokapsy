import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Footer } from '@/components/footer';
import { MobileFAB } from '@/components/mobile-fab';
import { TournamentFormModal } from '@/components/tournament-form-modal';
import { TournamentLogo } from '@/components/tournament-logo';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { favoriteSports } from '@/features/auth/constants';
import { createTournament } from '@/features/auth/local-db';
import { useTournaments } from '@/features/auth/use-local-data';
import { useAuth } from '@/providers/auth-provider';
import type { Tournament } from '@/types/database';

const VISIBILITY_FILTERS = ['all', 'public', 'private'] as const;
const STATUS_FILTERS: (Tournament['status'] | 'all')[] = ['all', 'draft', 'published', 'completed'];
type ViewMode = 'grid' | 'list';
type VisibilityFilter = (typeof VISIBILITY_FILTERS)[number];

const badgeClasses: Record<Tournament['status'], string> = {
  draft: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
  published: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
  completed: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

export default function TournamentsScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { data: tournaments } = useTournaments();
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [visibility, setVisibility] = useState<VisibilityFilter>('all');
  const [status, setStatus] = useState<Tournament['status'] | 'all'>('all');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tournaments.filter((tournament) => {
      if (term && !tournament.name.toLowerCase().includes(term) && !tournament.location.toLowerCase().includes(term)) return false;
      if (sportFilter !== 'all' && tournament.sport !== sportFilter) return false;
      if (visibility === 'public' && tournament.is_private) return false;
      if (visibility === 'private' && !tournament.is_private) return false;
      if (status !== 'all' && tournament.status !== status) return false;
      return true;
    });
  }, [tournaments, search, sportFilter, visibility, status]);

  const save = async (values: Omit<Tournament, 'id' | 'created_by' | 'status' | 'rosters_locked'>) => {
    if (profile) await createTournament(values, profile);
  };

  const FilterBar = (
    <View className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
      <View className="flex-row flex-wrap gap-2">
        <View className="min-w-[12rem] flex-1">
          <Field label={t('tournaments.search')} value={search} onChangeText={setSearch} />
        </View>
        <View className="flex-1 min-w-[8rem]">
          <Text className="mb-1 text-xs font-bold text-slate-500 dark:text-slate-400">{t('tournaments.sport')}</Text>
          <View className="flex-row flex-wrap gap-2">
            <Pressable onPress={() => setSportFilter('all')} className={`rounded-lg px-3 py-2 ${sportFilter === 'all' ? 'bg-brand' : 'bg-slate-100 dark:bg-slate-700'}`}>
              <Text className={`text-xs font-black ${sportFilter === 'all' ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{t('tournaments.all')}</Text>
            </Pressable>
            {favoriteSports.map((sport) => (
              <Pressable key={sport} onPress={() => setSportFilter(sport)} className={`rounded-lg px-3 py-2 ${sportFilter === sport ? 'bg-brand' : 'bg-slate-100 dark:bg-slate-700'}`}>
                <Text className={`text-xs font-black ${sportFilter === sport ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{t(`sports.${sport}`)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <View className="flex-row flex-wrap gap-2">
          {VISIBILITY_FILTERS.map((item) => (
            <Pressable key={item} onPress={() => setVisibility(item)} className={`rounded-lg px-3 py-2 ${visibility === item ? 'bg-brand' : 'bg-slate-100 dark:bg-slate-700'}`}>
              <Text className={`text-xs font-black ${visibility === item ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{t(`tournaments.${item === 'public' ? 'public' : item === 'private' ? 'privateOnly' : 'all'}`)}</Text>
            </Pressable>
          ))}
          {STATUS_FILTERS.map((item) => (
            item !== 'all' && (
              <Pressable key={item} onPress={() => setStatus(status === item ? 'all' : item)} className={`rounded-lg px-3 py-2 ${status === item ? 'bg-brand' : 'bg-slate-100 dark:bg-slate-700'}`}>
                <Text className={`text-xs font-black ${status === item ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{t(`tournaments.status.${item}`)}</Text>
              </Pressable>
            )
          ))}
        </View>
        <View className="flex-row rounded-lg bg-slate-100 p-1 dark:bg-slate-700">
          {(['grid', 'list'] as ViewMode[]).map((mode) => (
            <Pressable key={mode} onPress={() => setView(mode)} className={`rounded-md px-3 py-1.5 ${view === mode ? 'bg-white shadow-sm dark:bg-slate-600' : ''}`}>
              <Text className={`text-xs font-black ${view === mode ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>{t(`tournaments.view.${mode}`)}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );

  const CardBody = ({ tournament }: { tournament: Tournament }) => (
    <View className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <View>
        <View className="flex-row items-start justify-between gap-3">
          <View className={`rounded-full px-2 py-0.5 ${badgeClasses[tournament.status].split(' ')[0]}`}>
            <Text className={`text-[10px] font-black uppercase ${badgeClasses[tournament.status].split(' ')[1]}`}>{t(`tournaments.status.${tournament.status}`)}</Text>
          </View>
          <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">{t(`sports.${tournament.sport}`)}</Text>
        </View>
        <View className="mt-3">
          <TournamentLogo value={tournament.logo_url} name={tournament.name} size="small" />
        </View>
        <Text className="mt-3 text-lg font-bold text-slate-900 dark:text-white">{tournament.name}</Text>
        {tournament.is_private ? (
          <View className="mt-1 self-start rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-700">
            <Text className="text-[10px] font-black text-slate-600 dark:text-slate-300">🔒 {t('tournaments.privateBadge')}</Text>
          </View>
        ) : null}
        <Text className="mt-2 text-xs text-slate-500 dark:text-slate-400">{tournament.location} · {new Date(tournament.start_date).toLocaleDateString()}</Text>
      </View>
      <Text className="mt-3 pt-3 text-xs font-black text-brand border-t border-slate-100 dark:border-slate-700">{t('tournaments.open')} →</Text>
    </View>
  );

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-900" contentContainerClassName="items-center px-4 pb-24 pt-6">
      <View className="w-full max-w-6xl gap-4">
        <View className="flex-row flex-wrap items-end justify-between gap-4">
          <View>
            <Text className="text-xs font-black uppercase tracking-widest text-brand">{t('tournaments.badge')}</Text>
            <Text className="mt-1 text-3xl font-black text-slate-900 dark:text-white">{t('tournaments.title')}</Text>
          </View>
          {profile ? (
            <View className="hidden md:flex">
              <Button label={t('tournaments.create')} onPress={() => setCreating(true)} />
            </View>
          ) : (
            <Button label={t('nav.signIn')} onPress={() => router.push('/sign-in')} />
          )}
        </View>

        {FilterBar}

        {view === 'grid' ? (
          <View className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-stretch">
            {filtered.map((tournament) => (
              <Pressable key={tournament.id} onPress={() => router.push(`/tournaments/${tournament.id}` as never)}>
                <CardBody tournament={tournament} />
              </Pressable>
            ))}
          </View>
        ) : (
          <View className="gap-2">
            {filtered.map((tournament) => (
              <Pressable key={tournament.id} onPress={() => router.push(`/tournaments/${tournament.id}` as never)} className="flex-row flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                <TournamentLogo value={tournament.logo_url} name={tournament.name} size="small" />
                <View className="flex-1">
                  <Text className="font-bold text-slate-900 dark:text-white">{tournament.name}</Text>
                  <Text className="text-xs text-slate-500 dark:text-slate-400">{t(`sports.${tournament.sport}`)} · {tournament.location} · {new Date(tournament.start_date).toLocaleDateString()}</Text>
                </View>
                <View className={`rounded-full px-2 py-0.5 ${badgeClasses[tournament.status].split(' ')[0]}`}>
                  <Text className={`text-[10px] font-black uppercase ${badgeClasses[tournament.status].split(' ')[1]}`}>{t(`tournaments.status.${tournament.status}`)}</Text>
                </View>
                <Text className="text-xs font-black text-brand">→</Text>
              </Pressable>
            ))}
          </View>
        )}

        {!filtered.length ? (
          <Text className="rounded-xl border border-dashed border-slate-300 py-6 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">{t('tournaments.noTeams')}</Text>
        ) : null}
      </View>
      {creating ? <TournamentFormModal onClose={() => setCreating(false)} onSave={save} /> : null}
      {profile ? <MobileFAB label={t('tournaments.create')} onPress={() => setCreating(true)} /> : null}
      <Footer />
    </ScrollView>
  );
}
