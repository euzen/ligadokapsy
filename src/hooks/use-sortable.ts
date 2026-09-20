import { useCallback, useMemo, useState } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export type SortState<K extends string = string> = {
  key: K | null;
  direction: SortDirection;
};

export function useSortable<T, K extends string = string>(
  data: T[],
  comparators: Record<K, (a: T, b: T) => number>,
) {
  const [sort, setSort] = useState<SortState<K>>({ key: null, direction: null });

  const toggle = useCallback((key: K) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return { key: null, direction: null };
    });
  }, []);

  const sorted = useMemo(() => {
    if (!sort.key || !sort.direction) return data;
    const cmp = comparators[sort.key];
    if (!cmp) return data;
    const dir = sort.direction === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => cmp(a, b) * dir);
  }, [data, sort, comparators]);

  return { sorted, sort, toggle };
}
