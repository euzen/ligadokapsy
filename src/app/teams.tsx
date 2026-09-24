import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';

import { Footer } from '@/components/footer';
import { MobileFAB } from '@/components/mobile-fab';
import { TeamFormModal } from '@/components/team-form-modal';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast-provider';
import { favoriteSports } from '@/features/auth/constants';
import { createTeam, deleteTeam, updateTeam } from '@/features/auth/local-db';
import { useTeams } from '@/features/auth/use-local-data';
import { useAuth } from '@/providers/auth-provider';
import type { Team } from '@/types/database';

const VISIBILITY_FILTERS = ['all', 'public', 'private'] as const;
type ViewMode = 'grid' | 'list';
type VisibilityFilter = (typeof VISIBILITY_FILTERS)[number];

function TeamAvatar({ team, size = 48 }: { team: Team; size?: number }) {
  return (
    <View
      style={{ backgroundColor: team.color, width: size, height: size }}
      className="items-center justify-center overflow-hidden rounded-xl"
    >
      {team.logo_url ? (
        <Image source={{ uri: team.logo_url }} className="h-full w-full" resizeMode="cover" />
      ) : (
        <Text className="text-xl">🛡️</Text>
      )}
    </View>
  );
}

function ActionFooter({ team, onEdit }: { team: Team; onEdit: () => void }) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const remove = (target: Team) =>
    Alert.alert(t('teams.delete'), t('teams.deleteConfirm', { name: target.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('teams.delete'), style: 'destructive', onPress: () => { if (profile) void deleteTeam(target.id, profile); } },
    ]);

  return (
    <View className="mt-auto flex-row gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
      <View className="flex-1"><Button label={t('teams.masterRoster')} variant="ghost" size="sm" onPress={() => router.push(`/teams/${team.id}` as never)} /></View>
      <View className="flex-1"><Button label={t('common.edit')} variant="ghost" size="sm" onPress={onEdit} /></View>
      <View className="flex-1"><Button label={t('teams.delete')} variant="danger" size="sm" onPress={() => remove(team)} /></View>
    </View>
  );
}

export default function TeamsScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const toast = useToast();
  const { data: teams } = useTeams();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [view, setView] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [visibility, setVisibility] = useState<VisibilityFilter>('all');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return teams.filter((team) => {
      if (term && !team.name.toLowerCase().includes(term)) return false;
      if (sportFilter !== 'all' && team.primary_sport !== sportFilter) return false;
      if (visibility === 'public' && team.is_private) return false;
      if (visibility === 'private' && !team.is_private) return false;
      return true;
    });
  }, [teams, search, sportFilter, visibility]);

  const saveNew = async (values: Omit<Team, 'id' | 'created_by'>) => {
    if (!profile) return;
    try {
      await createTeam(values, profile);
      toast.success(t('toast.teamSaved'));
    } catch (reason) {
      toast.error(t('toast.saveFailed'), reason instanceof Error ? reason.message : undefined);
      throw reason;
    }
  };
  const saveEdit = async (values: Omit<Team, 'id' | 'created_by'>) => {
    if (!profile || !editing) return;
    try {
      await updateTeam(editing.id, values, profile);
      toast.success(t('toast.teamSaved'));
    } catch (reason) {
      toast.error(t('toast.saveFailed'), reason instanceof Error ? reason.message : undefined);
      throw reason;
    }
  };

  const FilterBar = (
    <View className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
      <View className="flex-row flex-wrap gap-2">
        <View className="min-w-[12rem] flex-1">
          <Field label={t('teams.search')} value={search} onChangeText={setSearch} />
        </View>
        <View className="flex-1 min-w-[8rem]">
          <Text className="mb-1 text-xs font-bold text-slate-500 dark:text-slate-400">{t('teams.sport')}</Text>
          <View className="flex-row flex-wrap gap-2">
            <Pressable onPress={() => setSportFilter('all')} className={`rounded-lg px-3 py-2 ${sportFilter === 'all' ? 'bg-brand' : 'bg-slate-100 dark:bg-slate-700'}`}>
              <Text className={`text-xs font-black ${sportFilter === 'all' ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{t('teams.all')}</Text>
            </Pressable>
            {favoriteSports.map((sport) => (
              <Button key={sport} label={t(`sports.${sport}`)} size="sm" variant={sportFilter === sport ? 'primary' : 'ghost'} onPress={() => setSportFilter(sport)} />
            ))}
          </View>
        </View>
      </View>
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <View className="flex-row flex-wrap gap-2">
          {VISIBILITY_FILTERS.map((item) => (
            <Button key={item} label={t(`teams.${item === 'public' ? 'public' : item === 'private' ? 'privateOnly' : 'all'}`)} size="sm" variant={visibility === item ? 'primary' : 'ghost'} onPress={() => setVisibility(item)} />
          ))}
        </View>
        <View className="flex-row rounded-lg bg-slate-100 p-1 dark:bg-slate-700">
          {(['grid', 'list'] as ViewMode[]).map((mode) => (
            <Pressable key={mode} onPress={() => setView(mode)} className={`rounded-md px-3 py-1.5 ${view === mode ? 'bg-white shadow-sm dark:bg-slate-600' : ''}`}>
              <Text className={`text-xs font-black ${view === mode ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>{t(`teams.view.${mode}`)}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-900" contentContainerClassName="items-center px-4 pb-24 pt-6">
      <View className="w-full max-w-6xl gap-4">
        <View className="flex-row flex-wrap items-end justify-between gap-4">
          <View>
            <Text className="text-xs font-black uppercase tracking-widest text-brand">{t('teams.badge')}</Text>
            <Text className="mt-1 text-3xl font-black text-slate-900 dark:text-white">{t('teams.title')}</Text>
          </View>
          {profile ? (
            <View className="hidden md:flex">
              <Button label={t('teams.create')} onPress={() => setCreating(true)} />
            </View>
          ) : (
            <Button label={t('nav.signIn')} onPress={() => router.push('/sign-in')} />
          )}
        </View>

        {FilterBar}

        {view === 'grid' ? (
          <View className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-stretch">
            {filtered.map((team) => {
              const canManage = profile?.role === 'admin' || profile?.id === team.created_by;
              return (
                <View key={team.id} className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                  <View>
                    <View className="flex-row items-start justify-between">
                      <TeamAvatar team={team} />
                      <View className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-700">
                        <Text className="text-[10px] font-black text-slate-600 dark:text-slate-300">{t(`sports.${team.primary_sport}`)}</Text>
                      </View>
                    </View>
                    {team.is_private ? (
                      <View className="mt-2 self-start rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-700">
                        <Text className="text-[10px] font-black text-slate-600 dark:text-slate-300">🔒 {t('teams.privateBadge')}</Text>
                      </View>
                    ) : null}
                    <Text className="mt-3 text-lg font-bold text-slate-900 dark:text-white">{team.name}</Text>
                  </View>
                  {canManage ? <ActionFooter team={team} onEdit={() => setEditing(team)} /> : null}
                </View>
              );
            })}
          </View>
        ) : (
          <View className="gap-2">
            {filtered.map((team) => {
              const canManage = profile?.role === 'admin' || profile?.id === team.created_by;
              return (
                <View key={team.id} className="flex-row flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                  <TeamAvatar team={team} size={40} />
                  <View className="flex-1">
                    <Text className="font-bold text-slate-900 dark:text-white">{team.name}</Text>
                    <Text className="text-xs text-slate-500 dark:text-slate-400">{t(`sports.${team.primary_sport}`)} {team.is_private ? `· 🔒 ${t('teams.privateBadge')}` : ''}</Text>
                  </View>
                  {canManage ? (
                    <View className="flex-row gap-2">
                      <Button label={t('teams.masterRoster')} variant="ghost" size="sm" onPress={() => router.push(`/teams/${team.id}` as never)} />
                      <Button label={t('common.edit')} variant="ghost" size="sm" onPress={() => setEditing(team)} />
                      <Button label={t('teams.delete')} variant="danger" size="sm" onPress={() => {
                        Alert.alert(t('teams.delete'), t('teams.deleteConfirm', { name: team.name }), [
                          { text: t('common.cancel'), style: 'cancel' },
                          { text: t('teams.delete'), style: 'destructive', onPress: () => { if (profile) void deleteTeam(team.id, profile); } },
                        ]);
                      }} />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}

        {!filtered.length ? (
          <Text className="rounded-xl border border-dashed border-slate-300 py-6 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">{t('teams.noTeams')}</Text>
        ) : null}
      </View>

      {creating ? <TeamFormModal onClose={() => setCreating(false)} onSave={saveNew} /> : null}
      {editing ? <TeamFormModal team={editing} onClose={() => setEditing(null)} onSave={saveEdit} /> : null}
      {profile ? <MobileFAB label={t('teams.create')} onPress={() => setCreating(true)} /> : null}
      <Footer />
    </ScrollView>
  );
}
