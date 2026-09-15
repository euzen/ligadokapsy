import { Image, Text, View } from 'react-native';

export function TournamentLogo({ value, name, size = 'large' }: { value: string | null; name: string; size?: 'small' | 'large' }) {
  const classes = size === 'small' ? 'h-12 w-12 rounded-xl' : 'h-24 w-24 rounded-2xl';
  return value ? <Image source={{ uri: value }} className={`${classes} bg-slate-100`} resizeMode="cover" /> : <View className={`${classes} items-center justify-center bg-emerald-500/20`}><Text className={`${size === 'small' ? 'text-lg' : 'text-3xl'} font-black text-emerald-500`}>{name.slice(0, 2).toUpperCase()}</Text></View>;
}
