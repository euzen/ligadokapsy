import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Footer } from '@/components/footer';
import { usePages } from '@/features/auth/use-local-data';

export default function DocsIndexScreen() {
  const { t } = useTranslation();
  const { data: pages } = usePages();

  const grouped = pages.reduce<Record<string, typeof pages>>((acc, page) => {
    (acc[page.category] ??= []).push(page);
    return acc;
  }, {});

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-900" contentContainerClassName="items-center px-4 pb-24 pt-6">
      <View className="w-full max-w-4xl">
        <Text className="text-3xl font-black text-slate-900 dark:text-white">{t('docs.title')}</Text>
        <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('docs.subtitle')}</Text>
        <View className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 items-stretch">
          {Object.entries(grouped).map(([category, items]) => (
            <View key={category} className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <Text className="text-lg font-black text-slate-900 dark:text-white">{t(`pagesAdmin.categories.${category as 'legal' | 'faq' | 'guide'}`)}</Text>
              <View className="mt-3 flex-1 gap-2">
                {items.map((page) => (
                  <Pressable key={page.id} onPress={() => router.push(`/docs/${page.slug}` as never)} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-700">
                    <Text className="font-bold text-slate-900 dark:text-white">{page.title}</Text>
                    <Text className="text-xs text-slate-500 dark:text-slate-400">/{page.slug}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>
      </View>
      <Footer />
    </ScrollView>
  );
}
