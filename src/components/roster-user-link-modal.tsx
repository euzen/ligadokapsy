import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import type { UserProfile } from '@/types/database';

export function RosterUserLinkModal({ currentUserId, users, onClose, onSave }: { currentUserId: string | null; users: UserProfile[]; onClose: () => void; onSave: (userId: string | null) => Promise<void> }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string | null>(currentUserId);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const filtered = useMemo(() => users.filter((user) => user.displayName.toLowerCase().includes(search.toLowerCase()) || user.email.toLowerCase().includes(search.toLowerCase())), [users, search]);
  const save = async () => { setSaving(true); try { await onSave(selected); onClose(); } finally { setSaving(false); } };
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View className="flex-1 items-center justify-center bg-slate-950/80 px-4"><ScrollView className="max-h-[90%] w-full max-w-lg rounded-2xl bg-white" contentContainerClassName="gap-5 p-6"><View className="flex-row items-center justify-between"><Text className="text-2xl font-black text-ink">{t('rosters.link')}</Text><Pressable onPress={onClose} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"><Text className="text-xl font-black text-ink">×</Text></Pressable></View><Field label={t('rosters.searchUser')} value={search} onChangeText={setSearch} placeholder={t('rosters.searchUserPlaceholder')} /><View className="gap-2">{filtered.map((user) => <Pressable key={user.id} onPress={() => setSelected(user.id)} className={`flex-row items-center gap-3 rounded-xl p-4 ${selected === user.id ? 'bg-brand/10 border border-brand' : 'bg-slate-50'}`}><View className="h-10 w-10 items-center justify-center rounded-full bg-slate-200"><Text className="font-black text-ink">{user.displayName.slice(0, 1).toUpperCase()}</Text></View><View className="flex-1"><Text className="font-black text-ink">{user.displayName}</Text><Text className="text-xs text-muted">{user.email}</Text></View>{selected === user.id ? <Text className="font-black text-brand">✓</Text> : null}</Pressable>)}</View><Pressable onPress={() => setSelected(null)} className={`rounded-xl border p-4 ${selected === null ? 'border-brand bg-brand/10' : 'border-slate-200 bg-white'}`}><Text className={`font-bold ${selected === null ? 'text-brand' : 'text-ink'}`}>{t('rosters.unlink')}</Text></Pressable><View className="flex-row gap-3"><View className="flex-1"><Button label={t('common.cancel')} variant="ghost" onPress={onClose} /></View><View className="flex-1"><Button label={t('common.save')} onPress={() => void save()} loading={saving} /></View></View></ScrollView></View></Modal>;
}
