import { useCallback, useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';

type Props = {
  text: string;
  children: React.ReactNode;
};

export function Tooltip({ text, children }: Props) {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    timer.current = setTimeout(() => setVisible(true), 300);
  }, []);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setVisible(false);
  }, []);

  if (Platform.OS !== 'web') {
    // On native, tooltips are not practical — just render children
    return <>{children}</>;
  }

  return (
    <View
      // @ts-expect-error -- web-only mouse events
      onMouseEnter={show}
      onMouseLeave={hide}
      className="relative"
    >
      {children}
      {visible ? (
        <View className="absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2" style={{ minWidth: 120 }}>
          <View className="rounded-lg bg-slate-900 px-3 py-1.5 shadow-lg dark:bg-slate-700">
            <Text className="text-center text-xs text-white">{text}</Text>
          </View>
          <View className="mx-auto h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-slate-900 dark:border-t-slate-700" />
        </View>
      ) : null}
    </View>
  );
}
