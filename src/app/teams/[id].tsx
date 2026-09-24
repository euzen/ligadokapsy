import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, ScrollView, Text, View } from 'react-native';

import { CsvImportModal } from '@/components/csv-import-modal';
import { EntityShareModal } from '@/components/entity-share-modal';
import { Footer } from '@/components/footer';
import { MobileFAB } from '@/components/mobile-fab';
import { RosterPlayerModal } from '@/components/roster-player-modal';
import { RosterUserLinkModal } from '@/components/roster-user-link-modal';
import { Button } from '@/components/ui/button';
import { ExportButton } from '@/components/ui/export-button';
import { Field } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast-provider';
import { Tooltip } from '@/components/ui/tooltip';
import { addTeamShare, createTeamRoster, deleteTeamRoster, linkTeamRosterPlayer, listLocalUsers, listTeamShares, removeTeamShare, updateTeamRoster } from '@/features/auth/local-db';
import { useTeamRosters, useTeams } from '@/features/auth/use-local-data';
import { useAuth } from '@/providers/auth-provider';
import type { EntityShare, RosterPlayer, UserProfile } from '@/types/database';
import { rosterFullName } from '@/types/database';

export default function TeamDetailScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const { data: teams, loading: loadingTeams } = useTeams();
  const { data: rosters, loading, refresh } = useTeamRosters(id);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<RosterPlayer | null>(null);
  const [creating, setCreating] = useState(false);
  const [linking, setLinking] = useState<RosterPlayer | null>(null);
  const [sharing, setSharing] = useState(false);
  const [csvImport, setCsvImport] = useState(false);
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

  const exportHeaders = [t('rosters.firstName'), t('rosters.lastName'), t('rosters.jersey'), t('rosters.position'), t('rosters.captain')];
  const exportRows = useMemo(() => rosters.map((p) => [p.first_name, p.last_name, p.jersey_number, p.position, p.is_captain ? '1' : '0']), [rosters]);

  if (loadingTeams) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900">
        <ActivityIndicator color="#10B981" />
      </View>
    );
  }

  if (!team) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-5 dark:bg-slate-900">
        <View className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 dark:border-slate-700 dark:bg-slate-800">
          <Text className="text-3xl font-black text-slate-900 dark:text-white">{t('access.denied')}</Text>
          <Text className="mt-2 text-slate-500 dark:text-slate-400">{t('access.deniedHint')}</Text>
          <View className="mt-6">
            <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
          </View>
        </View>
      </View>
    );
  }

  const save = async (values: Omit<RosterPlayer, 'id' | 'tournament_team_id' | 'team_id' | 'user_id' | 'created_by'>) => {
    if (!profile) return;
    try {
      if (editing) {
        await updateTeamRoster(editing.id, values, profile);
        setEditing(null);
      } else {
        await createTeamRoster(team.id, values, profile);
        setCreating(false);
      }
      toast.success(t('toast.playerSaved'));
      await refresh();
    } catch (reason) {
      toast.error(t('toast.saveFailed'), reason instanceof Error ? reason.message : undefined);
    }
  };

  const remove = async (player: RosterPlayer) => {
    if (!profile) return;
    try {
      await deleteTeamRoster(player.id, profile);
      toast.info(t('toast.playerRemoved'));
      await refresh();
    } catch (reason) {
      toast.error(t('toast.saveFailed'), reason instanceof Error ? reason.message : undefined);
    }
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

  const csvColumns = [
    { key: 'first_name', label: t('rosters.firstName'), required: true },
    { key: 'last_name', label: t('rosters.lastName'), required: true },
    { key: 'jersey_number', label: t('rosters.jersey'), validate: (v: string) => /^\d*$/.test(v) },
    { key: 'position', label: t('rosters.position') },
  ];

  const handleCsvImport = async (rows: Record<string, string>[]) => {
    if (!profile) return;
    for (const row of rows) {
      await createTeamRoster(team.id, {
        first_name: row.first_name,
        last_name: row.last_name,
        jersey_number: row.jersey_number ? Number(row.jersey_number) : null,
        position: row.position || null,
        is_captain: false,
      }, profile);
    }
    await refresh();
  };

  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-900" contentContainerClassName="items-center px-4 pb-24 pt-6 safe-bottom overflow-scrolling-touch">
      <View className="w-full max-w-5xl gap-4">
        <Button icon="←" label={t('common.back')} variant="ghost" onPress={() => router.back()} />

        <View className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 md:p-8">
          <View className="flex-row items-center gap-4">
            <View style={{ backgroundColor: team.color }} className="h-16 w-16 items-center justify-center overflow-hidden rounded-2xl">
              {team.logo_url ? <Image source={{ uri: team.logo_url }} className="h-full w-full" resizeMode="cover" /> : <Text className="text-2xl">🛡️</Text>}
            </View>
            <View className="flex-1">
              <View className="flex-row flex-wrap items-center gap-3">
                <Text className="text-2xl font-black text-slate-900 dark:text-white">{team.name}</Text>
                {team.is_private ? (
                  <Tooltip text={t('teams.privateHint')}>
                    <View className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-700">
                      <Text className="text-xs font-black text-slate-600 dark:text-slate-300">🔒 {t('teams.privateBadge')}</Text>
                    </View>
                  </Tooltip>
                ) : null}
              </View>
              <Text className="text-sm text-slate-500 dark:text-slate-400">{t(`sports.${team.primary_sport}`)}</Text>
            </View>
          </View>
        </View>

        <View className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <View className="flex-row flex-wrap items-center justify-between gap-3">
            <View>
              <Text className="text-xl font-bold text-slate-900 dark:text-white">{t('teams.masterRoster')}</Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400">{t('teams.masterRosterText')}</Text>
            </View>
            <View className="hidden flex-row flex-wrap gap-2 md:flex">
              <ExportButton filename={`${team.name}_roster`} headers={exportHeaders} rows={exportRows} />
              {canManage ? (
                <>
                  <Button label={t('dataTools.importCsv')} variant="ghost" size="sm" onPress={() => setCsvImport(true)} />
                  <Button label={t('sharing.share')} variant="secondary" onPress={() => setSharing(true)} />
                  <Button label={t('rosters.addPlayer')} onPress={() => setCreating(true)} />
                </>
              ) : null}
            </View>
          </View>

          <View className="mt-3">
            <Field label={t('rosters.search')} value={search} onChangeText={setSearch} />
          </View>

          <View className="mt-3 gap-2">
            {filtered.map((player) => (
              <View key={player.id} className="flex-row items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                <Text className="w-10 shrink-0 text-center font-mono text-sm font-black text-brand">{player.jersey_number ?? '–'}</Text>
                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-bold text-slate-900 dark:text-white" numberOfLines={1}>{rosterFullName(player)}{player.is_captain ? ` (${t('rosters.captain')})` : ''}</Text>
                  {player.position ? <Text className="text-xs text-slate-500 dark:text-slate-400">{player.position}</Text> : null}
                </View>
                {canManage ? (
                  <View className="flex-row gap-1">
                    <Button label={player.user_id ? t('sharing.unlink') : t('rosters.link')} size="sm" variant={player.user_id ? 'secondary' : 'ghost'} onPress={() => openLink(player)} />
                    <Button label={t('common.edit')} variant="ghost" size="sm" onPress={() => setEditing(player)} />
                    <Button label={t('teams.delete')} variant="danger" size="sm" onPress={() => void remove(player)} />
                  </View>
                ) : null}
              </View>
            ))}
            {!filtered.length ? <Text className="py-5 text-center text-slate-500 dark:text-slate-400">{loading ? t('common.loading') : t('teams.emptyRoster')}</Text> : null}
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
      {csvImport && canManage ? <CsvImportModal title={t('dataTools.importRoster')} columns={csvColumns} templateFilename="roster_template.csv" onImport={handleCsvImport} onClose={() => setCsvImport(false)} /> : null}
      {canManage ? <MobileFAB label={t('rosters.addPlayer')} onPress={() => setCreating(true)} /> : null}
      <Footer />
    </ScrollView>
  );
}
