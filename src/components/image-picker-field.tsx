import * as ImagePicker from 'expo-image-picker';
import { Image, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

export function ImagePickerField({ label, value, onChange }: { label: string; value: string | null; onChange: (value: string | null) => void }) {
  const { t } = useTranslation();
  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.75, base64: true });
    const asset = result.assets?.[0];
    if (!result.canceled && asset?.base64) onChange(`data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`);
  };
  return <View className="gap-2"><Text className="text-sm font-bold text-ink">{label}</Text><View className="flex-row items-center gap-4">{value ? <Image source={{ uri: value }} className="h-20 w-20 rounded-xl bg-slate-100" resizeMode="cover" /> : <View className="h-20 w-20 items-center justify-center rounded-xl bg-slate-100"><Text className="text-2xl font-black text-muted">+</Text></View>}<View className="gap-2"><Pressable onPress={() => void pick()} className="rounded-xl bg-ink px-4 py-3"><Text className="font-bold text-white">{t('images.choose')}</Text></Pressable>{value ? <Pressable onPress={() => onChange(null)}><Text className="font-bold text-red-600">{t('images.remove')}</Text></Pressable> : null}</View></View><Text className="text-xs text-muted">{t('images.stored')}</Text></View>;
}
