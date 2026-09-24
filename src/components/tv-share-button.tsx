import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';

export function TvShareButton({
  mode,
  id,
  label,
}: {
  mode: 'match' | 'tournament';
  id: string;
  label?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? `${window.location.origin}/tv/${mode === 'match' ? 'matches' : 'tournaments'}/${id}` : '';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;

  const copy = async () => {
    if (Platform.OS !== 'web') return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  if (Platform.OS !== 'web') return null;

  return (
    <>
      <Button
        variant="dark"
        icon="📺"
        label={label ?? t('tv.openTvMode')}
        onPress={() => window.open(url, '_blank', 'noopener,noreferrer')}
        onLongPress={() => setOpen(true)}
      />

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 items-center justify-center bg-slate-950/90 p-6">
          <View className="w-full max-w-sm items-center rounded-3xl border border-slate-700 bg-slate-900 p-6">
            <Text className="text-center text-2xl font-black text-white">{t('tv.shareTitle')}</Text>
            <Text className="mt-2 text-center text-sm text-slate-400" selectable>{url}</Text>
            <View className="my-5 h-52 w-52 items-center justify-center overflow-hidden rounded-2xl bg-white p-2">
              <img src={qrUrl} alt="QR" className="h-full w-full" />
            </View>
            <View className="flex-row gap-3">
              <Button className="flex-1" label={copied ? t('tv.copied') : t('tv.copyUrl')} onPress={copy} />
              <Button className="flex-1" variant="dark" label={t('common.close')} onPress={() => setOpen(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
