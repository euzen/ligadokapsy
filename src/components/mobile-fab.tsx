import { Pressable, Text, View } from 'react-native';

type Props = { label: string; onPress: () => void };

export function MobileFAB({ label, onPress }: Props) {
  return (
    <View className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex-row justify-end p-4 pb-safe md:hidden">
      <Pressable onPress={onPress} className="pointer-events-auto min-h-14 min-w-14 items-center justify-center rounded-full bg-brand px-5 shadow-lg active:opacity-90 touch-manipulation">
        <Text className="text-sm font-black text-white">{label}</Text>
      </Pressable>
    </View>
  );
}
