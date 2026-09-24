import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { ConfirmDeleteModal } from '@/components/confirm-delete-modal';
import { EditProfileModal } from '@/components/edit-profile-modal';
import { RolePicker } from '@/components/role-picker';
import { TeamFormModal } from '@/components/team-form-modal';
import { TournamentFormModal } from '@/components/tournament-form-modal';
import { Button } from '@/components/ui/button';
import { ExportButton } from '@/components/ui/export-button';
import { Tooltip } from '@/components/ui/tooltip';
import {
    createTeam,
    createTournament,
    deleteLocalUser,
    deleteMatch,
    deleteTeam,
    deleteTournament,
    getAdminMetrics,
    listLocalUsers,
    subscribeLocalData,
    subscribeLocalUsers,
    updateLocalUser,
    updateMatch,
    updateTeam,
    updateTournament,
} from '@/features/auth/local-db';
import { useMatches, useTeams, useTournaments } from '@/features/auth/use-local-data';
import { useAuth } from '@/providers/auth-provider';
import type { AdminMetrics, EditableProfile, Match, MatchStatus, Team, Tournament, UserProfile } from '@/types/database';
import { fullName } from '@/types/database';

export type AdminTab = 'overview' | 'users' | 'tournaments' | 'teams' | 'matches' | 'sports';
type DeleteTarget = { kind: 'user' | 'tournament' | 'team' | 'match'; id: string; name: string };

const tabs: AdminTab[] = ['overview', 'users', 'tournaments', 'teams'];
const matchStatuses: MatchStatus[] = ['scheduled', 'live', 'finished', 'cancelled'];

type NavItemKind = AdminTab | 'sports' | 'matches' | 'pages';

function NavItem({ item, collapsed, active, onPress, label }: { item: NavItemKind; collapsed: boolean; active: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} className={`mb-2 rounded-xl p-4 ${active ? 'bg-brand' : ''}`}>
      <Text className={`font-black ${active ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{collapsed ? label.slice(0, 1) : label}</Text>
    </Pressable>
  );
}

function TeamAvatar({ team, size = 40 }: { team: Team; size?: number }) {
  return (
    <View style={{ backgroundColor: team.color, width: size, height: size }} className="items-center justify-center overflow-hidden rounded-lg">
      {team.logo_url ? <Image source={{ uri: team.logo_url }} className="h-full w-full" resizeMode="cover" /> : <Text className="text-lg">🛡️</Text>}
    </View>
  );
}

function MatchOverride({ match, teamNames, admin, onDelete }: { match: Match; teamNames: Map<string, string>; admin: UserProfile; onDelete: () => void }) {
  const { t } = useTranslation();
  const [home, setHome] = useState(match.home_score?.toString() ?? '');
  const [away, setAway] = useState(match.away_score?.toString() ?? '');
  const save = () => updateMatch(match.id, { home_score: home === '' ? null : Number(home), away_score: away === '' ? null : Number(away) }, admin);

  return (
    <View className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <View className="flex-row flex-wrap items-center justify-between gap-3">
        <View>
          <Text className="text-sm font-bold text-slate-900 dark:text-white">{teamNames.get(match.home_team_id)} — {teamNames.get(match.away_team_id)}</Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400">{match.match_date} · {match.match_time} · {match.pitch_location}</Text>
        </View>
        <Text className="font-mono text-2xl font-black text-slate-900 dark:text-white">{match.home_score ?? '–'} : {match.away_score ?? '–'}</Text>
      </View>
      <View className="mt-3 flex-row flex-wrap items-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
        <View className="w-20">
          <Text className="mb-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">{t('matches.homeScore')}</Text>
          <TextInput value={home} onChangeText={setHome} keyboardType="number-pad" className="min-h-9 rounded-lg border border-slate-200 bg-slate-50 px-2 text-center font-black text-slate-900 outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
        </View>
        <View className="w-20">
          <Text className="mb-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">{t('matches.awayScore')}</Text>
          <TextInput value={away} onChangeText={setAway} keyboardType="number-pad" className="min-h-9 rounded-lg border border-slate-200 bg-slate-50 px-2 text-center font-black text-slate-900 outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
        </View>
        <Button label={t('common.save')} onPress={() => void save()} />
        <View className="flex-row flex-wrap gap-2">
          {matchStatuses.map((status) => (
            <Button key={status} label={t(`matches.status.${status}`)} size="sm" variant={match.status === status ? 'primary' : 'ghost'} onPress={() => void updateMatch(match.id, { status }, admin)} />
          ))}
        </View>
        <Button label={t('delete.button')} variant="danger" size="sm" onPress={onDelete} />
      </View>
    </View>
  );
}

export function AdminDashboard({ initialTab = 'overview' }: { initialTab?: AdminTab }) {
  const { t } = useTranslation();
  const { profile, loading } = useAuth();
  const { data: teams } = useTeams();
  const { data: tournaments } = useTournaments();
  const { data: matches } = useMatches();
  const [tab] = useState<AdminTab>(initialTab);
  const [collapsed, setCollapsed] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [creatingTournament, setCreatingTournament] = useState(false);
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null);

  const refresh = useCallback(() => {
    void listLocalUsers().then(setUsers);
    void getAdminMetrics().then(setMetrics);
  }, []);

  useEffect(() => {
    if (profile?.role !== 'admin') return;
    const timeout = setTimeout(refresh, 0);
    const unsubscribeUsers = subscribeLocalUsers(refresh);
    const unsubscribeData = subscribeLocalData(refresh);
    return () => { clearTimeout(timeout); unsubscribeUsers(); unsubscribeData(); };
  }, [profile?.role, refresh]);

  const names = useMemo(() => new Map(teams.map((team) => [team.id, team.name])), [teams]);

  if (loading) return <View className="flex-1 bg-slate-50 dark:bg-slate-900" />;
  if (!profile) return <Redirect href="/sign-in" />;
  if (profile.role !== 'admin') return <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900"><Text className="text-2xl font-black text-slate-900 dark:text-white">{t('admin.accessDenied')}</Text></View>;

  const confirmDelete = async () => {
    if (!deleting) return;
    if (deleting.kind === 'user') await deleteLocalUser(deleting.id);
    if (deleting.kind === 'team') await deleteTeam(deleting.id, profile);
    if (deleting.kind === 'tournament') await deleteTournament(deleting.id, profile);
    if (deleting.kind === 'match') await deleteMatch(deleting.id, profile);
    setDeleting(null);
    refresh();
  };

  const metricCards: { key: keyof AdminMetrics | 'databaseSize'; value: string | number }[] = [
    { key: 'users', value: metrics?.users ?? 0 },
    { key: 'activeTournaments', value: metrics?.activeTournaments ?? 0 },
    { key: 'teams', value: metrics?.teams ?? 0 },
    { key: 'databaseSize', value: `${Math.ceil((metrics?.databaseBytes ?? 0) / 1024)} KB` },
  ];

  const navItemProps = (item: NavItemKind) => ({
    item,
    collapsed,
    active: tab === item,
    onPress: () => router.push((item === 'overview' ? '/admin' : `/admin/${item}`) as never),
    label: item === 'sports' ? t('admin.tabs.sports') : item === 'matches' ? t('admin.tabs.matches') : item === 'pages' ? t('admin.tabs.pages') : t(`admin.tabs.${item}`),
  });

  return (
    <View className="flex-1 flex-row bg-slate-50 dark:bg-slate-900">
      <View className={`${collapsed ? 'w-20' : 'w-64'} hidden border-r border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 md:flex`}>
        <Pressable onPress={() => setCollapsed(!collapsed)} className="mb-4 rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
          <Text className="text-center font-black text-slate-900 dark:text-white">{collapsed ? '→' : '←'}</Text>
        </Pressable>
        {tabs.map((item) => <NavItem key={item} {...navItemProps(item)} />)}
        <NavItem {...navItemProps('sports')} />
        <NavItem {...navItemProps('matches')} />
        <NavItem {...navItemProps('pages')} />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="items-center px-4 pb-24 pt-4 md:px-6">
        <View className="w-full max-w-6xl">
          <View className="mb-4 flex-row gap-2 overflow-hidden md:hidden">
            {[...tabs, 'sports', 'matches', 'pages'].map((item) => (
              <Pressable
                key={item}
                onPress={() => router.push((item === 'overview' ? '/admin' : `/admin/${item}`) as never)}
                className={`rounded-lg px-3 py-2 ${tab === item ? 'bg-brand' : 'bg-white dark:bg-slate-800'}`}
              >
                <Text className={`text-xs font-black ${tab === item ? 'text-white' : 'text-slate-900 dark:text-slate-300'}`}>
                  {item === 'sports' ? t('admin.tabs.sports') : item === 'matches' ? t('admin.tabs.matches') : item === 'pages' ? t('admin.tabs.pages') : t(`admin.tabs.${item}`)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text className="text-xs font-black uppercase tracking-widest text-brand">{t('admin.badge')}</Text>
          <Text className="mt-1 text-3xl font-black text-slate-900 dark:text-white">{t(`admin.tabs.${tab}`)}</Text>
          <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('admin.subtitle')}</Text>

          {tab === 'overview' ? (
            <View className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 items-stretch">
              {metricCards.map((item) => (
                <View key={item.key} className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                  <Text className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{item.value}</Text>
                  <Text className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-300">{t(`admin.metrics.${item.key}`)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {tab === 'users' ? (
            <View className="mt-5 gap-2">
              <View className="flex-row justify-end">
                <ExportButton filename="users" headers={[t('admin.name'), t('admin.email'), t('admin.role'), t('admin.created')]} rows={users.map((u) => [fullName(u), u.email, u.role, u.createdAt ?? ''])} />
              </View>
              {users.map((user) => (
                <View key={user.id} className="flex-row flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                  <View className="min-w-48 flex-1">
                    <Text className="text-sm font-bold text-slate-900 dark:text-white">{fullName(user)}</Text>
                    <Text className="text-xs text-slate-500 dark:text-slate-400">{user.email}</Text>
                  </View>
                  <RolePicker user={user} />
                  <Button label={t('common.edit')} variant="ghost" onPress={() => setEditingUser(user)} />
                  <Button label={t('delete.button')} variant="danger" size="sm" onPress={() => setDeleting({ kind: 'user', id: user.id, name: fullName(user) })} />
                </View>
              ))}
            </View>
          ) : null}

          {tab === 'teams' ? (
            <View className="mt-5">
              <View className="mb-3 items-start">
                <Button label={t('teams.create')} onPress={() => setCreatingTeam(true)} />
              </View>
              <View className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-stretch">
                {teams.map((team) => (
                  <View key={team.id} className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                    <View>
                      <TeamAvatar team={team} />
                      {team.is_private ? (
                        <Tooltip text={t('teams.privateHint')}>
                          <View className="mt-2 self-start rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-700">
                            <Text className="text-[10px] font-black text-slate-600 dark:text-slate-300">🔒 {t('teams.privateBadge')}</Text>
                          </View>
                        </Tooltip>
                      ) : null}
                      <Text className="mt-2 text-sm font-bold text-slate-900 dark:text-white">{team.name}</Text>
                      <Text className="text-xs text-slate-500 dark:text-slate-400">{t(`sports.${team.primary_sport}`)}</Text>
                    </View>
                    <View className="mt-3 flex-row gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
                      <Button label={t('teams.masterRoster')} variant="secondary" onPress={() => router.push(`/teams/${team.id}` as never)} />
                      <Button label={t('common.edit')} variant="ghost" onPress={() => setEditingTeam(team)} />
                      <Button label={t('delete.button')} variant="danger" size="sm" onPress={() => setDeleting({ kind: 'team', id: team.id, name: team.name })} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {tab === 'tournaments' ? (
            <View className="mt-5">
              <View className="mb-3 items-start">
                <Button label={t('tournaments.create')} onPress={() => setCreatingTournament(true)} />
              </View>
              <View className="grid grid-cols-1 gap-2">
                {tournaments.map((tournament) => (
                  <View key={tournament.id} className="flex-row flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                    <View className="min-w-48 flex-1">
                      <Text className="text-sm font-bold text-slate-900 dark:text-white">{tournament.name}</Text>
                      <View className="flex-row flex-wrap items-center gap-2">
                        {tournament.is_private ? <Tooltip text={t('tournaments.privateHint')}><Text className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600 dark:bg-slate-700 dark:text-slate-300">🔒 {t('tournaments.privateBadge')}</Text></Tooltip> : null}
                        <Text className="text-xs text-slate-500 dark:text-slate-400">{tournament.location} · {t(`tournaments.status.${tournament.status}`)}</Text>
                      </View>
                    </View>
                    <View className="flex-row gap-2">
                      <Button label={t('common.edit')} variant="ghost" onPress={() => setEditingTournament(tournament)} />
                      <Button label={t('delete.button')} variant="danger" size="sm" onPress={() => setDeleting({ kind: 'tournament', id: tournament.id, name: tournament.name })} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {tab === 'matches' ? (
            <View className="mt-5 gap-2">
              {matches.map((item) => (
                <MatchOverride
                  key={item.id}
                  match={item}
                  teamNames={names}
                  admin={profile}
                  onDelete={() => setDeleting({ kind: 'match', id: item.id, name: `${names.get(item.home_team_id)} — ${names.get(item.away_team_id)}` })}
                />
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {editingUser ? <EditProfileModal profile={editingUser} onClose={() => setEditingUser(null)} onSave={async (values: EditableProfile) => { await updateLocalUser(editingUser.id, values); }} /> : null}
      {editingTeam ? <TeamFormModal team={editingTeam} onClose={() => setEditingTeam(null)} onSave={async (values) => updateTeam(editingTeam.id, values, profile)} /> : null}
      {creatingTeam ? <TeamFormModal onClose={() => setCreatingTeam(false)} onSave={async (values) => { await createTeam(values, profile); }} /> : null}
      {editingTournament ? <TournamentFormModal tournament={editingTournament} showStatus onClose={() => setEditingTournament(null)} onSave={async (values) => { await updateTournament(editingTournament.id, values, profile); }} /> : null}
      {creatingTournament ? <TournamentFormModal onClose={() => setCreatingTournament(false)} onSave={async (values) => { await createTournament(values, profile); }} /> : null}
      {deleting ? <ConfirmDeleteModal name={deleting.name} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} /> : null}
    </View>
  );
}

export default function AdminScreen() {
  return <AdminDashboard />;
}
