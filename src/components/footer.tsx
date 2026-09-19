import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, Text, View } from 'react-native';

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  const links = [
    { href: '/docs/terms' as const, label: t('footer.terms'), external: false },
    { href: '/docs/privacy' as const, label: t('footer.privacy'), external: false },
    { href: '/docs/cookies' as const, label: t('footer.cookies'), external: false },
    { href: '/docs/faq' as const, label: t('footer.faq'), external: false },
    { href: 'mailto:info@ligadokapsy.cz' as const, label: t('footer.contact'), external: true },
  ];

  return (
    <View className="border-t border-slate-200 bg-slate-50 px-6 py-8 dark:border-slate-800 dark:bg-slate-950">
      <View className="mx-auto w-full max-w-6xl gap-6">
        <View className="flex-row flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {links.map((item) => (
            <Pressable
              key={item.href}
              onPress={() => (item.external ? Linking.openURL(item.href) : router.push(item.href as never))}
              className="touch-manipulation"
            >
              <Text className="text-sm text-slate-600 hover:text-brand dark:text-slate-400">{item.label}</Text>
            </Pressable>
          ))}
        </View>
        <View className="items-center gap-1">
          <Text className="text-center text-lg font-black text-slate-900 dark:text-white">LIGA<Text className="text-brand">DO</Text>KAPSY</Text>
          <Text className="text-center text-xs text-slate-500 dark:text-slate-500">© {year} LigaDoKapsy. {t('footer.rights')}</Text>
        </View>
      </View>
    </View>
  );
}
