import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AdminSectionNav } from '@/components/admin-section-nav';
import { ConfirmDeleteModal } from '@/components/confirm-delete-modal';
import { PageFormModal } from '@/components/page-form-modal';
import { Button } from '@/components/ui/button';
import { createPage, deletePage, updatePage } from '@/features/auth/local-db';
import { usePages } from '@/features/auth/use-local-data';
import { useAuth } from '@/providers/auth-provider';
import type { Page } from '@/types/database';

export default function PagesAdminScreen() {
  const { t } = useTranslation();
  const { profile, loading } = useAuth();
  const { data: pages } = usePages();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Page | null>(null);
  const [deleting, setDeleting] = useState<Page | null>(null);
  const [error, setError] = useState('');

  if (loading) return <View className="flex-1 bg-slate-50 dark:bg-slate-900" />;
  if (!profile) return <Redirect href="/sign-in" />;
  if (profile.role !== 'admin') return <Redirect href="/" />;

  const remove = async () => {
    if (!deleting) return;
    try { await deletePage(deleting.id, profile); setDeleting(null); }
    catch (reason) { setError(t(reason instanceof Error ? reason.message : 'request.failed')); setDeleting(null); }
  };

  return (
    <View className="flex-1 md:flex-row">
      <AdminSectionNav active="pages" />
      <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-900" contentContainerClassName="p-4">
        <View className="mx-auto w-full max-w-5xl">
          <View className="flex-row flex-wrap items-end justify-between gap-3">
            <View>
              <Text className="text-3xl font-black text-slate-900 dark:text-white">{t('pagesAdmin.title')}</Text>
              <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('pagesAdmin.subtitle')}</Text>
            </View>
            <Button label={t('pagesAdmin.create')} onPress={() => setCreating(true)} />
          </View>
          {error ? <Text className="mt-3 rounded-xl bg-red-50 p-3 font-bold text-red-600 dark:bg-red-900/50 dark:text-red-200">{error}</Text> : null}
          <View className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-stretch">
            {pages.map((page) => (
              <View key={page.id} className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <View>
                  <View className="flex-row items-start justify-between">
                    <Text className="text-lg font-bold text-slate-900 dark:text-white" numberOfLines={1}>{page.title}</Text>
                    <View className={`rounded-full px-2 py-0.5 ${page.is_published ? 'bg-emerald-500/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                      <Text className={`text-[10px] font-black ${page.is_published ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-300'}`}>
                        {page.is_published ? t('pagesAdmin.published') : t('pagesAdmin.draft')}
                      </Text>
                    </View>
                  </View>
                  <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">/{page.slug} · {t(`pagesAdmin.categories.${page.category}`)}</Text>
                </View>
                <View className="mt-3 flex-row gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
                  <Button label={t('common.edit')} variant="ghost" onPress={() => setEditing(page)} />
                  <Button label={t('common.view')} variant="ghost" onPress={() => router.push(`/docs/${page.slug}` as never)} />
                  <Pressable onPress={() => setDeleting(page)} className="rounded-lg bg-red-600 px-3 py-2">
                    <Text className="text-xs font-black text-white">{t('delete.button')}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      {creating ? <PageFormModal onClose={() => setCreating(false)} onSave={async (values) => { await createPage(values, profile); }} /> : null}
      {editing ? <PageFormModal page={editing} onClose={() => setEditing(null)} onSave={async (values) => { await updatePage(editing.id, values, profile); }} /> : null}
      {deleting ? <ConfirmDeleteModal name={deleting.title} onCancel={() => setDeleting(null)} onConfirm={remove} /> : null}
    </View>
  );
}
