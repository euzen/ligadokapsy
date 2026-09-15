import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import cs from '@/locales/cs.json';
import en from '@/locales/en.json';

export type AppLanguage = 'cs' | 'en';

function deviceLanguage(): AppLanguage {
  const code = getLocales()[0]?.languageCode?.toLowerCase();
  return code === 'cs' || code === 'sk' ? 'cs' : 'en';
}

const i18n = createInstance();
void i18n.use(initReactI18next).init({ resources: { cs: { translation: cs }, en: { translation: en } }, lng: deviceLanguage(), fallbackLng: 'en', supportedLngs: ['cs', 'en'], interpolation: { escapeValue: false } });

export async function setAppLanguage(language: AppLanguage) {
  await i18n.changeLanguage(language);
}

export default i18n;
