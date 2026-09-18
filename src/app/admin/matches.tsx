import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AdminSectionNav } from '@/components/admin-section-nav';
import { ConfirmDeleteModal } from '@/components/confirm-delete-modal';
import { MatchEditModal } from '@/components/match-edit-modal';
import { MatchEventsModal } from '@/components/match-events-modal';
import { deleteMatch, updateMatch } from '@/features/auth/local-db';
import { useMatches, useTeams } from '@/features/auth/use-local-data';
import { useAuth } from '@/providers/auth-provider';
import type { Match } from '@/types/database';

export default function MatchesAdminScreen() {
  const { t } = useTranslation(); const { profile, loading } = useAuth(); const { data: matches } = useMatches(); const { data: teams } = useTeams(); const [editing, setEditing] = useState<Match | null>(null); const [managingEvents, setManagingEvents] = useState<Match | null>(null); const [deleting, setDeleting] = useState<Match | null>(null); const names = useMemo(() => new Map(teams.map((team) => [team.id, team.name])), [teams]);
  if (loading) return <View className="flex-1 bg-canvas" />; if (!profile) return <Redirect href="/sign-in" />; if (profile.role !== 'admin') return <Redirect href="/" />;
  return <View className="flex-1 md:flex-row"><AdminSectionNav active="matches" /><ScrollView className="flex-1 bg-canvas" contentContainerClassName="p-6"><View className="mx-auto w-full max-w-5xl"><Text className="text-4xl font-black text-ink">{t('matchesAdmin.title')}</Text><Text className="mt-2 text-muted">{t('matchesAdmin.subtitle')}</Text><View className="mt-7 gap-3">{matches.map((match) => <View key={match.id} className="rounded-2xl bg-white p-5"><View className="flex-row flex-wrap items-center justify-between gap-4"><View><Text className="text-xl font-black text-ink">{names.get(match.home_team_id)} — {names.get(match.away_team_id)}</Text><Text className="mt-2 text-muted">{match.match_date} · {match.match_time} · {match.pitch_location}</Text></View><Text className="font-mono text-3xl font-black text-ink">{match.home_score ?? '–'} : {match.away_score ?? '–'}</Text></View><View className="mt-4 flex-row flex-wrap gap-2"><Pressable onPress={() => router.push(`/matches/${match.id}` as never)} className="rounded-xl bg-slate-100 px-4 py-3"><Text className="font-bold text-ink">{t('matchesAdmin.publicView')}</Text></Pressable><Pressable onPress={() => setManagingEvents(match)} className="rounded-xl bg-emerald-100 px-4 py-3"><Text className="font-bold text-emerald-800">{t('matchesAdmin.events')}</Text></Pressable><Pressable onPress={() => setEditing(match)} className="rounded-xl bg-brand px-4 py-3"><Text className="font-black text-white">{t('common.edit')}</Text></Pressable><Pressable onPress={() => setDeleting(match)} className="rounded-xl bg-red-600 px-4 py-3"><Text className="font-black text-white">{t('delete.button')}</Text></Pressable></View></View>)}</View></View></ScrollView>{editing ? <MatchEditModal match={editing} teams={teams} onClose={() => setEditing(null)} onSave={async (values) => { await updateMatch(editing.id, values, profile); }} /> : null}{managingEvents ? <MatchEventsModal match={managingEvents} teams={teams} onClose={() => setManagingEvents(null)} /> : null}{deleting ? <ConfirmDeleteModal name={`${names.get(deleting.home_team_id)} — ${names.get(deleting.away_team_id)}`} onCancel={() => setDeleting(null)} onConfirm={async () => { await deleteMatch(deleting.id, profile); setDeleting(null); }} /> : null}</View>;
}
