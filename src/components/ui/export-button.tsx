import { useTranslation } from 'react-i18next';
import { Platform, Pressable, Text } from 'react-native';

import { downloadCsv, toCsv } from '@/utils/csv';

type Props = {
  filename: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  label?: string;
};

export function ExportButton({ filename, headers, rows, label }: Props) {
  const { t } = useTranslation();
  if (Platform.OS !== 'web') return null;

  const handleExport = () => {
    const csv = toCsv(headers, rows);
    downloadCsv(filename, csv);
  };

  return (
    <Pressable onPress={handleExport} className="min-h-9 flex-row items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 touch-manipulation dark:border-slate-600 dark:bg-slate-800">
      <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">{label ?? t('dataTools.exportCsv')}</Text>
    </Pressable>
  );
}
