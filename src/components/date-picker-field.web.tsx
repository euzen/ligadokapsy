import { createElement } from 'react';
import { Text, View } from 'react-native';

export function DatePickerField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <View className="gap-2"><Text className="text-sm font-bold text-ink">{label}</Text>{createElement('input', { type: 'date', value, onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value), style: { minHeight: 48, borderRadius: 12, border: '1px solid #CBD5E1', padding: '0 16px', color: '#0F172A', fontSize: 16, backgroundColor: '#FFFFFF' } })}</View>;
}
