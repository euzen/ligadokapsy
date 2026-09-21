import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ToastCard, type ToastItem, type ToastKind } from '@/components/ui/toast';

type ToastApi = {
  success: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
  warning: (message: string, description?: string) => void;
  info: (message: string, description?: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const AUTO_DISMISS_MS = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const insets = useSafeAreaInsets();

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, message: string, description?: string) => {
    const id = nextId.current++;
    setToasts((current) => [...current.slice(-4), { id, kind, message, description }]);
    // Errors persist until manually dismissed
    if (kind !== 'error') {
      timers.current.set(id, setTimeout(() => dismiss(id), AUTO_DISMISS_MS));
    }
  }, [dismiss]);

  const api = useMemo<ToastApi>(() => ({
    success: (message, description) => push('success', message, description),
    error: (message, description) => push('error', message, description),
    warning: (message, description) => push('warning', message, description),
    info: (message, description) => push('info', message, description),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <View
        pointerEvents="box-none"
        className="absolute right-0 top-0 z-50 gap-2 p-4"
        style={Platform.OS === 'web' ? { position: 'fixed' as never, top: 0, right: 0 } : { top: insets.top, right: 0 }}
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
