import { useTranslation } from 'react-i18next';

import { AdaptiveModal } from '@/components/mobile-bottom-sheet';
import { Button } from '@/components/ui/button';
import { Text, View } from 'react-native';

export function ConfirmDeleteModal({ name, onCancel, onConfirm }: { name: string; onCancel: () => void; onConfirm: () => Promise<void> }) {
  const { t } = useTranslation();
  return (
    <AdaptiveModal visible onClose={onCancel} title={t('delete.title')}>
      <View className="items-center">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <Text className="text-2xl font-black text-red-600 dark:text-red-400">!</Text>
        </View>
      </View>
      <Text className="mt-2 text-center leading-6 text-slate-600 dark:text-slate-300">{t('delete.warning', { name })}</Text>
      <Text className="text-center text-sm font-bold text-red-600 dark:text-red-400">{t('delete.permanent')}</Text>
      <View className="mt-4 flex-row gap-3">
        <View className="flex-1"><Button label={t('common.cancel')} variant="ghost" onPress={onCancel} /></View>
        <View className="flex-1"><Button label={t('delete.confirm')} variant="danger" onPress={() => void onConfirm()} /></View>
      </View>
    </AdaptiveModal>
  );
}
