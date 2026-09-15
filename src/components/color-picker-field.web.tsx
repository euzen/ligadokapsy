import { createElement } from 'react';
import { Text, View } from 'react-native';

export function ColorPickerField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <View className="gap-2"><Text className="text-sm font-bold text-ink">{label}</Text><View className="flex-row items-center gap-4 rounded-xl border border-slate-300 bg-white p-3">{createElement('input', { type: 'color', value, onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value.toUpperCase()), 'aria-label': label, style: { width: 64, height: 44, border: 0, padding: 0, background: 'transparent', cursor: 'pointer' } })}<View style={{ backgroundColor: value }} className="h-11 w-11 rounded-xl" /><Text className="font-mono font-black text-ink">{value.toUpperCase()}</Text></View></View>;
}
