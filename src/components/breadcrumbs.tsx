import { router, usePathname } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, Text, View } from 'react-native';

import { getPublicMatch, getTournament } from '@/features/auth/local-db';
import { useTeams } from '@/features/auth/use-local-data';

type Crumb = { label: string; path: string };

const HIDDEN_ROUTES = ['/', '/scorekeeper', '/sign-in', '/sign-up'];

export function Breadcrumbs() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { data: teams } = useTeams();
  const [dynamicLabel, setDynamicLabel] = useState<string | null>(null);
  const [parentLabel, setParentLabel] = useState<string | null>(null);

  // Base route labels
  const routeLabels: Record<string, string> = useMemo(() => ({
    '/tournaments': t('nav.tournaments'),
    '/teams': t('nav.teams'),
    '/matches': t('nav.matches'),
    '/profile': t('nav.profile'),
    '/admin': t('nav.admin'),
    '/docs': t('breadcrumbs.docs'),
  }), [t]);

  // Parse the current path into segments
  const segments = useMemo(() => {
    const parts = pathname.split('/').filter(Boolean);
    return parts;
  }, [pathname]);

  // Resolve dynamic labels for entity detail pages
  useEffect(() => {
    const [section, id] = segments;
    let cancelled = false;

    const resolve = async () => {
      let label: string | null = null;
      let parent: string | null = null;

      if (segments.length >= 2 && id) {
        if (section === 'tournaments') {
          const tournament = await getTournament(id);
          if (tournament) label = tournament.name;
        } else if (section === 'teams') {
          const team = teams.find((t2) => t2.id === id);
          if (team) label = team.name;
        } else if (section === 'matches') {
          const bundle = await getPublicMatch(id);
          if (bundle) {
            label = `${bundle.homeTeam.name} vs ${bundle.awayTeam.name}`;
            const tournament = await getTournament(bundle.match.tournament_id);
            if (tournament) parent = tournament.name;
          }
        } else if (section === 'docs') {
          label = decodeURIComponent(id);
        } else if (section === 'admin') {
          const adminLabels: Record<string, string> = {
            users: t('admin.tabs.users'),
            tournaments: t('admin.tabs.tournaments'),
            teams: t('admin.tabs.teams'),
            matches: t('admin.tabs.matches'),
            sports: t('admin.tabs.sports'),
            pages: t('admin.tabs.pages'),
          };
          label = adminLabels[id] ?? id;
        }
      }

      if (!cancelled) {
        setDynamicLabel(label);
        setParentLabel(parent);
      }
    };

    void resolve();
    return () => { cancelled = true; };
  }, [segments, teams, t]);

  // Build breadcrumb trail
  const crumbs = useMemo((): Crumb[] => {
    if (segments.length === 0) return [];
    const [section, id] = segments;
    const basePath = `/${section}`;
    const baseLabel = routeLabels[basePath] ?? section;

    // Single-segment routes (e.g., /tournaments, /profile)
    if (!id) return [{ label: baseLabel, path: basePath }];

    // Two-segment routes (e.g., /tournaments/[id], /matches/[id])
    const trail: Crumb[] = [{ label: baseLabel, path: basePath }];

    if (section === 'matches' && parentLabel) {
      // For matches, inject parent tournament if known
      trail.push({ label: parentLabel, path: '' }); // non-navigable context crumb
    }

    trail.push({ label: dynamicLabel ?? id, path: `${basePath}/${id}` });
    return trail;
  }, [segments, routeLabels, dynamicLabel, parentLabel]);

  // Update document.title on web
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const lastCrumb = crumbs[crumbs.length - 1];
    if (lastCrumb) {
      document.title = `${lastCrumb.label} | ${t('common.appName')}`;
    } else {
      document.title = t('common.appName');
    }
  }, [crumbs, t]);

  // Hide on root, scorekeeper, and auth pages
  if (HIDDEN_ROUTES.includes(pathname)) return null;
  if (crumbs.length === 0) return null;

  const parentCrumb = crumbs.length > 1 ? crumbs[crumbs.length - 2] : { label: t('nav.home'), path: '/' };

  return (
    <View className="z-20 w-full items-center border-b border-slate-200 bg-white/90 px-4 dark:border-slate-800 dark:bg-slate-950/90" style={Platform.OS === 'web' ? { position: 'sticky' as any, top: 0, backdropFilter: 'blur(12px)' } as any : undefined}>
      <View className="w-full max-w-6xl py-2">
        {/* Desktop: full breadcrumb path */}
        <View className="hidden flex-row items-center md:flex">
          <Pressable onPress={() => router.push('/')} className="min-h-9 justify-center touch-manipulation">
            <Text className="text-sm text-slate-400 dark:text-slate-500">{t('nav.home')}</Text>
          </Pressable>
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;
            return (
              <View key={`${crumb.path}-${index}`} className="flex-row items-center">
                <Text className="mx-2 text-slate-300 dark:text-slate-600">/</Text>
                {isLast || !crumb.path ? (
                  <Text className="max-w-[200px] text-sm font-bold text-slate-900 dark:text-white" numberOfLines={1}>{crumb.label}</Text>
                ) : (
                  <Pressable onPress={() => router.push(crumb.path as never)} className="min-h-9 justify-center touch-manipulation">
                    <Text className="max-w-[200px] text-sm text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200" numberOfLines={1}>{crumb.label}</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>

        {/* Mobile: smart back button */}
        <View className="flex-row md:hidden">
          <Pressable
            onPress={() => parentCrumb.path ? router.push(parentCrumb.path as never) : router.back()}
            className="min-h-11 flex-row items-center gap-2 touch-manipulation"
          >
            <Text className="text-lg font-black text-brand">←</Text>
            <Text className="text-sm font-bold text-brand" numberOfLines={1}>
              {t('breadcrumbs.backTo', { name: parentCrumb.label })}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
