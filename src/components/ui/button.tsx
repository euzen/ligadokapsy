import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'dark' | 'danger';
type ButtonSize = 'sm' | 'md';

type Props = {
  label: string;
  onPress: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  className?: string;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white',
  secondary: 'bg-emerald-500 text-white',
  ghost: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white',
  dark: 'bg-slate-800 text-white',
  danger: 'bg-red-600 text-white',
};

const textClasses: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-white',
  ghost: 'text-slate-900 dark:text-white',
  dark: 'text-white',
  danger: 'text-white',
};

export function Button({ label, onPress, onLongPress, disabled, loading, variant = 'primary', size = 'md', icon, className = '' }: Props) {
  const palette = variantClasses[variant];
  const text = textClasses[variant];
  const sizeClasses = size === 'sm' ? 'min-h-9 px-3' : 'min-h-12 px-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <Pressable
      className={`${sizeClasses} min-w-11 flex-row items-center justify-center gap-2 rounded-xl touch-manipulation ${palette} ${disabled ? 'opacity-50' : ''} ${className}`}
      disabled={disabled || loading}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? '#0F172A' : '#fff'} />
      ) : (
        <>
          {icon ? <View>{icon}</View> : null}
          <Text className={`${textSize} font-bold ${text}`}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}
