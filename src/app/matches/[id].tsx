import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, Text, View } from 'react-native';

import { getPublicMatch } from '@/features/auth/local-db';
import type { PublicMatch, Team } from '@/types/database';
import { initialsFromName } from '@/types/database';

function TeamCard({ team, score }: { team: Team; score: number | null }) {
  return <View className="flex-1 items-center"><View style={{ backgroundColor: team.color }} className="h-20 w-20 items-center justify-center overflow-hidden rounded-2xl">{team.logo_url ? <Image source={{ uri: team.logo_url }} className="h-full w-full" /> : <Text className="text-xl font-black text-white">{initialsFromName(team.name)}</Text>}</View><Text className="mt-3 text-center text-lg font-black text-ink">{team.name}</Text><Text className="mt-3 text-7xl font-black text-ink">{score ?? 0}</Text></View>;
}

function clock(seconds: number) { return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`; }
export default function PublicMatchScreen() {
  const { t } = useTranslation(); const { id } = useLocalSearchParams<{ id: string }>(); const [bundle, setBundle] = useState<PublicMatch | null>(null); const [now, setNow] = useState(0);
  const refresh = useCallback(() => { void getPublicMatch(id).then(setBundle); }, [id]);
  useEffect(() => { const timeout = setTimeout(refresh, 0); const interval = setInterval(() => { setNow(Date.now()); refresh(); }, 1000); return () => { clearTimeout(timeout); clearInterval(interval); }; }, [refresh]);
  if (!bundle) return <View className="flex-1 bg-canvas" />;
  const elapsed = bundle.match.clock_seconds + (bundle.match.clock_started_at ? Math.max(0, Math.floor((now - new Date(bundle.match.clock_started_at).getTime()) / 1000)) : 0);
  const badge = bundle.match.status === 'live' ? 'bg-red-600 text-white' : bundle.match.status === 'finished' ? 'bg-slate-700 text-white' : 'bg-amber-100 text-amber-700';
  return <ScrollView className="flex-1 bg-canvas" contentContainerClassName="items-center px-4 pb-24 pt-10"><View className="w-full max-w-3xl gap-6"><View className="items-center"><View className={`rounded-full px-4 py-2 ${badge.split(' ')[0]}`}><Text className={`text-xs font-black uppercase ${badge.split(' ')[1]}`}>{t(`matches.status.${bundle.match.status}`)}</Text></View><Text className="mt-4 font-mono text-4xl font-black text-ink">{clock(elapsed)}</Text><Text className="mt-2 text-sm text-muted">{bundle.match.match_date} · {bundle.match.match_time} · {bundle.match.pitch_location}</Text></View><View className="flex-row items-center rounded-2xl bg-white p-6"><TeamCard team={bundle.homeTeam} score={bundle.match.home_score} /><Text className="text-2xl font-black text-slate-300">:</Text><TeamCard team={bundle.awayTeam} score={bundle.match.away_score} /></View><View className="rounded-2xl bg-white p-6"><Text className="text-2xl font-black text-ink">{t('matchCenter.timeline')}</Text><View className="mt-5 gap-3">{bundle.events.map((event) => { const team = event.team_id === bundle.homeTeam.id ? bundle.homeTeam : event.team_id === bundle.awayTeam.id ? bundle.awayTeam : null; return <View key={event.id} className="flex-row items-center gap-4 border-b border-slate-100 pb-3"><Text className="w-12 font-mono font-black text-brand">{t('matchCenter.minute', { minute: Math.floor(event.clock_seconds / 60) })}</Text><View className="flex-1"><Text className="font-black text-ink">{t(`events.${event.event_type}`)}{team ? ` — ${team.name}` : ''}</Text>{event.player_name ? <Text className="mt-1 text-sm text-muted">{event.player_name}</Text> : null}</View></View>; })}{!bundle.events.length ? <Text className="text-center text-muted">{t('matchCenter.noEvents')}</Text> : null}</View></View></View></ScrollView>;
}
