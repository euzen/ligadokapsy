import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Footer } from '@/components/footer';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { getPage, listPages } from '@/features/auth/local-db';
import type { Page } from '@/types/database';
import { formatDate } from '@/utils/date';

export default function DocsPageScreen() {
  const { t } = useTranslation();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [page, setPage] = useState<Page | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [current, all] = await Promise.all([getPage(slug), listPages()]);
      setPage(current);
      setPages(all);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <View className="flex-1 bg-slate-50 dark:bg-slate-900" />;
  if (!page) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
        <Text className="text-2xl font-black text-slate-900 dark:text-white">{t('docs.notFound')}</Text>
        <Pressable onPress={() => router.push('/docs' as never)} className="mt-4 rounded-xl bg-brand px-4 py-3">
          <Text className="font-black text-white">{t('docs.back')}</Text>
        </Pressable>
      </View>
    );
  }

  const grouped = pages.reduce<Record<string, Page[]>>((acc, item) => {
    if (!item.is_published) return acc;
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-900" contentContainerClassName="items-center px-4 pb-24 pt-6">
      <View className="w-full max-w-5xl gap-6 md:flex-row">
        <View className="md:w-64">
          <Text className="mb-3 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('docs.navigation')}</Text>
          {Object.entries(grouped).map(([category, items]) => (
            <View key={category} className="mb-4">
              <Text className="mb-1 text-sm font-black text-slate-900 dark:text-white">{t(`pagesAdmin.categories.${category as 'legal' | 'faq' | 'guide'}`)}</Text>
              {items.map((item) => (
                <Pressable key={item.id} onPress={() => router.push(`/docs/${item.slug}` as never)} className={`rounded-lg px-3 py-2 ${item.slug === slug ? 'bg-brand' : ''}`}>
                  <Text className={`text-sm font-bold ${item.slug === slug ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{item.title}</Text>
                </Pressable>
              ))}
            </View>
          ))}
        </View>
        <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 md:p-8">
          <Text className="text-3xl font-black text-slate-900 dark:text-white">{page.title}</Text>
          <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('docs.updated')}: {formatDate(page.updated_at)}</Text>
          <View className="mt-5">
            <MarkdownRenderer source={page.content} />
          </View>
        </View>
      </View>
      <Footer />
    </ScrollView>
  );
}
