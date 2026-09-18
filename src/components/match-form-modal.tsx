import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { DatePickerField } from '@/components/date-picker-field';
import { AdaptiveModal } from '@/components/mobile-bottom-sheet';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import type { Match, Team } from '@/types/database';

type MatchValues = Omit<Match, 'id' | 'status' | 'home_score' | 'away_score' | 'clock_seconds' | 'clock_started_at' | 'current_period'>;

export function MatchFormModal({ tournamentId, teams, onClose, onSave }: { tournamentId: string; teams: Team[]; onClose: () => void; onSave: (values: MatchValues) => Promise<void> }) {
  const { t } = useTranslation();
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [pitch, setPitch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setError('');
    setSaving(true);
    try {
      await onSave({ tournament_id: tournamentId, home_team_id: home, away_team_id: away, match_date: date, match_time: time, pitch_location: pitch.trim() });
      onClose();
    } catch (reason) {
      setError(t(reason instanceof Error ? reason.message : 'request.failed'));
    } finally {
      setSaving(false);
    }
  };

  const selector = (value: string, onChange: (id: string) => void, label: string) => (
    <View className="gap-2">
      <Text className="text-sm font-bold text-slate-900 dark:text-white">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {teams.map((team) => (
          <Pressable key={team.id} onPress={() => onChange(team.id)} className={`min-h-11 min-w-11 items-center justify-center rounded-xl px-4 py-2 touch-manipulation ${value === team.id ? 'bg-brand' : 'bg-slate-100 dark:bg-slate-700'}`}>
            <Text className={value === team.id ? 'font-bold text-white' : 'font-bold text-slate-900 dark:text-white'} numberOfLines={1}>{team.name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <AdaptiveModal visible onClose={onClose} title={t('matches.create')}>
      {selector(home, setHome, t('matches.home'))}
      {selector(away, setAway, t('matches.away'))}
      <DatePickerField label={t('matches.matchDate')} value={date} onChange={setDate} />
      <Field label={t('matches.time')} value={time} onChangeText={setTime} placeholder="09:00" />
      <Field label={t('matches.pitch')} value={pitch} onChangeText={setPitch} />
      {error ? <Text className="font-bold text-red-600 dark:text-red-400">{error}</Text> : null}
      <View className="flex-row gap-3">
        <View className="flex-1"><Button label={t('common.cancel')} variant="ghost" onPress={onClose} /></View>
        <View className="flex-1"><Button label={t('common.save')} onPress={() => void save()} loading={saving} disabled={!home || !away || home === away || !date || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || pitch.trim().length < 2} /></View>
      </View>
    </AdaptiveModal>
  );
}
