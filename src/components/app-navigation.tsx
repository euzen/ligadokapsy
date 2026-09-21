import { router, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, Text, View } from 'react-native';

import { LanguageSwitcher } from '@/components/language-switcher';
import { useToast } from '@/components/ui/toast-provider';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';

export function AppNavigation() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const { theme, setPreference } = useTheme();
  const toast = useToast();
  const handleSignOut = async () => {
    try {
      await signOut();
      toast.info(t('toast.signedOut'));
    } catch {
      toast.error(t('toast.signOutFailed'));
    }
  };
  if (pathname === '/scorekeeper') return null;
  const items = [
    { label: t('nav.home'), path: '/' },
    { label: t('nav.tournaments'), path: '/tournaments' },
    { label: t('nav.teams'), path: '/teams' },
    { label: t('nav.matches'), path: '/matches' },
    { label: t('nav.profile'), path: '/profile' },
    ...(profile?.role === 'admin' ? [{ label: t('nav.admin'), path: '/admin' }] : []),
  ];

  const isActive = (path: string) => path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`);

  const themeToggle = (
    <Pressable onPress={() => setPreference(theme === 'dark' ? 'light' : 'dark')} className="min-h-11 min-w-11 items-center justify-center rounded-xl bg-slate-700 touch-manipulation">
      <Text className="font-black text-white">{theme === 'dark' ? '☀️' : '🌙'}</Text>
    </Pressable>
  );

  if (Platform.OS !== 'web') {
    return (
      <View className="absolute inset-x-2 bottom-2 z-50 flex-row rounded-2xl border border-slate-700 bg-slate-900/95 p-2 shadow-xl safe-bottom backdrop-blur">
        {items.map((item) => {
          const active = isActive(item.path);
          return (
            <Pressable key={item.path} onPress={() => router.push(item.path as never)} className={`min-h-11 flex-1 items-center justify-center rounded-xl ${active ? 'bg-brand' : ''} touch-manipulation`}>
              <Text className={`text-[10px] font-black ${active ? 'text-white' : 'text-slate-300'}`}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View className="z-50 w-full items-center border-b border-slate-200 bg-white px-4 py-3 safe-top safe-horizontal dark:border-slate-800 dark:bg-slate-950">
      <View className="w-full max-w-6xl flex-row items-center justify-between gap-3">
        <Pressable onPress={() => router.push('/')} className="min-h-11 justify-center touch-manipulation">
          <Text className="text-xl font-black text-slate-900 dark:text-white">{t('common.appName')}</Text>
          <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{t('common.tagline')}</Text>
        </Pressable>
        <View className="hidden flex-row items-center gap-2 md:flex">
          {items.map((item) => (
            <Pressable key={item.path} onPress={() => router.push(item.path as never)} className={`min-h-11 justify-center rounded-xl px-3 py-2 touch-manipulation ${isActive(item.path) ? 'bg-slate-100 dark:bg-slate-800' : ''}`}>
              <Text className={`text-sm font-bold ${isActive(item.path) ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}`}>{item.label}</Text>
            </Pressable>
          ))}
          {profile ? (
            <Pressable onPress={() => void handleSignOut()} className="min-h-11 justify-center rounded-xl border border-slate-300 px-3 py-2 touch-manipulation dark:border-slate-600">
              <Text className="text-sm font-bold text-slate-900 dark:text-white">{t('nav.signOut')}</Text>
            </Pressable>
          ) : (
            <>
              <Pressable onPress={() => router.push('/sign-in')} className="min-h-11 justify-center rounded-xl border border-slate-300 px-3 py-2 touch-manipulation dark:border-slate-600">
                <Text className="text-sm font-bold text-slate-900 dark:text-white">{t('nav.signIn')}</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/sign-up')} className="min-h-11 justify-center rounded-xl bg-brand px-3 py-2 touch-manipulation">
                <Text className="text-sm font-black text-white">{t('nav.signUp')}</Text>
              </Pressable>
            </>
          )}
          {themeToggle}
          <LanguageSwitcher />
        </View>
        <View className="flex-row items-center gap-2 md:hidden">
          {themeToggle}
          <LanguageSwitcher />
        </View>
      </View>
    </View>
  );
}
