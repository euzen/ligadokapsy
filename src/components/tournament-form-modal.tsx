import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { DatePickerField } from '@/components/date-picker-field';
import { ImagePickerField } from '@/components/image-picker-field';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { useSports } from '@/features/auth/use-local-data';
import type { SportSlug, Tournament } from '@/types/database';

type TournamentValues = Omit<Tournament, 'id' | 'created_by' | 'status' | 'rosters_locked'>;

export function TournamentFormModal({ tournament, onClose, onSave }: { tournament?: Tournament; onClose: () => void; onSave: (values: TournamentValues) => Promise<void> }) {
  const { t } = useTranslation();
  const { data: sports } = useSports();
  const [name, setName] = useState(tournament?.name ?? '');
  const [sport, setSport] = useState<SportSlug>(tournament?.sport ?? 'football');
  const [location, setLocation] = useState(tournament?.location ?? '');
  const [date, setDate] = useState(tournament?.start_date ?? '');
  const [logo, setLogo] = useState<string | null>(tournament?.logo_url ?? null);
  const [saving, setSaving] = useState(false);
  const save = async () => { setSaving(true); try { await onSave({ name: name.trim(), sport, location: location.trim(), start_date: date, logo_url: logo }); onClose(); } finally { setSaving(false); } };
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View className="flex-1 items-center justify-center bg-slate-950/80 px-4"><ScrollView className="max-h-[90%] w-full max-w-lg rounded-2xl bg-white" contentContainerClassName="gap-5 p-6"><View className="flex-row items-center justify-between"><Text className="text-2xl font-black text-ink">{t(tournament ? 'tournaments.edit' : 'tournaments.create')}</Text><Pressable onPress={onClose} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"><Text className="text-xl font-black text-ink">×</Text></Pressable></View><Field label={t('tournaments.name')} value={name} onChangeText={setName} /><View className="gap-2"><Text className="text-sm font-bold text-ink">{t('tournaments.sport')}</Text><View className="flex-row flex-wrap gap-2">{sports.map((item) => <Pressable key={item.id} onPress={() => setSport(item.code)} className={`rounded-xl px-4 py-3 ${sport === item.code ? 'bg-brand' : 'bg-slate-100'}`}><Text className={sport === item.code ? 'font-bold text-white' : 'font-bold text-ink'}>{item.name}</Text></Pressable>)}</View></View><Field label={t('tournaments.location')} value={location} onChangeText={setLocation} /><DatePickerField label={t('tournaments.startDate')} value={date} onChange={setDate} /><ImagePickerField label={t('tournaments.logo')} value={logo} onChange={setLogo} /><View className="flex-row gap-3"><View className="flex-1"><Button label={t('common.cancel')} variant="ghost" onPress={onClose} /></View><View className="flex-1"><Button label={t('common.save')} onPress={() => void save()} loading={saving} disabled={name.length < 3 || location.length < 2 || Number.isNaN(Date.parse(date))} /></View></View></ScrollView></View></Modal>;
}
