import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

export function useWakeLock() {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!('wakeLock' in navigator)) return;

    const request = async () => {
      try {
        lockRef.current = await navigator.wakeLock.request('screen');
      } catch {
        // Wake lock may be denied (e.g. already locked by OS) — ignore silently
      }
    };

    void request();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !lockRef.current) {
        void request();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (lockRef.current) {
        void lockRef.current.release();
        lockRef.current = null;
      }
    };
  }, []);
}
