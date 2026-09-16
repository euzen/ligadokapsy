import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';

import { EntityShareModal } from '@/components/entity-share-modal';
import { RosterPlayerModal } from '@/components/roster-player-modal';
import { RosterUserLinkModal } from '@/components/roster-user-link-modal';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { addTeamShare, createTeamRoster, deleteTeamRoster, linkTeamRosterPlayer, listLocalUsers, listTeamShares, removeTeamShare, updateTeamRoster } from '@/features/auth/local-db';
import { useTeamRosters, useTeams } from '@/features/auth/use-local-data';
import { useAuth } from '@/providers/auth-provider';
import type { EntityShare, RosterPlayer, UserProfile } from '@/types/database';
import { initialsFromName, rosterFullName } from '@/types/database';

export default function TeamDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const { data: teams, loading: loadingTeams } = useTeams();
  const { data: rosters, loading, refresh } = useTeamRosters(id);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<RosterPlayer | null>(null);
  const [creating, setCreating] = useState(false);
  const [linking, setLinking] = useState<RosterPlayer | null>(null);
  const [sharing, setSharing] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [shares, setShares] = useState<EntityShare[]>([]);

  const team = teams.find((item) => item.id === id);
  const canManage = Boolean(profile && team && (profile.role === 'admin' || profile.id === team.created_by));

  useEffect(() => {
    if (!sharing || !team || !canManage) return;
    void listLocalUsers().then(setUsers);
    void listTeamShares(team.id).then(setShares);
  }, [sharing, team, canManage]);

  const filtered = useMemo(
    () => rosters.filter((player) => rosterFullName(player).toLowerCase().includes(search.toLowerCase())),
    [rosters, search]
  );

  if (loadingTeams) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color="#10B981" />
      </View>
    );
  }

  if (!team) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-5">
        <View className="w-full max-w-md rounded-2xl bg-white p-7">
          <Text className="text-3xl font-black text-ink">{t('access.denied')}</Text>
          <Text className="mt-2 text-muted">{t('access.deniedHint')}</Text>
          <View className="mt-6">
            <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
          </View>
        </View>
      </View>
    );
  }

  const save = async (values: Omit<RosterPlayer, 'id' | 'tournament_team_id' | 'team_id' | 'user_id' | 'created_by'>) => {
    if (!profile) return;
    if (editing) {
      await updateTeamRoster(editing.id, values, profile);
      setEditing(null);
    } else {
      await createTeamRoster(team.id, values, profile);
      setCreating(false);
    }
    await refresh();
  };

  const remove = async (player: RosterPlayer) => {
    if (!profile) return;
    await deleteTeamRoster(player.id, profile);
    await refresh();
  };

  const openLink = (player: RosterPlayer) => {
    if (users.length === 0 && profile) void listLocalUsers().then(setUsers);
    setLinking(player);
  };

  const link = async (playerId: string, userId: string | null) => {
    if (!profile) return;
    await linkTeamRosterPlayer(playerId, userId, profile);
    setLinking(null);
    await refresh();
  };

  return (
    <ScrollView className="flex-1 bg-canvas" contentContainerClassName="items-center px-5 pb-24 pt-10">
      <View className="w-full max-w-5xl gap-7">
        <Pressable onPress={() => router.back()}>
          <Text className="font-black text-brand">← {t('common.back')}</Text>
        </Pressable>

        <View className="rounded-2xl bg-ink p-7 md:p-10">
          <View className="flex-row items-center gap-5">
            <View style={{ backgroundColor: team.color }} className="h-20 w-20 items-center justify-center overflow-hidden rounded-2xl">
              {team.logo_url ? <Image source={{ uri: team.logo_url }} className="h-full w-full" resizeMode="cover" /> : <Text className="text-2xl font-black text-white">{initialsFromName(team.name)}</Text>}
            </View>
            <View className="flex-1">
              <View className="flex-row flex-wrap items-center gap-3">
                <Text className="text-4xl font-black text-white">{team.name}</Text>
                {team.is_private ? (
                  <View className="rounded-full bg-slate-700 px-3 py-1">
                    <Text className="text-xs font-black text-slate-300">🔒 {t('teams.privateBadge')}</Text>
                  </View>
                ) : null}
              </View>
              <Text className="mt-2 text-slate-300">{t(`sports.${team.primary_sport}`)} · {initialsFromName(team.name)}</Text>
            </View>
          </View>
        </View>

        <View className="rounded-2xl border border-slate-200 bg-white p-6">
          <View className="flex-row flex-wrap items-center justify-between gap-3">
            <View>
              <Text className="text-2xl font-black text-ink">{t('teams.masterRoster')}</Text>
              <Text className="text-muted">{t('teams.masterRosterText')}</Text>
            </View>
            {canManage ? (
              <View className="flex-row gap-2">
                <Button label={t('sharing.share')} variant="secondary" onPress={() => setSharing(true)} />
                <Button label={t('rosters.addPlayer')} onPress={() => setCreating(true)} />
              </View>
            ) : null}
          </View>

          <View className="mt-5">
            <Field label={t('rosters.search')} value={search} onChangeText={setSearch} />
          </View>

          <View className="mt-5 gap-3">
            {filtered.map((player) => (
              <View key={player.id} className="flex-row items-center gap-3 rounded-xl bg-slate-50 p-4">
                <Text className="w-10 text-center font-mono font-black text-brand">{player.jersey_number ?? '–'}</Text>
                <View className="flex-1">
                  <Text className="font-black text-ink">{rosterFullName(player)}{player.is_captain ? ` (${t('rosters.captain')})` : ''}</Text>
                  {player.position ? <Text className="text-xs text-muted">{player.position}</Text> : null}
                </View>
                {canManage ? (
                  <View className="flex-row gap-2">
                    <Pressable onPress={() => openLink(player)} className="rounded-lg bg-brand/10 px-3 py-2">
                      <Text className="text-xs font-black text-brand">{player.user_id ? t('sharing.unlink') : t('rosters.link')}</Text>
                    </Pressable>
                    <Pressable onPress={() => setEditing(player)} className="rounded-lg bg-slate-200 px-3 py-2">
                      <Text className="text-xs font-black text-ink">{t('common.edit')}</Text>
                    </Pressable>
                    <Pressable onPress={() => void remove(player)} className="rounded-lg bg-red-100 px-3 py-2">
                      <Text className="text-xs font-black text-red-600">{t('teams.delete')}</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))}
            {!filtered.length ? <Text className="py-5 text-center text-muted">{loading ? t('common.loading') : t('teams.emptyRoster')}</Text> : null}
          </View>
        </View>
      </View>

      {creating || editing ? <RosterPlayerModal player={editing ?? undefined} onClose={() => { setCreating(false); setEditing(null); }} onSave={save} /> : null}
      {linking ? <RosterUserLinkModal currentUserId={linking.user_id ?? null} users={users} onClose={() => setLinking(null)} onSave={async (userId) => link(linking.id, userId)} /> : null}
      {sharing && team && canManage ? (
        <EntityShareModal
          users={users}
          shares={shares}
          onClose={() => setSharing(false)}
          onAdd={async (userId, level) => {
            if (!profile) return;
            await addTeamShare(team.id, userId, level);
            setShares(await listTeamShares(team.id));
          }}
          onRemove={async (userId) => {
            if (!profile) return;
            await removeTeamShare(team.id, userId);
            setShares(await listTeamShares(team.id));
          }}
        />
      ) : null}
    </ScrollView>
  );
}
