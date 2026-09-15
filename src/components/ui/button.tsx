import { ActivityIndicator, Pressable, Text } from 'react-native';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function Button({ label, onPress, disabled, loading, variant = 'primary' }: Props) {
  const palette = variant === 'primary' ? 'bg-brand' : variant === 'secondary' ? 'bg-lime' : 'bg-transparent border border-gray-300';
  const text = variant === 'primary' ? 'text-white' : 'text-ink';
  return (
    <Pressable className={`min-h-12 items-center justify-center rounded-xl px-5 ${palette} ${disabled ? 'opacity-50' : ''}`} disabled={disabled || loading} onPress={onPress}>
      {loading ? <ActivityIndicator color={variant === 'primary' ? '#fff' : '#0F172A'} /> : <Text className={`font-semibold ${text}`}>{label}</Text>}
    </Pressable>
  );
}
