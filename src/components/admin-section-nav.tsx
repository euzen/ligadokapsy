import { router, usePathname } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

const items = [
  { key: 'overview', href: '/admin', mark: 'O' },
  { key: 'users', href: '/admin/users', mark: 'U' },
  { key: 'tournaments', href: '/admin/tournaments', mark: 'T' },
  { key: 'teams', href: '/admin/teams', mark: 'T' },
  { key: 'sports', href: '/admin/sports', mark: 'S' },
  { key: 'matches', href: '/admin/matches', mark: 'M' },
  { key: 'pages', href: '/admin/pages', mark: 'P' },
] as const;

export function AdminSectionNav({ active }: { active: 'sports' | 'matches' | 'pages' }) {
  const { t } = useTranslation(); const pathname = usePathname(); const [collapsed, setCollapsed] = useState(false);
  const selected = (key: string) => key === active || (key === 'sports' && pathname === '/admin/sports') || (key === 'matches' && pathname === '/admin/matches') || (key === 'pages' && pathname === '/admin/pages');
  const links = items.map((item) => (
    <Pressable key={item.key} onPress={() => router.push(item.href as never)} className={`rounded-xl p-4 ${selected(item.key) ? 'bg-brand' : ''}`}>
      <Text className={`font-black ${selected(item.key) ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{collapsed ? item.mark : t(`admin.tabs.${item.key}`)}</Text>
    </Pressable>
  ));
  return (
    <>
      <View className={`${collapsed ? 'w-20' : 'w-64'} hidden border-r border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 md:flex`}>
        <Pressable onPress={() => setCollapsed(!collapsed)} className="mb-4 rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
          <Text className="text-center font-black text-slate-900 dark:text-white">{collapsed ? '→' : '←'}</Text>
        </Pressable>
        <View className="gap-2">{links}</View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="max-h-20 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 md:hidden" contentContainerClassName="gap-2 p-3">
        {items.map((item) => (
          <Pressable key={item.key} onPress={() => router.push(item.href as never)} className={`rounded-xl px-4 py-3 ${selected(item.key) ? 'bg-brand' : 'bg-slate-100 dark:bg-slate-800'}`}>
            <Text className="text-xs font-black text-slate-900 dark:text-white">{t(`admin.tabs.${item.key}`)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </>
  );
}
