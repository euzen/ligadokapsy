import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { TournamentFormModal } from '@/components/tournament-form-modal';
import { TournamentLogo } from '@/components/tournament-logo';
import { Button } from '@/components/ui/button';
import { createTournament } from '@/features/auth/local-db';
import { useTournaments } from '@/features/auth/use-local-data';
import { useAuth } from '@/providers/auth-provider';
import type { Tournament } from '@/types/database';

const badgeClasses = { draft: 'bg-amber-100 text-amber-700', published: 'bg-emerald-100 text-emerald-700', completed: 'bg-slate-200 text-slate-600' };

export default function TournamentsScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { data: tournaments } = useTournaments();
  const [creating, setCreating] = useState(false);
  const save = async (values: Omit<Tournament, 'id' | 'created_by' | 'status' | 'rosters_locked'>) => { if (profile) await createTournament(values, profile); };
  return <ScrollView className="flex-1 bg-canvas" contentContainerClassName="items-center px-5 pb-24 pt-10"><View className="w-full max-w-6xl gap-7"><View className="flex-row flex-wrap items-end justify-between gap-4"><View><Text className="text-xs font-black uppercase tracking-widest text-brand">{t('tournaments.badge')}</Text><Text className="mt-2 text-4xl font-black text-ink">{t('tournaments.title')}</Text><Text className="mt-2 text-muted">{t('tournaments.subtitle')}</Text></View>{profile ? <Button label={t('tournaments.create')} onPress={() => setCreating(true)} /> : <Button label={t('nav.signIn')} onPress={() => router.push('/sign-in')} />}</View><View className="flex-row flex-wrap gap-4">{tournaments.map((tournament) => <Pressable key={tournament.id} onPress={() => router.push(`/tournaments/${tournament.id}` as never)} className="min-w-72 flex-1 rounded-2xl border border-slate-200 bg-white p-6"><View className="flex-row items-start justify-between gap-3"><View className={`rounded-full px-3 py-2 ${badgeClasses[tournament.status].split(' ')[0]}`}><Text className={`text-xs font-black uppercase ${badgeClasses[tournament.status].split(' ')[1]}`}>{t(`tournaments.status.${tournament.status}`)}</Text></View><Text className="text-sm font-bold text-muted">{t(`sports.${tournament.sport}`)}</Text></View><View className="mt-5"><TournamentLogo value={tournament.logo_url} name={tournament.name} size="small" /></View><Text className="mt-4 text-2xl font-black text-ink">{tournament.name}</Text>{tournament.is_private ? <View className="mt-2 self-start rounded-full bg-slate-100 px-3 py-1"><Text className="text-xs font-black text-slate-600">🔒 {t('tournaments.privateBadge')}</Text></View> : null}<Text className="mt-3 text-muted">{tournament.location} · {new Date(tournament.start_date).toLocaleDateString()}</Text><Text className="mt-6 font-black text-brand">{t('tournaments.open')} →</Text></Pressable>)}</View></View>{creating ? <TournamentFormModal onClose={() => setCreating(false)} onSave={save} /> : null}</ScrollView>;
}
