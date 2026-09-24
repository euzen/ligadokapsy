import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Switch, Text, View } from 'react-native';

import { DatePickerField } from '@/components/date-picker-field';
import { AdaptiveModal } from '@/components/mobile-bottom-sheet';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import type { Team } from '@/types/database';

type Props = {
  teams: Team[];
  onClose: () => void;
  onGenerate: (teamOrder: Team[], options: { includeThirdPlace: boolean; matchDate: string; pitchLocation: string }) => Promise<void>;
};

export function BracketGeneratorModal({ teams, onClose, onGenerate }: Props) {
  const { t } = useTranslation();
  const [order, setOrder] = useState<Team[]>([...teams]);
  const [thirdPlace, setThirdPlace] = useState(true);
  const [matchDate, setMatchDate] = useState(new Date().toISOString().slice(0, 10));
  const [pitchLocation, setPitchLocation] = useState('');
  const [saving, setSaving] = useState(false);

  const moveUp = (index: number) => {
    if (index === 0) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveDown = (index: number) => {
    if (index >= order.length - 1) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await onGenerate(order, { includeThirdPlace: thirdPlace, matchDate, pitchLocation });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const validTeamCount = order.length >= 2;

  return (
    <AdaptiveModal visible title={t('bracket.generate')} onClose={onClose}>
      <ScrollView className="max-h-[50vh]">
        <Text className="mb-3 text-sm font-bold text-slate-900 dark:text-white">{t('bracket.seeding')}</Text>
        <View className="gap-2">
          {order.map((team, index) => (
            <View key={team.id} className="flex-row items-center gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <Text className="w-8 text-center font-mono font-black text-brand">{index + 1}</Text>
              <View style={{ backgroundColor: team.color }} className="h-7 w-7 rounded-lg" />
              <Text className="flex-1 font-bold text-slate-900 dark:text-white" numberOfLines={1}>{team.name}</Text>
              <View className="flex-row gap-1">
                <Button label="↑" variant="ghost" size="sm" className="min-w-9 px-0" onPress={() => moveUp(index)} />
                <Button label="↓" variant="ghost" size="sm" className="min-w-9 px-0" onPress={() => moveDown(index)} />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <DatePickerField label={t('bracket.matchDate')} value={matchDate} onChange={setMatchDate} />
      <Field label={t('bracket.pitchLocation')} value={pitchLocation} onChangeText={setPitchLocation} />
      <View className="flex-row items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
        <View className="flex-1">
          <Text className="font-black text-slate-900 dark:text-white">{t('bracket.thirdPlace')}</Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400">{t('bracket.thirdPlaceHint')}</Text>
        </View>
        <Switch value={thirdPlace} onValueChange={setThirdPlace} />
      </View>
      {!validTeamCount ? <Text className="text-sm font-bold text-red-500">{t('bracket.needTeams')}</Text> : null}
      <View className="flex-row gap-3">
        <View className="flex-1"><Button label={t('common.cancel')} variant="ghost" onPress={onClose} /></View>
        <View className="flex-1"><Button label={t('bracket.generate')} loading={saving} disabled={!validTeamCount} onPress={() => void save()} /></View>
      </View>
    </AdaptiveModal>
  );
}
