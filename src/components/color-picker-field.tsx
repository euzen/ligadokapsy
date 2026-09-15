import { Pressable, Text, View } from 'react-native';

const colors = ['#10B981', '#0EA5E9', '#2563EB', '#7C3AED', '#EC4899', '#EF4444', '#F59E0B', '#84CC16', '#0F172A', '#64748B'];

export function ColorPickerField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <View className="gap-3"><Text className="text-sm font-bold text-ink">{label}</Text><View className="flex-row flex-wrap gap-3">{colors.map((color) => <Pressable key={color} onPress={() => onChange(color)} accessibilityLabel={color} style={{ backgroundColor: color }} className={`h-12 w-12 items-center justify-center rounded-xl ${value === color ? 'border-4 border-white outline outline-2 outline-emerald-500' : ''}`}>{value === color ? <Text className="font-black text-white">✓</Text> : null}</Pressable>)}</View><View className="flex-row items-center gap-3"><View style={{ backgroundColor: value }} className="h-9 w-9 rounded-lg" /><Text className="font-mono font-black text-ink">{value}</Text></View></View>;
}
