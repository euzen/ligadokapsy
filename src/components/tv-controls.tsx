import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, Pressable, Text, View } from 'react-native';

function useFullscreen() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = () => setActive(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggle = useCallback(async () => {
    if (Platform.OS !== 'web') return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Fullscreen may be blocked by the browser — ignore
    }
  }, []);

  return { active, toggle };
}

export function TvControls({
  publicUrl,
  showRotation = false,
  rotationPaused = false,
  onToggleRotation,
}: {
  publicUrl: string;
  showRotation?: boolean;
  rotationPaused?: boolean;
  onToggleRotation?: () => void;
}) {
  const { t } = useTranslation();
  const { active: fullscreenActive, toggle: toggleFullscreen } = useFullscreen();
  const [showQr, setShowQr] = useState(false);
  const [visible, setVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const hide = () => { timer = setTimeout(() => setVisible(false), 3000); };
    hide();
    const move = () => {
      if (timer) clearTimeout(timer);
      setVisible(true);
      hide();
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('click', move);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('click', move);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const copyUrl = async () => {
    if (Platform.OS !== 'web') return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Ignore copy failures
    }
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(publicUrl)}`;

  if (Platform.OS !== 'web') return null;

  return (
    <>
      <View
        pointerEvents="box-none"
        className={`absolute bottom-6 right-6 z-50 transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
        style={Platform.OS === 'web' ? { position: 'fixed' as never } : undefined}
      >
        <View className="flex-row items-center gap-2 rounded-full border border-slate-700 bg-slate-900/90 px-3 py-2 shadow-xl backdrop-blur">
          <Pressable onPress={toggleFullscreen} className="h-10 items-center justify-center rounded-full bg-slate-800 px-3">
            <Text className="text-sm font-bold text-white">{fullscreenActive ? t('tv.exitFullscreen') : t('tv.fullscreen')}</Text>
          </Pressable>
          {showRotation ? (
            <Pressable onPress={onToggleRotation} className="h-10 items-center justify-center rounded-full bg-slate-800 px-3">
              <Text className="text-sm font-bold text-white">{rotationPaused ? t('tv.playRotation') : t('tv.pauseRotation')}</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => setShowQr(true)} className="h-10 items-center justify-center rounded-full bg-brand px-3">
            <Text className="text-sm font-bold text-white">{t('tv.share')}</Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={showQr} transparent animationType="fade" onRequestClose={() => setShowQr(false)}>
        <View className="flex-1 items-center justify-center bg-slate-950/90 p-6">
          <View className="w-full max-w-sm items-center rounded-3xl border border-slate-700 bg-slate-900 p-6">
            <Text className="text-center text-2xl font-black text-white">{t('tv.shareTitle')}</Text>
            <Text className="mt-2 text-center text-sm text-slate-400">{publicUrl}</Text>
            <View className="my-5 h-60 w-60 items-center justify-center overflow-hidden rounded-2xl bg-white p-2">
              <img src={qrUrl} alt="QR" className="h-full w-full" />
            </View>
            <View className="flex-row gap-3">
              <Pressable onPress={copyUrl} className="flex-1 items-center justify-center rounded-xl bg-brand py-3">
                <Text className="font-bold text-white">{copied ? t('tv.copied') : t('tv.copyUrl')}</Text>
              </Pressable>
              <Pressable onPress={() => setShowQr(false)} className="items-center justify-center rounded-xl bg-slate-800 px-5 py-3">
                <Text className="font-bold text-white">{t('common.close')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
