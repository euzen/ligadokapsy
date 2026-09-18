import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { ImagePickerField } from '@/components/image-picker-field';
import { AdaptiveModal } from '@/components/mobile-bottom-sheet';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { favoriteSports } from '@/features/auth/constants';
import type { Tournament } from '@/types/database';

type TournamentValues = Omit<Tournament, 'id' | 'created_by' | 'status' | 'rosters_locked'>;

export function TournamentFormModal({ tournament, showStatus, onClose, onSave }: { tournament?: Tournament; showStatus?: boolean; onClose: () => void; onSave: (values: TournamentValues & Partial<Pick<Tournament, 'status'>>) => Promise<void> }) {
  const { t } = useTranslation();
  const [name, setName] = useState(tournament?.name ?? '');
  const [sport, setSport] = useState(tournament?.sport ?? 'football');
  const [location, setLocation] = useState(tournament?.location ?? '');
  const [startDate, setStartDate] = useState(tournament?.start_date ? tournament.start_date.slice(0, 10) : '');
  const [logo, setLogo] = useState<string | null>(tournament?.logo_url ?? null);
  const [isPrivate, setIsPrivate] = useState(tournament?.is_private ?? false);
  const [status, setStatus] = useState<Tournament['status']>(tournament?.status ?? 'draft');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const values: TournamentValues & Partial<Pick<Tournament, 'status'>> = { name: name.trim(), sport, location: location.trim(), start_date: startDate, logo_url: logo, is_private: isPrivate };
      if (showStatus) values.status = status;
      await onSave(values);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdaptiveModal visible={true} onClose={onClose} title={t(tournament ? 'tournaments.edit' : 'tournaments.create')}>
      <Field label={t('tournaments.name')} value={name} onChangeText={setName} />
      <View className="gap-2">
        <Field label={t('tournaments.sport')} value={sport} onChangeText={setSport} />
        <View className="flex-row flex-wrap gap-2">
          {favoriteSports.map((item) => (
            <Pressable key={item} onPress={() => setSport(item)} className={`min-h-11 min-w-11 items-center justify-center rounded-xl px-4 py-2 touch-manipulation ${sport === item ? 'bg-brand' : 'bg-slate-100 dark:bg-slate-700'}`}>
              <Text className={sport === item ? 'font-bold text-white' : 'font-bold text-slate-900 dark:text-white'}>{t(`sports.${item}`)}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Field label={t('tournaments.location')} value={location} onChangeText={setLocation} />
      <Field label={t('tournaments.startDate')} value={startDate} onChangeText={setStartDate} inputMode="text" />
      <ImagePickerField label={t('tournaments.logo')} value={logo} onChange={setLogo} />
      {showStatus ? (
        <View className="gap-2">
          <Text className="text-sm font-bold text-slate-900 dark:text-white">{t('tournaments.status.title')}</Text>
          <View className="flex-row flex-wrap gap-2">
            {(['draft', 'published', 'completed'] as Tournament['status'][]).map((item) => (
              <Pressable key={item} onPress={() => setStatus(item)} className={`min-h-11 min-w-11 items-center justify-center rounded-xl px-4 py-2 touch-manipulation ${status === item ? 'bg-brand' : 'bg-slate-100 dark:bg-slate-700'}`}>
                <Text className={status === item ? 'font-bold text-white' : 'font-bold text-slate-900 dark:text-white'}>{t(`tournaments.status.${item}`)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      <View className="gap-2">
        <View className="flex-row items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
          <View className="flex-1">
            <Text className="font-black text-slate-900 dark:text-white">{t('tournaments.private')}</Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400">{t('tournaments.privateHint')}</Text>
          </View>
          <Pressable onPress={() => setIsPrivate((value) => !value)} className={`min-h-11 w-14 rounded-full px-1 touch-manipulation ${isPrivate ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-600'}`}>
            <View className={`h-6 w-6 rounded-full bg-white shadow-sm ${isPrivate ? 'translate-x-6' : 'translate-x-0'}`} />
          </Pressable>
        </View>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1"><Button label={t('common.cancel')} variant="ghost" onPress={onClose} /></View>
        <View className="flex-1"><Button label={tournament ? t('common.save') : t('tournaments.create')} loading={saving} onPress={() => void save()} /></View>
      </View>
    </AdaptiveModal>
  );
}
