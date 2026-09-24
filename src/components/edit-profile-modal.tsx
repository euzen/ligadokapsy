import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, Text, View } from 'react-native';

import { ImagePickerField } from '@/components/image-picker-field';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { favoriteSports } from '@/features/auth/constants';
import type { EditableProfile, UserProfile } from '@/types/database';

export function EditProfileModal({ profile, onClose, onSave }: { profile: UserProfile; onClose: () => void; onSave: (values: EditableProfile) => Promise<void> }) {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState(profile.first_name ?? '');
  const [lastName, setLastName] = useState(profile.last_name ?? '');
  const [email, setEmail] = useState(profile.email ?? '');
  const [sport, setSport] = useState(profile.favoriteSport ?? 'football');
  const [themePreference, setThemePreference] = useState(profile.themePreference ?? 'dark');
  const [avatar, setAvatar] = useState<string | null>(profile.avatarUrl ?? null);
  const [color, setColor] = useState(profile.profileColor ?? '#10B981');
  const [language, setLanguage] = useState<'cs' | 'en'>(profile.language ?? 'cs');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setError('');
    setSaving(true);
    try {
      await onSave({ first_name: firstName.trim(), last_name: lastName.trim(), email: email.trim(), favoriteSport: sport, themePreference, avatarUrl: avatar, profileColor: color, language });
      onClose();
    } catch (reason) {
      setError(t(reason instanceof Error ? reason.message : 'request.failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-slate-950/80 px-4">
        <ScrollView className="max-h-[90%] w-full max-w-lg rounded-2xl bg-white dark:bg-slate-800" contentContainerClassName="gap-5 p-6">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-black text-slate-900 dark:text-white">{t('profile.edit')}</Text>
            <Button label="×" variant="ghost" className="h-10 w-10 rounded-full px-0" onPress={onClose} />
          </View>
          <Field label={t('profile.firstName')} value={firstName} onChangeText={setFirstName} />
          <Field label={t('profile.lastName')} value={lastName} onChangeText={setLastName} />
          <Field label={t('profile.email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <View className="gap-2">
            <Text className="text-sm font-bold text-slate-900 dark:text-white">{t('profile.favoriteSport')}</Text>
            <View className="flex-row flex-wrap gap-2">
              {favoriteSports.map((item) => (
                <Button key={item} label={t(`sports.${item}`)} size="sm" variant={sport === item ? 'primary' : 'ghost'} onPress={() => setSport(item)} />
              ))}
            </View>
          </View>
          <ImagePickerField label={t('profile.avatar')} value={avatar} onChange={setAvatar} />
          <Field label={t('profile.color')} value={color} onChangeText={setColor} autoCapitalize="characters" />
          <View className="gap-2">
            <Text className="text-sm font-bold text-slate-900 dark:text-white">{t('profile.language')}</Text>
            <View className="flex-row gap-2">
              {(['cs', 'en'] as const).map((item) => (
                <View key={item} className="flex-1"><Button label={item === 'cs' ? 'CS' : 'EN'} size="sm" variant={language === item ? 'primary' : 'ghost'} onPress={() => setLanguage(item)} /></View>
              ))}
            </View>
          </View>
          <View className="gap-2">
            <Text className="text-sm font-bold text-slate-900 dark:text-white">{t('profile.theme')}</Text>
            <View className="flex-row gap-2">
              {(['system', 'light', 'dark'] as const).map((item) => (
                <View key={item} className="flex-1"><Button label={t(`profile.themeOptions.${item}`)} size="sm" variant={themePreference === item ? 'primary' : 'ghost'} onPress={() => setThemePreference(item)} /></View>
              ))}
            </View>
          </View>
          {error ? <Text className="rounded-xl bg-red-50 p-3 font-bold text-red-600 dark:bg-red-900/50 dark:text-red-200">{error}</Text> : null}
          <Button label={t('profile.save')} onPress={() => void save()} loading={saving} />
        </ScrollView>
      </View>
    </Modal>
  );
}
