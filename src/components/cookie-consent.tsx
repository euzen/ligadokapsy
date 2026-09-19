import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';

const CONSENT_KEY = 'ligadokapsy.cookie-consent';

type Consent = { essential: boolean; analytics: boolean; marketing: boolean; accepted: boolean };

const defaultConsent: Consent = { essential: true, analytics: false, marketing: false, accepted: false };

async function readConsent(): Promise<Consent> {
  if (Platform.OS === 'web') {
    try { return JSON.parse(localStorage.getItem(CONSENT_KEY) ?? 'null') ?? defaultConsent; }
    catch { return defaultConsent; }
  }
  try { return JSON.parse((await SecureStore.getItemAsync(CONSENT_KEY)) ?? 'null') ?? defaultConsent; }
  catch { return defaultConsent; }
}

async function writeConsent(value: Consent) {
  if (Platform.OS === 'web') { localStorage.setItem(CONSENT_KEY, JSON.stringify(value)); }
  else { await SecureStore.setItemAsync(CONSENT_KEY, JSON.stringify(value)); }
}

export function useCookieConsent() {
  const [consent, setConsent] = useState<Consent | null>(null);
  useEffect(() => { void readConsent().then(setConsent); }, []);
  const save = (value: Consent) => { setConsent(value); void writeConsent(value); };
  return { consent: consent ?? defaultConsent, save };
}

export function CookieConsent() {
  const { t } = useTranslation();
  const { consent, save } = useCookieConsent();
  const [settings, setSettings] = useState(false);
  const [draft, setDraft] = useState(consent);

  if (consent.accepted && !settings) return null;

  const acceptAll = () => save({ essential: true, analytics: true, marketing: true, accepted: true });
  const acceptEssential = () => save({ essential: true, analytics: false, marketing: false, accepted: true });
  const openSettings = () => { setDraft(consent); setSettings(true); };
  const saveCustom = () => { save({ ...draft, accepted: true }); setSettings(false); };

  return (
    <View className="absolute inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900 md:bottom-[5.5rem]">
      <View className="mx-auto w-full max-w-6xl gap-3">
        <Text className="text-sm font-bold text-slate-900 dark:text-white">{t('cookies.title')}</Text>
        <Text className="text-xs text-slate-600 dark:text-slate-400">{t('cookies.description')}</Text>
        <View className="flex-row flex-wrap gap-2">
          <Pressable onPress={acceptAll} className="min-h-11 min-w-11 items-center justify-center rounded-xl bg-brand px-4 touch-manipulation">
            <Text className="font-black text-white">{t('cookies.acceptAll')}</Text>
          </Pressable>
          <Pressable onPress={acceptEssential} className="min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 touch-manipulation dark:border-slate-600 dark:bg-slate-800">
            <Text className="font-bold text-slate-900 dark:text-white">{t('cookies.essentialOnly')}</Text>
          </Pressable>
          <Pressable onPress={openSettings} className="min-h-11 min-w-11 items-center justify-center rounded-xl px-4 touch-manipulation">
            <Text className="font-bold text-brand">{t('cookies.settings')}</Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={settings} animationType="slide" transparent presentationStyle="overFullScreen">
        <View className="flex-1 items-end justify-end bg-black/50">
          <View className="w-full rounded-t-2xl border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:max-h-[80%]">
            <View className="mx-auto w-full max-w-2xl">
              <Text className="text-lg font-black text-slate-900 dark:text-white">{t('cookies.settingsTitle')}</Text>
              <ScrollView className="my-4 max-h-80">
                <View className="gap-4">
                  <View className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                    <View className="flex-1 pr-3">
                      <Text className="font-bold text-slate-900 dark:text-white">{t('cookies.essential')}</Text>
                      <Text className="text-xs text-slate-500 dark:text-slate-400">{t('cookies.essentialDesc')}</Text>
                    </View>
                    <Switch value disabled />
                  </View>
                  <View className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                    <View className="flex-1 pr-3">
                      <Text className="font-bold text-slate-900 dark:text-white">{t('cookies.analytics')}</Text>
                      <Text className="text-xs text-slate-500 dark:text-slate-400">{t('cookies.analyticsDesc')}</Text>
                    </View>
                      <Switch value={draft.analytics} onValueChange={(value) => setDraft((prev) => ({ ...prev, analytics: value }))} />
                  </View>
                  <View className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                    <View className="flex-1 pr-3">
                      <Text className="font-bold text-slate-900 dark:text-white">{t('cookies.marketing')}</Text>
                      <Text className="text-xs text-slate-500 dark:text-slate-400">{t('cookies.marketingDesc')}</Text>
                    </View>
                    <Switch value={draft.marketing} onValueChange={(value) => setDraft((prev) => ({ ...prev, marketing: value }))} />
                  </View>
                </View>
              </ScrollView>
              <View className="flex-row gap-2">
                <Pressable onPress={() => setSettings(false)} className="min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-300 dark:border-slate-600">
                  <Text className="font-bold text-slate-900 dark:text-white">{t('common.cancel')}</Text>
                </Pressable>
                <Pressable onPress={saveCustom} className="min-h-11 flex-1 items-center justify-center rounded-xl bg-brand">
                  <Text className="font-black text-white">{t('cookies.save')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
