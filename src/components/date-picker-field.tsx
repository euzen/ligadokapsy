import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

export function DatePickerField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-slate-900 dark:text-white">{label}</Text>
      <Pressable onPress={() => setOpen(true)} className="min-h-12 justify-center rounded-xl border border-slate-300 bg-white px-4 dark:border-slate-600 dark:bg-slate-800">
        <Text className="text-base text-slate-900 dark:text-white">{value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(date) : '—'}</Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(_event, selected) => {
            if (Platform.OS !== 'ios') setOpen(false);
            if (selected) onChange(selected.toISOString().slice(0, 10));
          }}
        />
      ) : null}
    </View>
  );
}
