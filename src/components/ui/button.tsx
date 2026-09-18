import { ActivityIndicator, Pressable, Text } from 'react-native';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function Button({ label, onPress, disabled, loading, variant = 'primary' }: Props) {
  const palette = variant === 'primary' ? 'bg-brand' : variant === 'secondary' ? 'bg-lime dark:bg-emerald-600' : 'bg-transparent border border-slate-300 dark:border-slate-600';
  const text = variant === 'primary' ? 'text-white' : variant === 'secondary' ? 'text-slate-900 dark:text-white' : 'text-slate-900 dark:text-white';
  return (
    <Pressable className={`min-h-12 min-w-11 items-center justify-center rounded-xl px-5 touch-manipulation ${palette} ${disabled ? 'opacity-50' : ''}`} disabled={disabled || loading} onPress={onPress}>
      {loading ? <ActivityIndicator color={variant === 'primary' ? '#fff' : '#0F172A'} /> : <Text className={`font-semibold ${text}`}>{label}</Text>}
    </Pressable>
  );
}
