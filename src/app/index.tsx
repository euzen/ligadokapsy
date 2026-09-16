import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { LanguageSwitcher } from '@/components/language-switcher';
import { useAuth } from '@/providers/auth-provider';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const features = [t('home.secure'), t('home.profiles'), t('home.roles')];
  return <ScrollView className="flex-1 bg-canvas" contentContainerClassName="items-center pb-24"><View className="w-full max-w-6xl px-5 py-10 md:py-20"><View className="overflow-hidden rounded-2xl bg-ink px-7 py-14 md:px-14 md:py-20"><View className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand opacity-20" /><View className="relative max-w-3xl"><View className="flex-row flex-wrap items-start justify-between gap-4"><View className="self-start rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2"><Text className="text-xs font-black uppercase tracking-widest text-emerald-400">{t('home.badge')}</Text></View><LanguageSwitcher dark /></View><Text className="mt-7 text-5xl font-black text-white md:text-7xl">{t('common.appName')}</Text><Text className="mt-3 text-3xl font-black text-emerald-400 md:text-5xl">{t('common.tagline')}</Text><Text className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">{t('home.description')}</Text><View className="mt-9 flex-row flex-wrap gap-3">{profile ? <Pressable onPress={() => router.push('/profile')} className="min-h-14 items-center justify-center rounded-xl bg-brand px-7"><Text className="font-black text-white">{t('home.openProfile')}</Text></Pressable> : <><Pressable onPress={() => router.push('/sign-up')} className="min-h-14 items-center justify-center rounded-xl bg-brand px-7"><Text className="font-black text-white">{t('home.getStarted')}</Text></Pressable><Pressable onPress={() => router.push('/sign-in')} className="min-h-14 items-center justify-center rounded-xl border border-slate-600 px-7"><Text className="font-bold text-white">{t('home.adminLogin')}</Text></Pressable></>}</View></View></View><View className="mt-6 flex-row flex-wrap gap-4">{features.map((feature, index) => <View key={feature} className="min-w-60 flex-1 rounded-2xl border border-slate-200 bg-white p-6"><Text className="font-mono text-sm font-black text-brand">0{index + 1}</Text><Text className="mt-5 text-xl font-black text-ink">{feature}</Text></View>)}</View></View></ScrollView>;
}
