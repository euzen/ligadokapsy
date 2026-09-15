import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { ImagePickerField } from '@/components/image-picker-field';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { favoriteSports } from '@/features/auth/constants';
import type { EditableProfile, UserProfile } from '@/types/database';

export function EditProfileModal({ profile, onClose, onSave }: { profile: UserProfile; onClose: () => void; onSave: (values: EditableProfile) => Promise<void> }) {
  const { t } = useTranslation();
  const [name, setName] = useState(profile.displayName);
  const [email, setEmail] = useState(profile.email);
  const [sport, setSport] = useState(profile.favoriteSport);
  const [avatar, setAvatar] = useState<string | null>(profile.avatarUrl);
  const [color, setColor] = useState(profile.profileColor);
  const [language, setLanguage] = useState<'cs' | 'en'>(profile.language);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async () => { setError(''); setSaving(true); try { await onSave({ displayName: name.trim(), email: email.trim(), favoriteSport: sport, avatarUrl: avatar, profileColor: color, language }); onClose(); } catch (reason) { setError(t(reason instanceof Error ? reason.message : 'request.failed')); } finally { setSaving(false); } };
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View className="flex-1 items-center justify-center bg-slate-950/80 px-4"><ScrollView className="max-h-[90%] w-full max-w-lg rounded-2xl bg-white" contentContainerClassName="gap-5 p-6"><View className="flex-row items-center justify-between"><Text className="text-2xl font-black text-ink">{t('profile.edit')}</Text><Pressable onPress={onClose} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"><Text className="text-xl font-black text-ink">×</Text></Pressable></View><Field label={t('profile.name')} value={name} onChangeText={setName} /><Field label={t('profile.email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" /><View className="gap-2"><Text className="text-sm font-bold text-ink">{t('profile.favoriteSport')}</Text><View className="flex-row flex-wrap gap-2">{favoriteSports.map((item) => <Pressable key={item} onPress={() => setSport(item)} className={`rounded-xl px-4 py-3 ${sport === item ? 'bg-brand' : 'bg-slate-100'}`}><Text className={sport === item ? 'font-bold text-white' : 'font-bold text-ink'}>{t(`sports.${item}`)}</Text></Pressable>)}</View></View><ImagePickerField label={t('profile.avatar')} value={avatar} onChange={setAvatar} /><Field label={t('profile.color')} value={color} onChangeText={setColor} autoCapitalize="characters" /><View className="gap-2"><Text className="text-sm font-bold text-ink">{t('profile.language')}</Text><View className="flex-row gap-2">{(['cs', 'en'] as const).map((item) => <Pressable key={item} onPress={() => setLanguage(item)} className={`flex-1 rounded-xl p-3 ${language === item ? 'bg-brand' : 'bg-slate-100'}`}><Text className={`text-center font-black ${language === item ? 'text-white' : 'text-ink'}`}>{item === 'cs' ? 'CS' : 'EN'}</Text></Pressable>)}</View></View>{error ? <Text className="text-sm font-bold text-red-600">{error}</Text> : null}<View className="flex-row gap-3"><View className="flex-1"><Button label={t('common.cancel')} variant="ghost" onPress={onClose} /></View><View className="flex-1"><Button label={t('profile.save')} onPress={() => void save()} loading={saving} disabled={name.length < 2 || !email.includes('@') || !/^#[0-9A-Fa-f]{6}$/.test(color)} /></View></View></ScrollView></View></Modal>;
}
