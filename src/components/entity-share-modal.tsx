import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { fullName } from '@/types/database';
import type { EntityShare, UserProfile } from '@/types/database';

export function EntityShareModal({
  users,
  shares,
  onClose,
  onAdd,
  onRemove,
}: {
  users: UserProfile[];
  shares: EntityShare[];
  onClose: () => void;
  onAdd: (userId: string, accessLevel: 'view' | 'edit') => void;
  onRemove: (userId: string) => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [accessLevel, setAccessLevel] = useState<'view' | 'edit'>('view');
  const sharedIds = useMemo(() => new Set(shares.map((s) => s.user_id)), [shares]);
  const filtered = useMemo(
    () =>
      users.filter((user) => {
        if (sharedIds.has(user.id)) return false;
        const query = search.toLowerCase();
        return fullName(user).toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
      }),
    [users, sharedIds, search]
  );

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-slate-950/80 px-4">
        <ScrollView className="max-h-[90%] w-full max-w-lg rounded-2xl bg-white" contentContainerClassName="gap-5 p-6">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-black text-ink">{t('sharing.title')}</Text>
            <Pressable onPress={onClose} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <Text className="text-xl font-black text-ink">×</Text>
            </Pressable>
          </View>

          <Text className="text-sm text-muted">{t('sharing.hint')}</Text>

          <Field label={t('rosters.searchUser')} value={search} onChangeText={setSearch} placeholder={t('rosters.searchUserPlaceholder')} />

          <View className="flex-row gap-2">
            <Pressable onPress={() => setAccessLevel('view')} className={`flex-1 rounded-xl px-4 py-3 ${accessLevel === 'view' ? 'bg-brand' : 'bg-slate-100'}`}>
              <Text className={`text-center font-bold ${accessLevel === 'view' ? 'text-white' : 'text-ink'}`}>{t('sharing.view')}</Text>
            </Pressable>
            <Pressable onPress={() => setAccessLevel('edit')} className={`flex-1 rounded-xl px-4 py-3 ${accessLevel === 'edit' ? 'bg-brand' : 'bg-slate-100'}`}>
              <Text className={`text-center font-bold ${accessLevel === 'edit' ? 'text-white' : 'text-ink'}`}>{t('sharing.edit')}</Text>
            </Pressable>
          </View>

          <View className="max-h-48 gap-2">
            {filtered.slice(0, 6).map((user) => (
              <Pressable key={user.id} onPress={() => onAdd(user.id, accessLevel)} className="flex-row items-center justify-between rounded-xl bg-slate-50 p-3">
                <View>
                  <Text className="font-bold text-ink">{fullName(user)}</Text>
                  <Text className="text-xs text-muted">{user.email}</Text>
                </View>
                <Text className="font-black text-brand">{t('sharing.add')}</Text>
              </Pressable>
            ))}
            {!filtered.length && <Text className="py-2 text-center text-muted">{t('sharing.noUsers')}</Text>}
          </View>

          <Text className="mt-2 font-black text-ink">{t('sharing.shared')}</Text>
          <View className="max-h-48 gap-2">
            {shares.map((share) => (
              <View key={share.id} className="flex-row items-center justify-between rounded-xl bg-slate-50 p-3">
                <View>
                  <Text className="font-bold text-ink">{`${share.first_name} ${share.last_name}`.trim()}</Text>
                  <Text className="text-xs text-muted">{share.email} · {t(`sharing.${share.access_level}`)}</Text>
                </View>
                <Pressable onPress={() => onRemove(share.user_id)} className="rounded-lg bg-red-100 px-3 py-2">
                  <Text className="text-xs font-black text-red-600">{t('sharing.remove')}</Text>
                </Pressable>
              </View>
            ))}
            {!shares.length && <Text className="py-2 text-center text-muted">{t('sharing.noShares')}</Text>}
          </View>

          <Button label={t('common.close')} variant="ghost" onPress={onClose} />
        </ScrollView>
      </View>
    </Modal>
  );
}
