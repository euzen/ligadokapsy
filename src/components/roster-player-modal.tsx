import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';

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
  const save = async () => { setSaving(true); try { await onSave({ first_name: firstName.trim(), last_name: lastName.trim(), jersey_number: number ? Number(number) : null, position: position.trim() || null, is_captain: captain }); onClose(); } finally { setSaving(false); } };
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View className="flex-1 items-center justify-center bg-slate-950/80 px-4"><ScrollView className="max-h-[90%] w-full max-w-lg rounded-2xl bg-white" contentContainerClassName="gap-5 p-6"><View className="flex-row items-center justify-between"><Text className="text-2xl font-black text-ink">{t(player ? 'rosters.editPlayer' : 'rosters.addPlayer')}</Text><Pressable onPress={onClose} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"><Text className="text-xl font-black text-ink">×</Text></Pressable></View><Field label={t('rosters.firstName')} value={firstName} onChangeText={setFirstName} /><Field label={t('rosters.lastName')} value={lastName} onChangeText={setLastName} /><Field label={t('rosters.jersey')} value={number} onChangeText={setNumber} keyboardType="number-pad" /><Field label={t('rosters.position')} value={position} onChangeText={setPosition} /><View className="flex-row items-center gap-3"><Switch value={captain} onValueChange={setCaptain} /><Text className="font-bold text-ink">{t('rosters.captain')}</Text></View><View className="flex-row gap-3"><View className="flex-1"><Button label={t('common.cancel')} variant="ghost" onPress={onClose} /></View><View className="flex-1"><Button label={t('common.save')} onPress={() => void save()} loading={saving} disabled={firstName.trim().length < 1 || lastName.trim().length < 1} /></View></View></ScrollView></View></Modal>;
}
