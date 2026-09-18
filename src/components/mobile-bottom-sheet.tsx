import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

export function AdaptiveModal({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const isMobile = useIsMobile();
  if (!isMobile) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View className="flex-1 items-center justify-center bg-slate-950/80 px-4">
          <ScrollView className="max-h-[90%] w-full max-w-lg rounded-2xl bg-white dark:bg-slate-800" contentContainerClassName="gap-4 p-6">
            <View className="flex-row items-center justify-between">
              <Text className="text-2xl font-black text-slate-900 dark:text-white">{title}</Text>
              <Pressable onPress={onClose} className="min-h-11 min-w-11 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 touch-manipulation">
                <Text className="text-xl font-black text-slate-900 dark:text-white">×</Text>
              </Pressable>
            </View>
            {children}
          </ScrollView>
        </View>
      </Modal>
    );
  }
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-slate-950/60" onStartShouldSetResponder={() => { onClose(); return true; }}>
        <View className="max-h-[85%] rounded-t-3xl bg-white px-4 pb-8 pt-3 shadow-2xl dark:bg-slate-800 safe-bottom" onStartShouldSetResponder={() => true}>
          <View className="mb-4 self-center h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-600" />
          <ScrollView contentContainerClassName="gap-4 pb-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-black text-slate-900 dark:text-white">{title}</Text>
              <Pressable onPress={onClose} className="min-h-11 min-w-11 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 touch-manipulation">
                <Text className="text-xl font-black text-slate-900 dark:text-white">×</Text>
              </Pressable>
            </View>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
