import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { ColorPickerField } from '@/components/color-picker-field';
import { ImagePickerField } from '@/components/image-picker-field';
import { AdaptiveModal } from '@/components/mobile-bottom-sheet';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { favoriteSports } from '@/features/auth/constants';
import type { SportSlug, Team } from '@/types/database';

type TeamValues = Omit<Team, 'id' | 'created_by'>;

export function TeamFormModal({ team, onClose, onSave }: { team?: Team; onClose: () => void; onSave: (values: TeamValues) => Promise<void> }) {
  const { t } = useTranslation();
  const [name, setName] = useState(team?.name ?? '');
  const [sport, setSport] = useState<SportSlug>(team?.primary_sport ?? 'football');
  const [color, setColor] = useState(team?.color ?? '#10B981');
  const [logo, setLogo] = useState<string | null>(team?.logo_url ?? null);
  const [isPrivate, setIsPrivate] = useState(team?.is_private ?? false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await onSave({ name: name.trim(), primary_sport: sport, color, logo_url: logo, is_private: isPrivate });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdaptiveModal visible={true} onClose={onClose} title={t(team ? 'teams.edit' : 'teams.create')}>
      <Field label={t('teams.name')} value={name} onChangeText={setName} />
      <View className="gap-2">
        <Field label={t('teams.sport')} value={sport} onChangeText={setSport} />
        <View className="flex-row flex-wrap gap-2">
          {favoriteSports.map((item) => (
            <Button key={item} label={t(`sports.${item}`)} size="sm" variant={sport === item ? 'primary' : 'ghost'} onPress={() => setSport(item)} />
          ))}
        </View>
      </View>
      <ColorPickerField label={t('teams.color')} value={color} onChange={setColor} />
      <ImagePickerField label={t('teams.logo')} value={logo} onChange={setLogo} />
      <View className="gap-2">
        <View className="flex-row items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
          <View className="flex-1">
            <Text className="font-black text-slate-900 dark:text-white">{t('teams.private')}</Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400">{t('teams.privateHint')}</Text>
          </View>
          <Pressable onPress={() => setIsPrivate((value) => !value)} className={`min-h-11 w-14 rounded-full px-1 touch-manipulation ${isPrivate ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-600'}`}>
            <View className={`h-6 w-6 rounded-full bg-white shadow-sm ${isPrivate ? 'translate-x-6' : 'translate-x-0'}`} />
          </Pressable>
        </View>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1"><Button label={t('common.cancel')} variant="ghost" onPress={onClose} /></View>
        <View className="flex-1"><Button label={team ? t('common.save') : t('teams.create')} loading={saving} onPress={() => void save()} /></View>
      </View>
    </AdaptiveModal>
  );
}
