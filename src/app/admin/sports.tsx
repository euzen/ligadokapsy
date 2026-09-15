import { Redirect } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AdminSectionNav } from '@/components/admin-section-nav';
import { ConfirmDeleteModal } from '@/components/confirm-delete-modal';
import { SportFormModal } from '@/components/sport-form-modal';
import { Button } from '@/components/ui/button';
import { createSport, deleteSport, updateSport } from '@/features/auth/local-db';
import { useSports } from '@/features/auth/use-local-data';
import { useAuth } from '@/providers/auth-provider';
import type { Sport } from '@/types/database';

export default function SportsAdminScreen() {
  const { t } = useTranslation(); const { profile, loading } = useAuth(); const { data: sports } = useSports(true); const [creating, setCreating] = useState(false); const [editing, setEditing] = useState<Sport | null>(null); const [deleting, setDeleting] = useState<Sport | null>(null); const [error, setError] = useState('');
  if (loading) return <View className="flex-1 bg-canvas" />; if (!profile) return <Redirect href="/sign-in" />; if (profile.role !== 'admin') return <Redirect href="/" />;
  const remove = async () => { if (!deleting) return; try { await deleteSport(deleting.id); setDeleting(null); } catch (reason) { setError(t(reason instanceof Error ? reason.message : 'request.failed')); setDeleting(null); } };
  return <View className="flex-1 md:flex-row"><AdminSectionNav active="sports" /><ScrollView className="flex-1 bg-canvas" contentContainerClassName="p-6"><View className="mx-auto w-full max-w-5xl"><View className="flex-row flex-wrap items-end justify-between gap-3"><View><Text className="text-4xl font-black text-ink">{t('sportsAdmin.title')}</Text><Text className="mt-2 text-muted">{t('sportsAdmin.subtitle')}</Text></View><Button label={t('sportsAdmin.create')} onPress={() => setCreating(true)} /></View>{error ? <Text className="mt-4 rounded-xl bg-red-50 p-4 font-bold text-red-600">{error}</Text> : null}<View className="mt-7 flex-row flex-wrap gap-4">{sports.map((sport) => <View key={sport.id} className="min-w-64 flex-1 rounded-2xl bg-white p-5"><View className="flex-row items-start justify-between"><Text className="text-xl font-black text-ink">{sport.name}</Text><Pressable onPress={() => void updateSport(sport.id, { active: !sport.active })} className={`rounded-full px-3 py-2 ${sport.active ? 'bg-emerald-100' : 'bg-slate-200'}`}><Text className={`text-xs font-black ${sport.active ? 'text-emerald-700' : 'text-muted'}`}>{t(sport.active ? 'sportsAdmin.active' : 'sportsAdmin.inactive')}</Text></Pressable></View><Text className="mt-2 font-mono text-sm text-muted">{sport.code} · {sport.scoring_type}</Text><Text className="mt-3 text-xs text-muted">{sport.periods_config}</Text><View className="mt-5 flex-row gap-2"><Button label={t('common.edit')} variant="ghost" onPress={() => setEditing(sport)} /><Pressable onPress={() => setDeleting(sport)} className="rounded-xl bg-red-600 px-4 py-3"><Text className="font-black text-white">{t('delete.button')}</Text></Pressable></View></View>)}</View></View></ScrollView>{creating ? <SportFormModal onClose={() => setCreating(false)} onSave={async (values) => { await createSport(values); }} /> : null}{editing ? <SportFormModal sport={editing} onClose={() => setEditing(null)} onSave={async (values) => { await updateSport(editing.id, values); }} /> : null}{deleting ? <ConfirmDeleteModal name={deleting.name} onCancel={() => setDeleting(null)} onConfirm={remove} /> : null}</View>;
}
