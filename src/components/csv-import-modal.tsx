import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { useToast } from '@/components/ui/toast-provider';
import { parseCsv } from '@/utils/csv';

type ColumnDef = {
  key: string;
  label: string;
  required?: boolean;
  validate?: (value: string) => boolean;
};

type Props = {
  title: string;
  columns: ColumnDef[];
  templateFilename: string;
  onImport: (rows: Record<string, string>[]) => void | Promise<void>;
  onClose: () => void;
};

type ParsedRow = {
  data: Record<string, string>;
  errors: string[];
};

export function CsvImportModal({ title, columns, templateFilename, onImport, onClose }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFileSelect = useCallback(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.txt';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        if (text) setRawText(text);
      };
      reader.readAsText(file, 'UTF-8');
    };
    input.click();
  }, []);

  const handleParse = useCallback(() => {
    const { headers, rows } = parseCsv(rawText);
    const colMap = new Map<number, ColumnDef>();
    for (const col of columns) {
      const idx = headers.findIndex((h) => h.toLowerCase().replace(/\s/g, '_') === col.key.toLowerCase() || h.toLowerCase() === col.label.toLowerCase());
      if (idx >= 0) colMap.set(idx, col);
    }
    // Fallback: map by position if no headers matched
    if (colMap.size === 0) {
      columns.forEach((col, i) => colMap.set(i, col));
    }

    const result: ParsedRow[] = rows.map((cells) => {
      const data: Record<string, string> = {};
      const errors: string[] = [];
      for (const [idx, col] of colMap.entries()) {
        const val = (cells[idx] ?? '').trim();
        data[col.key] = val;
        if (col.required && !val) errors.push(`${col.label}: ${t('dataTools.fieldRequired')}`);
        if (val && col.validate && !col.validate(val)) errors.push(`${col.label}: ${t('dataTools.invalidValue')}`);
      }
      return { data, errors };
    });
    setParsed(result);
  }, [rawText, columns, t]);

  const handleConfirm = async () => {
    if (!parsed) return;
    const valid = parsed.filter((r) => r.errors.length === 0);
    if (valid.length === 0) return;
    setImporting(true);
    try {
      await onImport(valid.map((r) => r.data));
      toast.success(t('toast.imported', { count: valid.length }));
      onClose();
    } catch (reason) {
      toast.error(t('toast.importFailed'), reason instanceof Error ? reason.message : undefined);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = useCallback(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const header = columns.map((c) => c.label).join(',');
    const sample = columns.map((c) => c.required ? `${c.label}1` : '').join(',');
    const csv = `\uFEFF${header}\r\n${sample}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = templateFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [columns, templateFilename]);

  const errorCount = parsed?.filter((r) => r.errors.length > 0).length ?? 0;
  const validCount = (parsed?.length ?? 0) - errorCount;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-slate-950/80 px-4">
        <View className="w-full max-w-2xl rounded-2xl bg-white p-6 dark:bg-slate-900" style={{ maxHeight: '90%' }}>
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-black text-slate-900 dark:text-white">{title}</Text>
            <Pressable onPress={onClose} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Text className="text-xl font-black text-slate-900 dark:text-white">×</Text>
            </Pressable>
          </View>

          {!parsed ? (
            <View className="mt-4 gap-3">
              <Text className="text-sm text-slate-500 dark:text-slate-400">{t('dataTools.importHint')}</Text>
              <View className="flex-row gap-2">
                <Pressable onPress={handleFileSelect} className="rounded-lg bg-brand px-4 py-2">
                  <Text className="text-sm font-bold text-white">{t('dataTools.selectFile')}</Text>
                </Pressable>
                <Pressable onPress={downloadTemplate} className="rounded-lg border border-slate-200 px-4 py-2 dark:border-slate-600">
                  <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('dataTools.downloadTemplate')}</Text>
                </Pressable>
              </View>
              {rawText ? (
                <View className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                  <Text className="text-xs text-slate-500 dark:text-slate-400" numberOfLines={3}>{rawText.slice(0, 500)}</Text>
                </View>
              ) : null}
              {rawText ? (
                <Pressable onPress={handleParse} className="self-start rounded-lg bg-emerald-600 px-4 py-2">
                  <Text className="text-sm font-bold text-white">{t('dataTools.parsePreview')}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View className="mt-4 gap-3">
              <View className="flex-row gap-3">
                <View className="rounded-lg bg-emerald-100 px-3 py-1 dark:bg-emerald-900">
                  <Text className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{t('dataTools.validRows', { count: validCount })}</Text>
                </View>
                {errorCount > 0 ? (
                  <View className="rounded-lg bg-red-100 px-3 py-1 dark:bg-red-900">
                    <Text className="text-xs font-bold text-red-700 dark:text-red-300">{t('dataTools.errorRows', { count: errorCount })}</Text>
                  </View>
                ) : null}
              </View>

              <ScrollView style={{ maxHeight: 300 }} className="rounded-lg border border-slate-200 dark:border-slate-700">
                <View className="flex-row border-b border-slate-200 bg-slate-50 px-2 py-2 dark:border-slate-700 dark:bg-slate-800">
                  <Text className="w-8 text-[10px] font-black text-slate-500">#</Text>
                  {columns.map((col) => (
                    <Text key={col.key} className="min-w-[80px] flex-1 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">{col.label}</Text>
                  ))}
                  <Text className="w-20 text-[10px] font-black text-slate-500 dark:text-slate-400">Status</Text>
                </View>
                {parsed.map((row, i) => (
                  <View key={i} className={`flex-row border-b border-slate-100 px-2 py-1.5 dark:border-slate-700 ${row.errors.length > 0 ? 'bg-red-50 dark:bg-red-950' : ''}`}>
                    <Text className="w-8 text-xs text-slate-400">{i + 1}</Text>
                    {columns.map((col) => (
                      <Text key={col.key} className="min-w-[80px] flex-1 text-xs text-slate-900 dark:text-white" numberOfLines={1}>{row.data[col.key] ?? ''}</Text>
                    ))}
                    <Text className={`w-20 text-[10px] font-bold ${row.errors.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {row.errors.length > 0 ? row.errors[0] : 'OK'}
                    </Text>
                  </View>
                ))}
              </ScrollView>

              <View className="flex-row gap-2">
                <Pressable onPress={() => setParsed(null)} className="rounded-lg border border-slate-200 px-4 py-2 dark:border-slate-600">
                  <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('common.back')}</Text>
                </Pressable>
                <Pressable onPress={() => void handleConfirm()} disabled={validCount === 0 || importing} className={`rounded-lg bg-brand px-4 py-2 ${validCount === 0 || importing ? 'opacity-50' : ''}`}>
                  <Text className="text-sm font-bold text-white">{importing ? t('common.loading') : t('dataTools.confirmImport', { count: validCount })}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
