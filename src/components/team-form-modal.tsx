import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { ColorPickerField } from '@/components/color-picker-field';
import { ImagePickerField } from '@/components/image-picker-field';
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
  const save = async () => { setSaving(true); try { await onSave({ name: name.trim(), primary_sport: sport, color, logo_url: logo, is_private: isPrivate }); onClose(); } finally { setSaving(false); } };
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View className="flex-1 items-center justify-center bg-slate-950/80 px-4"><ScrollView className="max-h-[90%] w-full max-w-lg rounded-2xl bg-white" contentContainerClassName="gap-5 p-6"><View className="flex-row items-center justify-between"><Text className="text-2xl font-black text-ink">{t(team ? 'teams.edit' : 'teams.create')}</Text><Pressable onPress={onClose} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"><Text className="text-xl font-black text-ink">×</Text></Pressable></View><Field label={t('teams.name')} value={name} onChangeText={setName} /><View className="gap-2"><Text className="text-sm font-bold text-ink">{t('teams.sport')}</Text><View className="flex-row flex-wrap gap-2">{favoriteSports.map((item) => <Pressable key={item} onPress={() => setSport(item)} className={`rounded-xl px-4 py-3 ${sport === item ? 'bg-brand' : 'bg-slate-100'}`}><Text className={sport === item ? 'font-bold text-white' : 'font-bold text-ink'}>{t(`sports.${item}`)}</Text></Pressable>)}</View></View><ColorPickerField label={t('teams.color')} value={color} onChange={setColor} /><ImagePickerField label={t('teams.logo')} value={logo} onChange={setLogo} /><View className="gap-2"><View className="flex-row items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4"><View className="flex-1"><Text className="font-black text-ink">{t('teams.private')}</Text><Text className="text-sm text-muted">{t('teams.privateHint')}</Text></View><Pressable onPress={() => setIsPrivate((value) => !value)} className={`h-8 w-14 rounded-full px-1 ${isPrivate ? 'bg-brand' : 'bg-slate-300'}`}><View className={`h-6 w-6 rounded-full bg-white shadow-sm ${isPrivate ? 'translate-x-6' : 'translate-x-0'}`} /></Pressable></View></View><View className="flex-row gap-3"><View className="flex-1"><Button label={t('common.cancel')} variant="ghost" onPress={onClose} /></View><View className="flex-1"><Button label={t('common.save')} onPress={() => void save()} loading={saving} disabled={name.length < 2 || !/^#[0-9A-Fa-f]{6}$/.test(color)} /></View></View></ScrollView></View></Modal>;
}
