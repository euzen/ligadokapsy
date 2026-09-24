import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';

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
        <View className="flex-1"><Button label={t('sharing.view')} size="sm" variant={accessLevel === 'view' ? 'primary' : 'ghost'} onPress={() => setAccessLevel('view')} /></View>
        <View className="flex-1"><Button label={t('sharing.edit')} size="sm" variant={accessLevel === 'edit' ? 'primary' : 'ghost'} onPress={() => setAccessLevel('edit')} /></View>
      </View>

      <View className="max-h-48 gap-2">
        {filtered.slice(0, 6).map((user) => (
          <View key={user.id} className="min-h-11 flex-row items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-700">
            <View>
              <Text className="font-bold text-slate-900 dark:text-white">{fullName(user)}</Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400">{user.email}</Text>
            </View>
            <Button label={t('sharing.add')} size="sm" onPress={() => void handleAdd(user.id, accessLevel)} />
          </View>
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
            <Button label={t('sharing.remove')} variant="danger" size="sm" onPress={() => void handleRemove(share.user_id)} />
          </View>
        ))}
        {!shares.length && <Text className="py-2 text-center text-slate-500 dark:text-slate-400">{t('sharing.noShares')}</Text>}
      </ScrollView>

      <Button label={t('common.close')} variant="ghost" onPress={onClose} />
    </AdaptiveModal>
  );
}
