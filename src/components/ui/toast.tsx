import { useEffect, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

export type ToastItem = {
  id: number;
  kind: ToastKind;
  message: string;
  description?: string;
};

const config: Record<ToastKind, { icon: string; badge: string; border: string }> = {
  success: { icon: '✓', badge: 'bg-emerald-500', border: 'border-emerald-700' },
  error: { icon: '✕', badge: 'bg-red-500', border: 'border-red-700' },
  warning: { icon: '!', badge: 'bg-amber-500', border: 'border-amber-700' },
  info: { icon: 'i', badge: 'bg-sky-500', border: 'border-sky-700' },
};

export function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateX] = useState(() => new Animated.Value(24));
  const style = config[toast.kind];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: false }),
    ]).start();
  }, [opacity, translateX]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: false }),
      Animated.timing(translateX, { toValue: 24, duration: 150, useNativeDriver: false }),
    ]).start(() => onDismiss(toast.id));
  };

  return (
    <Animated.View style={{ opacity, transform: [{ translateX }] }}>
      <View className={`w-80 max-w-full flex-row items-start gap-3 rounded-xl border bg-slate-800 p-4 shadow-xl ${style.border}`}>
        <View className={`h-6 w-6 items-center justify-center rounded-full ${style.badge}`}>
          <Text className="text-xs font-black text-white">{style.icon}</Text>
        </View>
        <View className="flex-1">
          <Text className="font-bold text-white">{toast.message}</Text>
          {toast.description ? <Text className="mt-0.5 text-xs text-slate-300">{toast.description}</Text> : null}
        </View>
        <Pressable onPress={dismiss} className="h-6 w-6 items-center justify-center rounded-full active:bg-slate-700" accessibilityRole="button">
          <Text className="text-sm font-black text-slate-400">×</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}
