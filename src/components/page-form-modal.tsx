import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Switch, Text, TextInput, View } from 'react-native';

import { AdaptiveModal } from '@/components/mobile-bottom-sheet';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import type { Page, PageCategory } from '@/types/database';

const categories: PageCategory[] = ['legal', 'faq', 'guide'];

export function PageFormModal({ page, onClose, onSave }: { page?: Page | null; onClose: () => void; onSave: (values: { slug: string; title: string; content: string; category: PageCategory; is_published: boolean; order_index: number }) => Promise<void> }) {
  const { t } = useTranslation();
  const [slug, setSlug] = useState(page?.slug ?? '');
  const [title, setTitle] = useState(page?.title ?? '');
  const [content, setContent] = useState(page?.content ?? '');
  const [category, setCategory] = useState<PageCategory>(page?.category ?? 'faq');
  const [isPublished, setIsPublished] = useState(page?.is_published ?? false);
  const [orderIndex, setOrderIndex] = useState(page?.order_index?.toString() ?? '0');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!slug.trim() || !title.trim()) { setError(t('validation.required')); return; }
    setSaving(true); setError('');
    try {
      await onSave({ slug: slug.trim(), title: title.trim(), content: content.trim(), category, is_published: isPublished, order_index: Number(orderIndex) || 0 });
      onClose();
    } catch (reason) {
      setError(t(reason instanceof Error ? reason.message : 'request.failed'));
    } finally {
      setSaving(false);
    }
  };

  const body = (
    <View className="gap-4">
      <Field label={t('pagesAdmin.slug')} value={slug} onChangeText={setSlug} placeholder="faq" />
      <Field label={t('pagesAdmin.title')} value={title} onChangeText={setTitle} placeholder={t('pagesAdmin.titlePlaceholder')} />
      <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('pagesAdmin.category')}</Text>
      <View className="flex-row flex-wrap gap-2">
        {categories.map((cat) => (
          <Button key={cat} label={t(`pagesAdmin.categories.${cat}`)} size="sm" variant={category === cat ? 'primary' : 'ghost'} onPress={() => setCategory(cat)} />
        ))}
      </View>
      <Field label={t('pagesAdmin.order')} value={orderIndex} onChangeText={setOrderIndex} keyboardType="number-pad" />
      <View className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
        <Text className="font-bold text-slate-900 dark:text-white">{t('pagesAdmin.published')}</Text>
        <Switch value={isPublished} onValueChange={setIsPublished} />
      </View>
      <Text className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('pagesAdmin.content')}</Text>
      <TextInput
        multiline
        textAlignVertical="top"
        value={content}
        onChangeText={setContent}
        className="min-h-48 rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
        placeholder={t('pagesAdmin.contentPlaceholder')}
      />
      {error ? <Text className="rounded-xl bg-red-50 p-3 font-bold text-red-600 dark:bg-red-900/50 dark:text-red-200">{error}</Text> : null}
      <View className="flex-row gap-2">
        <Button label={t('common.cancel')} variant="ghost" onPress={onClose} />
        <Button label={saving ? t('common.saving') : t('common.save')} onPress={() => void save()} disabled={saving} />
      </View>
    </View>
  );

  return (
    <AdaptiveModal visible title={page ? t('pagesAdmin.edit') : t('pagesAdmin.create')} onClose={onClose}>
      <ScrollView className="max-h-[60vh]">{body}</ScrollView>
    </AdaptiveModal>
  );
}
