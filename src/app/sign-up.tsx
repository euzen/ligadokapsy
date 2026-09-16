import { Link, Redirect } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { useAuth } from '@/providers/auth-provider';

export default function SignUpScreen() {
  const { t } = useTranslation();
  const { profile, signUp } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  if (profile) return <Redirect href="/profile" />;
  const submit = async () => { setError(''); setLoading(true); try { await signUp(firstName.trim(), lastName.trim(), email, password); } catch (reason) { setError(t(reason instanceof Error ? reason.message : 'auth.emailExists')); } finally { setLoading(false); } };
  return <KeyboardAvoidingView className="flex-1 items-center justify-center bg-ink px-5" behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View className="w-full max-w-md rounded-2xl bg-white p-7 shadow-xl"><Text className="text-sm font-black uppercase tracking-widest text-brand">{t('common.appName')}</Text><Text className="mt-3 text-3xl font-black text-ink">{t('auth.signUpTitle')}</Text><Text className="mt-2 text-muted">{t('auth.signUpText')}</Text><View className="mt-7 gap-5"><Field label={t('profile.firstName')} value={firstName} onChangeText={setFirstName} /><Field label={t('profile.lastName')} value={lastName} onChangeText={setLastName} /><Field label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" /><Field label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry />{error ? <Text className="text-sm font-semibold text-red-600">{error}</Text> : null}<Button label={t('auth.signUp')} onPress={() => void submit()} loading={loading} disabled={firstName.trim().length < 1 || lastName.trim().length < 1 || !email.includes('@') || password.length < 6} /></View><Text className="mt-6 text-center text-muted">{t('auth.hasAccount')} <Link href="/sign-in" className="font-black text-brand">{t('auth.signIn')}</Link></Text></View></KeyboardAvoidingView>;
}
