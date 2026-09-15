import { Text, TextInput, type TextInputProps, View } from 'react-native';

type Props = TextInputProps & { label: string; error?: string };

export function Field({ label, error, ...props }: Props) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-ink">{label}</Text>
      <TextInput className="min-h-12 rounded-xl border border-gray-300 bg-white px-4 text-base text-ink outline-none focus:border-brand" placeholderTextColor="#8A948E" {...props} />
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
    </View>
  );
}
