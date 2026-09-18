import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch, Text, View } from 'react-native';

import { AdaptiveModal } from '@/components/mobile-bottom-sheet';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import type { RosterPlayer } from '@/types/database';

type Values = Omit<RosterPlayer, 'id' | 'tournament_team_id' | 'team_id' | 'user_id' | 'created_by'>;

export function RosterPlayerModal({ player, onClose, onSave }: { player?: RosterPlayer; onClose: () => void; onSave: (values: Values) => Promise<void> }) {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState(player?.first_name ?? '');
  const [lastName, setLastName] = useState(player?.last_name ?? '');
  const [number, setNumber] = useState(player?.jersey_number?.toString() ?? '');
  const [position, setPosition] = useState(player?.position ?? '');
  const [captain, setCaptain] = useState(player?.is_captain ?? false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await onSave({ first_name: firstName.trim(), last_name: lastName.trim(), jersey_number: number ? Number(number) : null, position: position.trim() || null, is_captain: captain });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdaptiveModal visible onClose={onClose} title={t(player ? 'rosters.editPlayer' : 'rosters.addPlayer')}>
      <Field label={t('rosters.firstName')} value={firstName} onChangeText={setFirstName} />
      <Field label={t('rosters.lastName')} value={lastName} onChangeText={setLastName} />
      <Field label={t('rosters.jersey')} value={number} onChangeText={setNumber} keyboardType="number-pad" inputMode="numeric" />
      <Field label={t('rosters.position')} value={position} onChangeText={setPosition} />
      <View className="flex-row items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
        <Switch value={captain} onValueChange={setCaptain} />
        <Text className="font-bold text-slate-900 dark:text-white">{t('rosters.captain')}</Text>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1"><Button label={t('common.cancel')} variant="ghost" onPress={onClose} /></View>
        <View className="flex-1"><Button label={t('common.save')} onPress={() => void save()} loading={saving} disabled={firstName.trim().length < 1 || lastName.trim().length < 1} /></View>
      </View>
    </AdaptiveModal>
  );
}
