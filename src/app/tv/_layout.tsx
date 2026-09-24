import { Slot } from 'expo-router';
import { Platform, View } from 'react-native';

import { useWakeLock } from '@/hooks/use-wake-lock';

export default function TvLayout() {
  useWakeLock();

  return (
    <View className="flex-1 bg-slate-950 dark">
      <Slot />
      {Platform.OS === 'web' ? <style>{`html, body { background-color: #020617; }`}</style> : null}
    </View>
  );
}
