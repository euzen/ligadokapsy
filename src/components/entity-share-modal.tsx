import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AdaptiveModal } from '@/components/mobile-bottom-sheet';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast-provider';
import type { EntityShare, UserProfile } from '@/types/database';
import { fullName } from '@/types/database';

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
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [accessLevel, setAccessLevel] = useState<'view' | 'edit'>('view');
  const handleAdd = async (userId: string, level: 'view' | 'edit') => {
    try {
      await onAdd(userId, level);
      toast.success(t('toast.shareAdded'));
    } catch {
      toast.error(t('toast.shareFailed'));
    }
  };
  const handleRemove = async (userId: string) => {
    try {
      await onRemove(userId);
      toast.info(t('toast.shareRemoved'));
    } catch {
      toast.error(t('toast.shareFailed'));
    }
  };
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
    <AdaptiveModal visible onClose={onClose} title={t('sharing.title')}>
      <Text className="text-sm text-slate-500 dark:text-slate-400">{t('sharing.hint')}</Text>
      <Field label={t('rosters.searchUser')} value={search} onChangeText={setSearch} placeholder={t('rosters.searchUserPlaceholder')} />

      <View className="flex-row gap-2">
        <Pressable onPress={() => setAccessLevel('view')} className={`min-h-11 flex-1 items-center justify-center rounded-xl px-4 py-3 touch-manipulation ${accessLevel === 'view' ? 'bg-brand' : 'bg-slate-100 dark:bg-slate-700'}`}>
          <Text className={`text-center font-bold ${accessLevel === 'view' ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{t('sharing.view')}</Text>
        </Pressable>
        <Pressable onPress={() => setAccessLevel('edit')} className={`min-h-11 flex-1 items-center justify-center rounded-xl px-4 py-3 touch-manipulation ${accessLevel === 'edit' ? 'bg-brand' : 'bg-slate-100 dark:bg-slate-700'}`}>
          <Text className={`text-center font-bold ${accessLevel === 'edit' ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{t('sharing.edit')}</Text>
        </Pressable>
      </View>

      <View className="max-h-48 gap-2">
        {filtered.slice(0, 6).map((user) => (
          <Pressable key={user.id} onPress={() => void handleAdd(user.id, accessLevel)} className="min-h-11 flex-row items-center justify-between rounded-xl bg-slate-50 p-3 touch-manipulation dark:bg-slate-700">
            <View>
              <Text className="font-bold text-slate-900 dark:text-white">{fullName(user)}</Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400">{user.email}</Text>
            </View>
            <Text className="font-black text-brand">{t('sharing.add')}</Text>
          </Pressable>
        ))}
        {!filtered.length && <Text className="py-2 text-center text-slate-500 dark:text-slate-400">{t('sharing.noUsers')}</Text>}
      </View>

      <Text className="mt-2 font-bold text-slate-900 dark:text-white">{t('sharing.shared')}</Text>
      <ScrollView className="max-h-48 overflow-scrolling-touch" contentContainerClassName="gap-2">
        {shares.map((share) => (
          <View key={share.id} className="min-h-11 flex-row items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-700">
            <View>
              <Text className="font-bold text-slate-900 dark:text-white">{`${share.first_name} ${share.last_name}`.trim()}</Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400">{share.email} · {t(`sharing.${share.access_level}`)}</Text>
            </View>
            <Pressable onPress={() => void handleRemove(share.user_id)} className="min-h-11 items-center justify-center rounded-lg bg-red-100 px-3 py-2 touch-manipulation dark:bg-red-900/30">
              <Text className="text-xs font-black text-red-600 dark:text-red-400">{t('sharing.remove')}</Text>
            </Pressable>
          </View>
        ))}
        {!shares.length && <Text className="py-2 text-center text-slate-500 dark:text-slate-400">{t('sharing.noShares')}</Text>}
      </ScrollView>

      <Button label={t('common.close')} variant="ghost" onPress={onClose} />
    </AdaptiveModal>
  );
}
