import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';

import { TeamFormModal } from '@/components/team-form-modal';
import { Button } from '@/components/ui/button';
import { createTeam, deleteTeam, updateTeam } from '@/features/auth/local-db';
import { useTeams } from '@/features/auth/use-local-data';
import { useAuth } from '@/providers/auth-provider';
import type { Team } from '@/types/database';

export default function TeamsScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { data: teams } = useTeams();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const saveNew = async (values: Omit<Team, 'id' | 'created_by'>) => { if (profile) await createTeam(values, profile); };
  const saveEdit = async (values: Omit<Team, 'id' | 'created_by'>) => { if (profile && editing) await updateTeam(editing.id, values, profile); };
  const remove = (team: Team) => Alert.alert(t('teams.delete'), t('teams.deleteConfirm', { name: team.name }), [{ text: t('common.cancel'), style: 'cancel' }, { text: t('teams.delete'), style: 'destructive', onPress: () => { if (profile) void deleteTeam(team.id, profile); } }]);
  return <ScrollView className="flex-1 bg-canvas" contentContainerClassName="items-center px-5 pb-24 pt-10"><View className="w-full max-w-6xl gap-7"><View className="flex-row flex-wrap items-end justify-between gap-4"><View><Text className="text-xs font-black uppercase tracking-widest text-brand">{t('teams.badge')}</Text><Text className="mt-2 text-4xl font-black text-ink">{t('teams.title')}</Text><Text className="mt-2 text-muted">{t('teams.subtitle')}</Text></View>{profile ? <Button label={t('teams.create')} onPress={() => setCreating(true)} /> : <Button label={t('nav.signIn')} onPress={() => router.push('/sign-in')} />}</View><View className="flex-row flex-wrap gap-4">{teams.map((team) => { const canManage = profile?.role === 'admin' || profile?.id === team.created_by; return <View key={team.id} className="min-w-64 flex-1 rounded-2xl border border-slate-200 bg-white p-6"><View className="flex-row items-start justify-between"><View style={{ backgroundColor: team.color }} className="h-14 w-14 items-center justify-center overflow-hidden rounded-xl">{team.logo_url ? <Image source={{ uri: team.logo_url }} className="h-full w-full" resizeMode="cover" /> : <Text className="font-black text-white">{team.short_name}</Text>}</View><View className="rounded-full bg-slate-100 px-3 py-2"><Text className="text-xs font-black text-muted">{t(`sports.${team.primary_sport}`)}</Text></View></View><Text className="mt-5 text-2xl font-black text-ink">{team.name}</Text><Text className="mt-2 text-xs font-mono text-muted">{team.id}</Text>{canManage ? <View className="mt-5 flex-row gap-2"><Pressable onPress={() => setEditing(team)} className="min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-300"><Text className="font-bold text-ink">{t('common.edit')}</Text></Pressable><Pressable onPress={() => router.push(`/teams/${team.id}` as never)} className="min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-300"><Text className="font-bold text-ink">{t('teams.masterRoster')}</Text></Pressable><Pressable onPress={() => remove(team)} className="min-h-11 flex-1 items-center justify-center rounded-xl bg-red-50"><Text className="font-bold text-red-600">{t('teams.delete')}</Text></Pressable></View> : null}</View>; })}</View></View>{creating ? <TeamFormModal onClose={() => setCreating(false)} onSave={saveNew} /> : null}{editing ? <TeamFormModal team={editing} onClose={() => setEditing(null)} onSave={saveEdit} /> : null}</ScrollView>;
}
