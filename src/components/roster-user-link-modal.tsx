import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { AdaptiveModal } from '@/components/mobile-bottom-sheet';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import type { UserProfile } from '@/types/database';
import { fullName, initialsFromName } from '@/types/database';

export function RosterUserLinkModal({ currentUserId, users, onClose, onSave }: { currentUserId: string | null; users: UserProfile[]; onClose: () => void; onSave: (userId: string | null) => Promise<void> }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string | null>(currentUserId);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const filtered = useMemo(() => users.filter((user) => fullName(user).toLowerCase().includes(search.toLowerCase()) || user.email.toLowerCase().includes(search.toLowerCase())), [users, search]);
  const save = async () => { setSaving(true); try { await onSave(selected); onClose(); } finally { setSaving(false); } };

  return (
    <AdaptiveModal visible onClose={onClose} title={t('rosters.link')}>
      <Field label={t('rosters.searchUser')} value={search} onChangeText={setSearch} placeholder={t('rosters.searchUserPlaceholder')} />
      <View className="gap-2">
        {filtered.map((user) => (
          <Pressable key={user.id} onPress={() => setSelected(user.id)} className={`min-h-11 flex-row items-center gap-3 rounded-xl p-3 touch-manipulation ${selected === user.id ? 'border border-brand bg-brand/10' : 'border border-transparent bg-slate-50 dark:bg-slate-700'}`}>
            <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-600">
              <Text className="font-black text-slate-900 dark:text-white">{initialsFromName(fullName(user)).slice(0, 1)}</Text>
            </View>
            <View className="flex-1">
              <Text className="font-bold text-slate-900 dark:text-white">{fullName(user)}</Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400">{user.email}</Text>
            </View>
            {selected === user.id ? <Text className="font-black text-brand">✓</Text> : null}
          </Pressable>
        ))}
      </View>
      <Button label={t('rosters.unlink')} size="sm" variant={selected === null ? 'primary' : 'ghost'} onPress={() => setSelected(null)} />
      <View className="flex-row gap-3">
        <View className="flex-1"><Button label={t('common.cancel')} variant="ghost" onPress={onClose} /></View>
        <View className="flex-1"><Button label={t('common.save')} onPress={() => void save()} loading={saving} /></View>
      </View>
    </AdaptiveModal>
  );
}
