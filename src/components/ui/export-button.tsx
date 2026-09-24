import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-provider';
import { downloadCsv, toCsv } from '@/utils/csv';

type Props = {
  filename: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  label?: string;
};

export function ExportButton({ filename, headers, rows, label }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  if (Platform.OS !== 'web') return null;

  const handleExport = () => {
    const csv = toCsv(headers, rows);
    downloadCsv(filename, csv);
    toast.success(t('toast.exported'));
  };

  return (
    <Button label={label ?? t('dataTools.exportCsv')} variant="ghost" size="sm" onPress={handleExport} />
  );
}
