import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';

import { EditProfileModal } from '@/components/edit-profile-modal';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { playerStats, userTeams } from '@/features/auth/local-db';
import { useAuth } from '@/providers/auth-provider';
import type { Team } from '@/types/database';
import { fullName, initialsFromName } from '@/types/database';

function TeamAvatar({ team, size = 40 }: { team: Team; size?: number }) {
  return (
    <View style={{ backgroundColor: team.color, width: size, height: size }} className="items-center justify-center overflow-hidden rounded-xl">
      {team.logo_url ? <Image source={{ uri: team.logo_url }} className="h-full w-full" resizeMode="cover" /> : <Text className="text-lg">🛡️</Text>}
    </View>
  );
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { profile, loading, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [stats, setStats] = useState({ matchesPlayed: 0, goals: 0, yellowCards: 0, redCards: 0 });
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    if (profile) {
      void playerStats(profile.id).then(setStats);
      void userTeams(profile.id).then(setTeams);
    }
  }, [profile]);

  if (loading) return <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900"><ActivityIndicator color="#10B981" /></View>;
  if (!profile) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-5 dark:bg-slate-900">
        <View className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <Text className="text-2xl font-black text-slate-900 dark:text-white">{t('profile.title')}</Text>
          <Text className="mt-2 text-slate-500 dark:text-slate-400">{t('auth.required')}</Text>
          <View className="mt-6 gap-3">
            <Button label={t('nav.signIn')} onPress={() => router.push('/sign-in')} />
            <Button label={t('nav.signUp')} variant="ghost" onPress={() => router.push('/sign-up')} />
          </View>
        </View>
      </View>
    );
  }

  const name = fullName(profile);
  const initials = initialsFromName(name);

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-900" contentContainerClassName="items-center px-4 pb-24 pt-6">
      <View className="w-full max-w-4xl gap-4">
        <View className="flex-row flex-wrap items-end justify-between gap-4">
          <View>
            <Text className="text-xs font-black uppercase tracking-widest text-brand">{t('common.appName')}</Text>
            <Text className="mt-1 text-3xl font-black text-slate-900 dark:text-white">{t('profile.title')}</Text>
          </View>
          <Button label={t('profile.edit')} onPress={() => setEditing(true)} />
        </View>

        <View className="overflow-hidden rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <View className="flex-row flex-wrap items-center gap-4">
            <View style={{ backgroundColor: profile.profileColor }} className="h-20 w-20 items-center justify-center overflow-hidden rounded-xl">
              {profile.avatarUrl ? <Image source={{ uri: profile.avatarUrl }} className="h-full w-full" resizeMode="cover" /> : <Text className="text-2xl font-black text-white">{initials}</Text>}
            </View>
            <View className="min-w-48 flex-1">
              <Text className="text-2xl font-black text-slate-900 dark:text-white">{name}</Text>
              <Text className="text-sm text-slate-500 dark:text-slate-400">{profile.email}</Text>
              <View className="mt-3 self-start rounded-full bg-emerald-500/10 px-3 py-1.5">
                <Text className="text-xs font-black text-emerald-600 dark:text-emerald-400">{t(`profile.${profile.role}`)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="grid grid-cols-2 gap-3 sm:grid-cols-4 items-stretch">
          {[
            { label: t('profile.favoriteSport'), value: t(`sports.${profile.favoriteSport}`) },
            { label: t('profile.memberSince'), value: new Date(profile.createdAt).toLocaleDateString() },
            { label: t('profile.matchesPlayed'), value: stats.matchesPlayed.toString() },
            { label: t('profile.goals'), value: stats.goals.toString() },
          ].map((item) => (
            <View key={item.label} className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{item.label}</Text>
              <Text className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{item.value}</Text>
            </View>
          ))}
        </View>

        <View className="grid grid-cols-2 gap-3 sm:grid-cols-2 items-stretch">
          <View className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('profile.yellowCards')}</Text>
            <Text className="mt-2 text-3xl font-black text-amber-500">{stats.yellowCards}</Text>
          </View>
          <View className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('profile.redCards')}</Text>
            <Text className="mt-2 text-3xl font-black text-red-500">{stats.redCards}</Text>
          </View>
        </View>

        <View className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <Text className="text-lg font-bold text-slate-900 dark:text-white">{t('profile.myTeams')}</Text>
          <View className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
            {teams.map((team) => (
              <Pressable key={team.id} onPress={() => router.push(`/teams/${team.id}` as never)} className="flex h-full flex-row items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                <TeamAvatar team={team} />
                <View className="flex-1">
                  <Text className="text-sm font-bold text-slate-900 dark:text-white">{team.name}</Text>
                  <Text className="text-[10px] text-slate-500 dark:text-slate-400">{t(`sports.${team.primary_sport}`)}</Text>
                </View>
                <Text className="font-black text-brand">→</Text>
              </Pressable>
            ))}
            {!teams.length ? <Text className="py-3 text-center text-slate-500 dark:text-slate-400">{t('profile.noTeams')}</Text> : null}
          </View>
        </View>
      </View>
      {editing ? <EditProfileModal profile={profile} onClose={() => setEditing(false)} onSave={updateProfile} /> : null}
      <Footer />
    </ScrollView>
  );
}
