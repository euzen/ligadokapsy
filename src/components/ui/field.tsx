import { Text, TextInput, type TextInputProps, View } from 'react-native';

type Props = TextInputProps & { label: string; error?: string };

export function Field({ label, error, ...props }: Props) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-slate-900 dark:text-white">{label}</Text>
      <TextInput
        className="min-h-12 min-w-11 rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 outline-none focus:border-brand dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        placeholderTextColor="#94a3b8"
        {...props}
      />
      {error ? <Text className="text-sm text-red-600 dark:text-red-400">{error}</Text> : null}
    </View>
  );
}
