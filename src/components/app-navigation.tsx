import { router, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, Text, View } from 'react-native';

import { LanguageSwitcher } from '@/components/language-switcher';
import { useAuth } from '@/providers/auth-provider';

export function AppNavigation() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  if (pathname === '/scorekeeper') return null;
  const items = [
    { label: t('nav.home'), path: '/' },
    { label: t('nav.tournaments'), path: '/tournaments' },
    { label: t('nav.teams'), path: '/teams' },
    { label: t('nav.matches'), path: '/matches' },
    { label: t('nav.scorekeeper'), path: '/scorekeeper' },
    { label: t('nav.profile'), path: '/profile' },
    ...(profile?.role === 'admin' ? [{ label: t('nav.admin'), path: '/admin' }] : []),
  ];

  if (Platform.OS !== 'web') {
    return <View className="absolute inset-x-3 bottom-3 z-50 flex-row rounded-2xl border border-slate-700 bg-ink p-2 shadow-xl">{items.map((item) => { const active = pathname === item.path; return <Pressable key={item.path} onPress={() => router.push(item.path as never)} className={`flex-1 items-center rounded-xl py-3 ${active ? 'bg-brand' : ''}`}><Text className={`text-xs font-black ${active ? 'text-white' : 'text-slate-300'}`}>{item.label}</Text></Pressable>; })}</View>;
  }

  return <View className="z-50 w-full items-center border-b border-slate-800 bg-ink px-6 py-4"><View className="w-full max-w-6xl flex-row items-center justify-between gap-4"><Pressable onPress={() => router.push('/')}><Text className="text-xl font-black text-white">{t('common.appName')}</Text><Text className="text-xs font-bold text-emerald-400">{t('common.tagline')}</Text></Pressable><View className="flex-row items-center gap-2">{items.map((item) => <Pressable key={item.path} onPress={() => router.push(item.path as never)} className={`rounded-xl px-4 py-3 ${pathname === item.path ? 'bg-slate-800' : ''}`}><Text className={pathname === item.path ? 'font-bold text-emerald-400' : 'font-bold text-slate-300'}>{item.label}</Text></Pressable>)}{profile ? <Pressable onPress={() => void signOut()} className="rounded-xl border border-slate-600 px-4 py-3"><Text className="font-bold text-white">{t('nav.signOut')}</Text></Pressable> : <><Pressable onPress={() => router.push('/sign-in')} className="rounded-xl border border-slate-600 px-4 py-3"><Text className="font-bold text-white">{t('nav.signIn')}</Text></Pressable><Pressable onPress={() => router.push('/sign-up')} className="rounded-xl bg-brand px-4 py-3"><Text className="font-black text-white">{t('nav.signUp')}</Text></Pressable></>}<LanguageSwitcher dark /></View></View></View>;
}
