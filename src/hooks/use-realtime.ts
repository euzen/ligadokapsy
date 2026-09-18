import { useEffect, useState } from 'react';

import { supabase } from '@/features/auth/supabase-db';

type Status = 'SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR' | 'TIMED_OUT';

export function useRealtimeStatus() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    if (typeof window !== 'undefined') {
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
      }
    };
  }, []);

  return { online };
}

export function useRealtimeChannel<T>(
  channelName: string,
  tables: { table: string; filter?: string; onEvent: (payload: { eventType: string; new: T; old: T }) => void }[]
) {
  const [status, setStatus] = useState<Status>('CLOSED');

  useEffect(() => {
    const channel = supabase.channel(channelName);

    for (const { table, filter, onEvent } of tables) {
      channel.on(
        'postgres_changes' as never,
        { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) } as never,
        (payload: any) => {
          onEvent({
            eventType: payload.eventType as string,
            new: payload.new as T,
            old: payload.old as T,
          });
        }
      );
    }

    channel.subscribe((newStatus) => {
      setStatus(newStatus as Status);
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [channelName, tables]);

  return status;
}
