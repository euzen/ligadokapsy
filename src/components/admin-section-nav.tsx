import { router, usePathname } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

const items = [
  { key: 'overview', href: '/admin?tab=overview', mark: 'O' },
  { key: 'users', href: '/admin?tab=users', mark: 'U' },
  { key: 'tournaments', href: '/admin?tab=tournaments', mark: 'T' },
  { key: 'teams', href: '/admin?tab=teams', mark: 'T' },
  { key: 'sports', href: '/admin/sports', mark: 'S' },
  { key: 'matches', href: '/admin/matches', mark: 'M' },
] as const;

export function AdminSectionNav({ active }: { active: 'sports' | 'matches' }) {
  const { t } = useTranslation(); const pathname = usePathname(); const [collapsed, setCollapsed] = useState(false);
  const selected = (key: string) => key === active || (key === 'sports' && pathname === '/admin/sports') || (key === 'matches' && pathname === '/admin/matches');
  const links = items.map((item) => <Pressable key={item.key} onPress={() => router.push(item.href as never)} className={`rounded-xl p-4 ${selected(item.key) ? 'bg-brand' : ''}`}><Text className={`font-black ${selected(item.key) ? 'text-white' : 'text-slate-300'}`}>{collapsed ? item.mark : t(`admin.tabs.${item.key}`)}</Text></Pressable>);
  return <><View className={`${collapsed ? 'w-20' : 'w-64'} hidden border-r border-slate-800 bg-ink p-4 md:flex`}><Pressable onPress={() => setCollapsed(!collapsed)} className="mb-4 rounded-xl bg-slate-800 p-3"><Text className="text-center font-black text-white">{collapsed ? '→' : '←'}</Text></Pressable><View className="gap-2">{links}</View></View><ScrollView horizontal showsHorizontalScrollIndicator={false} className="max-h-20 bg-ink md:hidden" contentContainerClassName="gap-2 p-3">{items.map((item) => <Pressable key={item.key} onPress={() => router.push(item.href as never)} className={`rounded-xl px-4 py-3 ${selected(item.key) ? 'bg-brand' : 'bg-slate-800'}`}><Text className="text-xs font-black text-white">{t(`admin.tabs.${item.key}`)}</Text></Pressable>)}</ScrollView></>;
}
