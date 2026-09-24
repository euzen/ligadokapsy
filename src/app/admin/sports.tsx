import { Redirect } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';

import { AdminSectionNav } from '@/components/admin-section-nav';
import { ConfirmDeleteModal } from '@/components/confirm-delete-modal';
import { SportFormModal } from '@/components/sport-form-modal';
import { Button } from '@/components/ui/button';
import { createSport, deleteSport, updateSport } from '@/features/auth/local-db';
import { useSports } from '@/features/auth/use-local-data';
import { useAuth } from '@/providers/auth-provider';
import type { Sport } from '@/types/database';

export default function SportsAdminScreen() {
  const { t } = useTranslation();
  const { profile, loading } = useAuth();
  const { data: sports } = useSports(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Sport | null>(null);
  const [deleting, setDeleting] = useState<Sport | null>(null);
  const [error, setError] = useState('');

  if (loading) return <View className="flex-1 bg-slate-50 dark:bg-slate-900" />;
  if (!profile) return <Redirect href="/sign-in" />;
  if (profile.role !== 'admin') return <Redirect href="/" />;

  const remove = async () => {
    if (!deleting) return;
    try {
      await deleteSport(deleting.id);
      setDeleting(null);
    } catch (reason) {
      setError(t(reason instanceof Error ? reason.message : 'request.failed'));
      setDeleting(null);
    }
  };

  return (
    <View className="flex-1 md:flex-row">
      <AdminSectionNav active="sports" />
      <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-900" contentContainerClassName="p-4">
        <View className="mx-auto w-full max-w-5xl">
          <View className="flex-row flex-wrap items-end justify-between gap-3">
            <View>
              <Text className="text-3xl font-black text-slate-900 dark:text-white">{t('sportsAdmin.title')}</Text>
              <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('sportsAdmin.subtitle')}</Text>
            </View>
            <Button label={t('sportsAdmin.create')} onPress={() => setCreating(true)} />
          </View>
          {error ? <Text className="mt-3 rounded-xl bg-red-50 p-3 font-bold text-red-600 dark:bg-red-900/50 dark:text-red-200">{error}</Text> : null}
          <View className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-stretch">
            {sports.map((sport) => (
              <View key={sport.id} className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <View>
                  <View className="flex-row items-start justify-between">
                    <Text className="text-lg font-bold text-slate-900 dark:text-white">{sport.name}</Text>
                    <Button
                      label={t(sport.active ? 'sportsAdmin.active' : 'sportsAdmin.inactive')}
                      size="sm"
                      variant={sport.active ? 'secondary' : 'ghost'}
                      onPress={() => void updateSport(sport.id, { active: !sport.active })}
                      className="rounded-full"
                    />
                  </View>
                  <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t(`sports.${sport.code}`)} · {sport.scoring_type}</Text>
                </View>
                <View className="mt-3 flex-row gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
                  <Button label={t('common.edit')} variant="ghost" onPress={() => setEditing(sport)} />
                  <Button label={t('delete.button')} variant="danger" size="sm" onPress={() => setDeleting(sport)} />
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      {creating ? <SportFormModal onClose={() => setCreating(false)} onSave={async (values) => { await createSport(values); }} /> : null}
      {editing ? <SportFormModal sport={editing} onClose={() => setEditing(null)} onSave={async (values) => { await updateSport(editing.id, values); }} /> : null}
      {deleting ? <ConfirmDeleteModal name={deleting.name} onCancel={() => setDeleting(null)} onConfirm={remove} /> : null}
    </View>
  );
}
