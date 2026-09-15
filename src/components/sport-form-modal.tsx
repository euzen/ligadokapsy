import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import type { Sport } from '@/types/database';

export function SportFormModal({ sport, onClose, onSave }: { sport?: Sport; onClose: () => void; onSave: (values: Omit<Sport, 'id'>) => Promise<void> }) {
  const { t } = useTranslation(); const [name, setName] = useState(sport?.name ?? ''); const [code, setCode] = useState(sport?.code ?? ''); const [scoring, setScoring] = useState(sport?.scoring_type ?? 'goals'); const [periods, setPeriods] = useState(sport?.periods_config ?? '{}'); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const save = async () => { setError(''); try { JSON.parse(periods); setSaving(true); await onSave({ name: name.trim(), code: code.trim().toLowerCase(), active: sport?.active ?? true, scoring_type: scoring.trim(), periods_config: periods }); onClose(); } catch (reason) { setError(reason instanceof SyntaxError ? t('sportsAdmin.invalidJson') : t(reason instanceof Error ? reason.message : 'request.failed')); } finally { setSaving(false); } };
  return <Modal visible transparent animationType="fade"><View className="flex-1 items-center justify-center bg-slate-950/80 px-4"><View className="w-full max-w-lg gap-4 rounded-2xl bg-white p-6"><Text className="text-2xl font-black text-ink">{t(sport ? 'sportsAdmin.edit' : 'sportsAdmin.create')}</Text><Field label={t('sportsAdmin.name')} value={name} onChangeText={setName} /><Field label={t('sportsAdmin.code')} value={code} onChangeText={setCode} autoCapitalize="none" /><Field label={t('sportsAdmin.scoring')} value={scoring} onChangeText={setScoring} /><Field label={t('sportsAdmin.periods')} value={periods} onChangeText={setPeriods} multiline />{error ? <Text className="font-bold text-red-600">{error}</Text> : null}<View className="flex-row gap-3"><View className="flex-1"><Button label={t('common.cancel')} variant="ghost" onPress={onClose} /></View><View className="flex-1"><Button label={t('common.save')} onPress={() => void save()} loading={saving} disabled={!name || !code || !scoring} /></View></View></View></View></Modal>;
}
