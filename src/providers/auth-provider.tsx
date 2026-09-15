import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { restoreLocalSession, signInLocal, signOutLocal, signUpLocal, subscribeLocalUsers, updateLocalUser } from '@/features/auth/local-db';
import i18n from '@/lib/i18n';
import type { EditableProfile, UserProfile } from '@/types/database';

type AuthContextValue = {
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (displayName: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (values: EditableProfile) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const refresh = () => { void restoreLocalSession().then((next) => { if (active) { setProfile(next); if (next?.language) void i18n.changeLanguage(next.language); setLoading(false); } }); };
    refresh();
    const unsubscribe = subscribeLocalUsers(refresh);
    return () => { active = false; unsubscribe(); };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    profile,
    loading,
    signIn: async (email, password) => { const next = await signInLocal(email, password); setProfile(next); await i18n.changeLanguage(next.language); },
    signUp: async (displayName, email, password) => { const next = await signUpLocal(displayName, email, password); setProfile(next); await i18n.changeLanguage(next.language); },
    signOut: async () => { await signOutLocal(); setProfile(null); },
    updateProfile: async (values) => {
      if (!profile) throw new Error('auth.required');
      const next = await updateLocalUser(profile.id, values); setProfile(next); await i18n.changeLanguage(next.language);
    },
  }), [loading, profile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
