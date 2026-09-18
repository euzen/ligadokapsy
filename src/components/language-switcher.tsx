import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { type AppLanguage, setAppLanguage } from '@/lib/i18n';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage === 'cs' ? 'cs' : 'en';
  return (
    <View className="flex-row rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
      {(['cs', 'en'] as AppLanguage[]).map((language) => (
        <Pressable
          key={language}
          onPress={() => void setAppLanguage(language)}
          accessibilityLabel={`Switch language to ${language}`}
          className={`rounded-lg px-3 py-2 ${current === language ? 'bg-brand' : ''}`}
        >
          <Text className={`text-xs font-black ${current === language ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{language === 'cs' ? 'CZ' : 'EN'}</Text>
        </Pressable>
      ))}
    </View>
  );
}
