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
  const [adminContext, setAdminContext] = useState<{ subLabel: string | null; entityLabel: string | null; leafLabel: string | null }>({ subLabel: null, entityLabel: null, leafLabel: null });

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

    const adminLabels: Record<string, string> = {
      users: t('admin.tabs.users'),
      tournaments: t('admin.tabs.tournaments'),
      teams: t('admin.tabs.teams'),
      matches: t('admin.tabs.matches'),
      sports: t('admin.tabs.sports'),
      pages: t('admin.tabs.pages'),
    };

    const resolve = async () => {
      let label: string | null = null;
      let parent: string | null = null;
      const context: { subLabel: string | null; entityLabel: string | null; leafLabel: string | null } = { subLabel: null, entityLabel: null, leafLabel: null };

      if (section === 'admin') {
        const sub = segments[1] ?? null;
        const subId = segments[2] ?? null;
        const leaf = segments[3] ?? null;
        context.subLabel = sub ? (adminLabels[sub] ?? sub) : null;

        if (sub === 'matches' && subId) {
          const bundle = await getPublicMatch(subId);
          if (bundle) {
            context.entityLabel = `${bundle.homeTeam.name} vs ${bundle.awayTeam.name}`;
            if (leaf === 'events') {
              context.leafLabel = `${t('breadcrumbs.events')}: ${context.entityLabel}`;
              context.entityLabel = null;
            }
          }
        }
        label = context.leafLabel ?? context.entityLabel ?? context.subLabel ?? id ?? section;
      } else if (segments.length >= 2 && id) {
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
        }
      }

      if (!cancelled) {
        setDynamicLabel(label);
        setParentLabel(parent);
        setAdminContext(context);
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

    // Deep admin routes (e.g., /admin/matches/[id]/events)
    if (section === 'admin') {
      const sub = segments[1] ?? null;
      const subId = segments[2] ?? null;
      const leaf = segments[3] ?? null;
      const trail: Crumb[] = [{ label: baseLabel, path: basePath }];
      if (sub) trail.push({ label: adminContext.subLabel ?? sub, path: `${basePath}/${sub}` });
      if (subId && adminContext.entityLabel) trail.push({ label: adminContext.entityLabel, path: `${basePath}/${sub}/${subId}` });
      if (leaf) trail.push({ label: dynamicLabel ?? leaf, path: pathname });
      return trail;
    }

    // Two-segment routes (e.g., /tournaments/[id], /matches/[id])
    const trail: Crumb[] = [{ label: baseLabel, path: basePath }];

    if (section === 'matches' && parentLabel) {
      // For matches, inject parent tournament if known
      trail.push({ label: parentLabel, path: '' }); // non-navigable context crumb
    }

    trail.push({ label: dynamicLabel ?? id, path: `${basePath}/${id}` });
    return trail;
  }, [segments, routeLabels, dynamicLabel, parentLabel, adminContext, pathname]);

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
