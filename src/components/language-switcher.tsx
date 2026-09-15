import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { type AppLanguage, setAppLanguage } from '@/lib/i18n';

export function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage === 'cs' ? 'cs' : 'en';
  return <View className={`flex-row rounded-xl p-1 ${dark ? 'bg-gray-800' : 'bg-canvas'}`}>{(['cs', 'en'] as AppLanguage[]).map((language) => <Pressable key={language} onPress={() => void setAppLanguage(language)} accessibilityLabel={`Switch language to ${language}`} className={`rounded-lg px-3 py-2 ${current === language ? 'bg-brand' : ''}`}><Text className={`text-xs font-black ${current === language ? 'text-white' : dark ? 'text-gray-300' : 'text-muted'}`}>{language === 'cs' ? 'CZ' : 'EN'}</Text></Pressable>)}</View>;
}
