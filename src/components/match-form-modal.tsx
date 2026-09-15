import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { DatePickerField } from '@/components/date-picker-field';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import type { Match, Team } from '@/types/database';

type MatchValues = Omit<Match, 'id' | 'status' | 'home_score' | 'away_score' | 'clock_seconds' | 'clock_started_at'>;

export function MatchFormModal({ tournamentId, teams, onClose, onSave }: { tournamentId: string; teams: Team[]; onClose: () => void; onSave: (values: MatchValues) => Promise<void> }) {
  const { t } = useTranslation();
  const [home, setHome] = useState(''); const [away, setAway] = useState(''); const [date, setDate] = useState(''); const [time, setTime] = useState('09:00'); const [pitch, setPitch] = useState(''); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const save = async () => { setError(''); setSaving(true); try { await onSave({ tournament_id: tournamentId, home_team_id: home, away_team_id: away, match_date: date, match_time: time, pitch_location: pitch.trim() }); onClose(); } catch (reason) { setError(t(reason instanceof Error ? reason.message : 'request.failed')); } finally { setSaving(false); } };
  const selector = (value: string, onChange: (id: string) => void, label: string) => <View className="gap-2"><Text className="text-sm font-bold text-ink">{label}</Text><View className="flex-row flex-wrap gap-2">{teams.map((team) => <Pressable key={team.id} onPress={() => onChange(team.id)} className={`rounded-xl px-4 py-3 ${value === team.id ? 'bg-brand' : 'bg-slate-100'}`}><Text className={value === team.id ? 'font-bold text-white' : 'font-bold text-ink'}>{team.short_name}</Text></Pressable>)}</View></View>;
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View className="flex-1 items-center justify-center bg-slate-950/80 px-4"><ScrollView className="max-h-[90%] w-full max-w-lg rounded-2xl bg-white" contentContainerClassName="gap-5 p-6"><View className="flex-row items-center justify-between"><Text className="text-2xl font-black text-ink">{t('matches.create')}</Text><Pressable onPress={onClose} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"><Text className="text-xl font-black text-ink">×</Text></Pressable></View>{selector(home, setHome, t('matches.home'))}{selector(away, setAway, t('matches.away'))}<DatePickerField label={t('matches.date')} value={date} onChange={setDate} /><Field label={t('matches.time')} value={time} onChangeText={setTime} placeholder="09:00" /><Field label={t('matches.pitch')} value={pitch} onChangeText={setPitch} />{error ? <Text className="font-bold text-red-600">{error}</Text> : null}<View className="flex-row gap-3"><View className="flex-1"><Button label={t('common.cancel')} variant="ghost" onPress={onClose} /></View><View className="flex-1"><Button label={t('common.save')} onPress={() => void save()} loading={saving} disabled={!home || !away || home === away || !date || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || pitch.trim().length < 2} /></View></View></ScrollView></View></Modal>;
}
