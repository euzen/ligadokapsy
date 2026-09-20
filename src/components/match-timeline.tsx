import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { Tooltip } from '@/components/ui/tooltip';
import type { Match, MatchEvent, Sport } from '@/types/database';

type TimelinePeriod = {
  period: number;
  label: string;
  events: EnrichedEvent[];
  periodScore: { home: number; away: number };
};

type EnrichedEvent = MatchEvent & {
  clockLabel: string;
  runningScore: { home: number; away: number };
};

const HIDDEN_EVENTS: MatchEvent['event_type'][] = ['timer_start', 'timer_pause', 'period_start', 'period_end', 'match_end'];

export function MatchTimeline({ match, events, sport }: { match: Match; events: MatchEvent[]; sport: Sport | null }) {
  const { t } = useTranslation();
  const periods = buildPeriods(events, sport);

  return (
    <View className="gap-4">
      {periods.map((period) => (
        <View key={period.period} className="gap-2">
          <View className="flex-row items-center justify-between rounded-lg bg-slate-100 px-3 py-1.5 dark:bg-slate-700">
            <Text className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">{period.label}</Text>
            <Text className="text-sm font-black text-slate-900 dark:text-white">{period.periodScore.home} - {period.periodScore.away}</Text>
          </View>
          <View className="gap-1">
            {period.events.map((event) => (
              <TimelineEventRow key={event.id} event={event} match={match} />
            ))}
          </View>
        </View>
      ))}
      {!events.length ? <Text className="py-6 text-center text-slate-500 dark:text-slate-400">{t('matchCenter.noEvents')}</Text> : null}
    </View>
  );
}

function TimelineEventRow({ event, match }: { event: EnrichedEvent; match: Match }) {
  if (event.event_type === 'score') {
    return <GoalRow event={event} match={match} />;
  }
  if (event.event_type === 'yellow_card' || event.event_type === 'red_card') {
    return <CardRow event={event} match={match} />;
  }
  return null;
}

function GoalRow({ event, match }: { event: EnrichedEvent; match: Match }) {
  const { t } = useTranslation();
  const isHome = event.team_id === match.home_team_id;
  const scoreBadge = isHome
    ? `⚽ ${event.runningScore.home} - ${event.runningScore.away}`
    : `${event.runningScore.home} - ${event.runningScore.away} ⚽`;
  const player = formatPlayerName(event.player_name);
  const secondary = event.metadata?.goal_type ? `(${t(`events.goalTypes.${event.metadata.goal_type}`)})` : null;
  const goalTooltip = `${t('events.score')} ${event.clockLabel}${player ? ` — ${player}` : ''}${secondary ? ` ${secondary}` : ''}`;

  return (
    <View className={`flex-row items-center py-1 ${isHome ? 'justify-start' : 'justify-end'}`}>
      {isHome ? (
        <>
          <Text className="w-12 shrink-0 text-right font-mono text-xs font-black text-brand">{event.clockLabel}</Text>
          <Tooltip text={goalTooltip}>
            <View className="mx-2 rounded-lg bg-emerald-100 px-2 py-0.5 dark:bg-emerald-500/20">
              <Text className="text-xs font-black text-emerald-800 dark:text-emerald-300">{scoreBadge}</Text>
            </View>
          </Tooltip>
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-bold text-slate-900 dark:text-white" numberOfLines={1}>{player}</Text>
            {secondary ? <Text className="text-[10px] text-slate-500 dark:text-slate-400">{secondary}</Text> : null}
          </View>
        </>
      ) : (
        <>
          <View className="min-w-0 flex-1 items-end">
            <Text className="text-sm font-bold text-slate-900 dark:text-white" numberOfLines={1}>{player}</Text>
            {secondary ? <Text className="text-[10px] text-slate-500 dark:text-slate-400">{secondary}</Text> : null}
          </View>
          <Tooltip text={goalTooltip}>
            <View className="mx-2 rounded-lg bg-emerald-100 px-2 py-0.5 dark:bg-emerald-500/20">
              <Text className="text-xs font-black text-emerald-800 dark:text-emerald-300">{scoreBadge}</Text>
            </View>
          </Tooltip>
          <Text className="w-12 shrink-0 font-mono text-xs font-black text-brand">{event.clockLabel}</Text>
        </>
      )}
    </View>
  );
}

function CardRow({ event, match }: { event: EnrichedEvent; match: Match }) {
  const { t } = useTranslation();
  const isHome = event.team_id === match.home_team_id;
  const player = formatPlayerName(event.player_name);
  const badge = event.event_type === 'yellow_card' ? '🟨' : '🟥';
  const tooltipText = `${t(`events.${event.event_type}`)} ${event.clockLabel}${player ? ` — ${player}` : ''}`;

  return (
    <View className={`flex-row items-center py-1 ${isHome ? 'justify-start' : 'justify-end'}`}>
      {isHome ? (
        <>
          <Text className="w-12 shrink-0 text-right font-mono text-xs font-black text-brand">{event.clockLabel}</Text>
          <Tooltip text={tooltipText}><View className="mx-2 rounded px-1.5 py-0.5"><Text className="text-sm">{badge}</Text></View></Tooltip>
          <Text className="text-sm font-bold text-slate-900 dark:text-white" numberOfLines={1}>{player}</Text>
        </>
      ) : (
        <>
          <Text className="text-sm font-bold text-slate-900 dark:text-white" numberOfLines={1}>{player}</Text>
          <Tooltip text={tooltipText}><View className="mx-2 rounded px-1.5 py-0.5"><Text className="text-sm">{badge}</Text></View></Tooltip>
          <Text className="w-12 shrink-0 font-mono text-xs font-black text-brand">{event.clockLabel}</Text>
        </>
      )}
    </View>
  );
}

function buildPeriods(events: MatchEvent[], sport: Sport | null): TimelinePeriod[] {
  const config = parsePeriodsConfig(sport?.periods_config);
  const allSorted = sortEvents(events);

  let homeGoals = 0;
  let awayGoals = 0;
  const enrichedMap = new Map<string, EnrichedEvent>();
  for (const evt of allSorted) {
    if (evt.event_type === 'score') {
      homeGoals += evt.score_delta_home;
      awayGoals += evt.score_delta_away;
    }
    if (!HIDDEN_EVENTS.includes(evt.event_type)) {
      enrichedMap.set(evt.id, { ...evt, clockLabel: formatClock(evt.clock_seconds), runningScore: { home: homeGoals, away: awayGoals } });
    }
  }

  const result: TimelinePeriod[] = [];
  let currentPeriod = 1;
  let currentEvents: EnrichedEvent[] = [];
  let periodHomeGoals = 0;
  let periodAwayGoals = 0;

  for (const evt of allSorted) {
    if (evt.event_type === 'period_end' || evt.event_type === 'match_end') {
      result.push({ period: currentPeriod, label: periodLabel(currentPeriod, config), events: currentEvents, periodScore: { home: periodHomeGoals, away: periodAwayGoals } });
      if (currentEvents.length > 0) currentPeriod++;
      currentEvents = [];
      periodHomeGoals = 0;
      periodAwayGoals = 0;
      continue;
    }

    const enriched = enrichedMap.get(evt.id);
    if (!enriched) continue;

    if (enriched.event_type === 'score') {
      periodHomeGoals += enriched.score_delta_home;
      periodAwayGoals += enriched.score_delta_away;
    }
    currentEvents.push(enriched);
  }

  if (currentEvents.length > 0) {
    result.push({ period: currentPeriod, label: periodLabel(currentPeriod, config), events: currentEvents, periodScore: { home: periodHomeGoals, away: periodAwayGoals } });
  }

  return result;
}

function periodLabel(period: number, config: { names?: string[] }) {
  if (config.names && config.names[period - 1]) return config.names[period - 1];
  return `${period}. POLOČAS`;
}

function parsePeriodsConfig(raw: string | undefined) {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function sortEvents(events: MatchEvent[]) {
  return [...events].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

function formatClock(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function formatPlayerName(name: string | null) {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const firstInitial = parts[0][0];
  const lastName = parts.slice(1).join(' ');
  return `${firstInitial}. ${lastName}`;
}
