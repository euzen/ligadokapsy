import { Modal, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

export function ConfirmDeleteModal({ name, onCancel, onConfirm }: { name: string; onCancel: () => void; onConfirm: () => Promise<void> }) {
  const { t } = useTranslation();
  return <Modal visible transparent animationType="fade" onRequestClose={onCancel}><View className="flex-1 items-center justify-center bg-slate-950/80 px-4"><View className="w-full max-w-md rounded-2xl bg-white p-6"><View className="h-12 w-12 items-center justify-center rounded-full bg-red-100"><Text className="text-2xl font-black text-red-600">!</Text></View><Text className="mt-5 text-2xl font-black text-ink">{t('delete.title')}</Text><Text className="mt-3 leading-6 text-muted">{t('delete.warning', { name })}</Text><Text className="mt-3 text-sm font-bold text-red-600">{t('delete.permanent')}</Text><View className="mt-6 flex-row gap-3"><View className="flex-1"><Button label={t('common.cancel')} variant="ghost" onPress={onCancel} /></View><Pressable onPress={() => void onConfirm()} className="min-h-12 flex-1 items-center justify-center rounded-xl bg-red-600 px-5"><Text className="font-black text-white">{t('delete.confirm')}</Text></Pressable></View></View></View></Modal>;
}
