import { Image, Text, View } from 'react-native';

export function TournamentLogo({ value, name, size = 'large' }: { value: string | null; name: string; size?: 'small' | 'large' }) {
  const classes = size === 'small' ? 'h-14 w-14 rounded-2xl' : 'h-24 w-24 rounded-2xl';
  return value ? (
    <Image source={{ uri: value }} className={`${classes} bg-slate-700`} resizeMode="cover" />
  ) : (
    <View className={`${classes} items-center justify-center bg-emerald-500/20`}>
      <Text className={`${size === 'small' ? 'text-2xl' : 'text-3xl'}`}>🏆</Text>
    </View>
  );
}
