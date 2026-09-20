import { Pressable, Text, View } from 'react-native';

import type { SortDirection } from '@/hooks/use-sortable';

type Props = {
  label: string;
  active: boolean;
  direction: SortDirection;
  onPress: () => void;
  className?: string;
};

function SortArrow({ direction }: { direction: SortDirection }) {
  if (!direction) return <Text className="ml-0.5 text-[8px] text-slate-300 dark:text-slate-600">⇅</Text>;
  return <Text className="ml-0.5 text-[8px] text-brand">{direction === 'asc' ? '▲' : '▼'}</Text>;
}

export function SortableHeader({ label, active, direction, onPress, className = '' }: Props) {
  return (
    <Pressable onPress={onPress} className={`flex-row items-center touch-manipulation ${className}`}>
      <Text className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">{label}</Text>
      <View className="ml-0.5">
        <SortArrow direction={active ? direction : null} />
      </View>
    </Pressable>
  );
}
