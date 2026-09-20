import { createElement } from 'react';
import { Text, useColorScheme, View } from 'react-native';

export function DatePickerField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-slate-900 dark:text-white">{label}</Text>
      {createElement('input', {
        type: 'date',
        value,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value),
        style: {
          minHeight: 48,
          borderRadius: 12,
          border: dark ? '1px solid #475569' : '1px solid #CBD5E1',
          padding: '0 16px',
          color: dark ? '#FFFFFF' : '#0F172A',
          fontSize: 16,
          backgroundColor: dark ? '#1E293B' : '#FFFFFF',
          colorScheme: dark ? 'dark' : 'light',
          outline: 'none',
        },
      })}
    </View>
  );
}
