import { Picker } from '@react-native-picker/picker';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { updateLocalUser } from '@/features/auth/local-db';
import type { AppRole, UserProfile } from '@/types/database';

export function RolePicker({ user }: { user: UserProfile }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const change = async (role: AppRole) => {
    if (role === user.role) return;
    setSaving(true); setError('');
    try { await updateLocalUser(user.id, { role }); } catch (reason) { setError(t(reason instanceof Error ? reason.message : 'request.failed')); } finally { setSaving(false); }
  };
  return <View className="min-w-44"><Text className="mb-1 text-xs font-black uppercase tracking-wide text-muted">{saving ? t('admin.roleSaving') : t('admin.roleSelect')}</Text><View className="overflow-hidden rounded-xl border border-slate-300 bg-white"><Picker selectedValue={user.role} onValueChange={(value) => void change(value)} enabled={!saving} style={{ height: 46, color: '#0F172A' }}><Picker.Item label={t('profile.user')} value="user" /><Picker.Item label={t('profile.admin')} value="admin" /></Picker></View>{error ? <Text className="mt-1 text-xs font-bold text-red-600">{error}</Text> : null}</View>;
}
