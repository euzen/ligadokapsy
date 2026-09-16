import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import type { RosterPlayer } from '@/types/database';

export function RosterPlayerModal({ onClose, onSave }: { onClose: () => void; onSave: (values: Omit<RosterPlayer, 'id' | 'tournament_team_id' | 'user_id'>) => Promise<void> }) {
  const { t } = useTranslation();
  const [name, setName] = useState(''); const [number, setNumber] = useState(''); const [position, setPosition] = useState(''); const [captain, setCaptain] = useState(false); const [saving, setSaving] = useState(false);
  const save = async () => { setSaving(true); try { await onSave({ player_name: name.trim(), jersey_number: number ? Number(number) : null, position: position.trim() || null, is_captain: captain }); onClose(); } finally { setSaving(false); } };
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View className="flex-1 items-center justify-center bg-slate-950/80 px-4"><ScrollView className="max-h-[90%] w-full max-w-lg rounded-2xl bg-white" contentContainerClassName="gap-5 p-6"><View className="flex-row items-center justify-between"><Text className="text-2xl font-black text-ink">{t('rosters.addPlayer')}</Text><Pressable onPress={onClose} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"><Text className="text-xl font-black text-ink">×</Text></Pressable></View><Field label={t('rosters.name')} value={name} onChangeText={setName} /><Field label={t('rosters.jersey')} value={number} onChangeText={setNumber} keyboardType="number-pad" /><Field label={t('rosters.position')} value={position} onChangeText={setPosition} /><View className="flex-row items-center gap-3"><Switch value={captain} onValueChange={setCaptain} /><Text className="font-bold text-ink">{t('rosters.captain')}</Text></View><View className="flex-row gap-3"><View className="flex-1"><Button label={t('common.cancel')} variant="ghost" onPress={onClose} /></View><View className="flex-1"><Button label={t('common.save')} onPress={() => void save()} loading={saving} disabled={name.trim().length < 2} /></View></View></ScrollView></View></Modal>;
}
