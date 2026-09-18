import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/providers/auth-provider';

type ThemeMode = 'light' | 'dark';
type ThemePreference = 'system' | ThemeMode;

type ThemeContextValue = {
  theme: ThemeMode;
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveSystem(): ThemeMode {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [localPreference, setLocalPreference] = useState<ThemePreference | null>(null);

  const preference = localPreference ?? profile?.themePreference ?? 'dark';
  const theme: ThemeMode = preference === 'system' ? resolveSystem() : preference;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  const setPreference = (value: ThemePreference) => {
    setLocalPreference(value);
  };

  const value = useMemo<ThemeContextValue>(() => ({ theme, preference, setPreference }), [theme, preference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
