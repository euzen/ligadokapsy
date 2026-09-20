import type { Team } from '@/types/database';

export type BracketMatch = {
  round_number: number;
  bracket_position: number;
  home_team_id: string;
  away_team_id: string;
  next_match_slot: 'home' | 'away' | null;
  bracket_type: 'winner' | 'loser' | 'third_place';
  /** Index of the target match within the generated array — resolved to a real id after creation */
  _next_index: number | null;
};

/** Return the smallest power of 2 >= n */
function nextPow2(n: number) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/** Seed ordering for a bracket of size `n` (power-of-two). Seed 0 = strongest. */
function seedOrder(n: number): number[] {
  if (n === 1) return [0];
  const half = seedOrder(n / 2);
  return half.flatMap((seed) => [seed, n - 1 - seed]);
}

const PLACEHOLDER_TEAM = '__BYE__';

/**
 * Generate a single-elimination bracket for `teams`.
 * Teams are ordered by their index in the array (0 = seed 1).
 * Returns a flat list of bracket matches with internal `_next_index` pointers.
 * If `includeThirdPlace` is true, an extra match is added for losing semifinalists.
 */
export function generatePlayoffBracket(
  teams: Team[],
  options: { includeThirdPlace?: boolean } = {},
): BracketMatch[] {
  const n = teams.length;
  if (n < 2) return [];

  const size = nextPow2(n);
  const totalRounds = Math.log2(size);
  const seeds = seedOrder(size);

  // Assign teams or byes to slots
  const slots: (string | null)[] = seeds.map((seed) => (seed < n ? teams[seed].id : null));

  const matches: BracketMatch[] = [];

  // Build bracket round by round
  const roundSlots: (number | null)[][] = []; // match indices per round

  // Round 1
  const round1: (number | null)[] = [];
  for (let i = 0; i < size / 2; i++) {
    const home = slots[i * 2];
    const away = slots[i * 2 + 1];
    if (home && away) {
      round1.push(matches.length);
      matches.push({
        round_number: 1,
        bracket_position: i,
        home_team_id: home,
        away_team_id: away,
        next_match_slot: null,
        bracket_type: 'winner',
        _next_index: null,
      });
    } else {
      // Bye — no match needed, advance the non-null team
      round1.push(null); // placeholder, actual team advances directly
    }
  }
  roundSlots.push(round1);

  // Build remaining rounds
  for (let round = 2; round <= totalRounds; round++) {
    const prev = roundSlots[round - 2];
    const current: (number | null)[] = [];
    for (let i = 0; i < prev.length / 2; i++) {
      const matchIdx = matches.length;
      current.push(matchIdx);
      matches.push({
        round_number: round,
        bracket_position: i,
        home_team_id: PLACEHOLDER_TEAM,
        away_team_id: PLACEHOLDER_TEAM,
        next_match_slot: null,
        bracket_type: 'winner',
        _next_index: null,
      });

      // Link previous round matches to this one
      const leftIdx = prev[i * 2];
      const rightIdx = prev[i * 2 + 1];
      if (leftIdx !== null) {
        matches[leftIdx]._next_index = matchIdx;
        matches[leftIdx].next_match_slot = 'home';
      } else {
        // Bye — determine which team should advance
        const byeSlotIndex = (round - 2 === 0) ? i * 2 : -1;
        if (byeSlotIndex >= 0) {
          const byeHome = slots[byeSlotIndex * 2];
          const byeAway = slots[byeSlotIndex * 2 + 1];
          const advancer = byeHome ?? byeAway;
          if (advancer) matches[matchIdx].home_team_id = advancer;
        }
      }
      if (rightIdx !== null) {
        matches[rightIdx]._next_index = matchIdx;
        matches[rightIdx].next_match_slot = 'away';
      } else {
        const byeSlotIndex = (round - 2 === 0) ? i * 2 + 1 : -1;
        if (byeSlotIndex >= 0) {
          const byeHome = slots[byeSlotIndex * 2];
          const byeAway = slots[byeSlotIndex * 2 + 1];
          const advancer = byeHome ?? byeAway;
          if (advancer) matches[matchIdx].away_team_id = advancer;
        }
      }
    }
    roundSlots.push(current);
  }

  // Third-place match
  if (options.includeThirdPlace && totalRounds >= 2) {
    matches.push({
      round_number: totalRounds,
      bracket_position: 1,
      home_team_id: PLACEHOLDER_TEAM,
      away_team_id: PLACEHOLDER_TEAM,
      next_match_slot: null,
      bracket_type: 'third_place',
      _next_index: null,
    });
  }

  return matches;
}

export const BRACKET_PLACEHOLDER_TEAM = PLACEHOLDER_TEAM;

/** Round label for the given round number and total rounds */
export function roundLabel(roundNumber: number, totalRounds: number, t: (key: string) => string): string {
  const fromFinal = totalRounds - roundNumber;
  if (fromFinal === 0) return t('bracket.final');
  if (fromFinal === 1) return t('bracket.semifinal');
  if (fromFinal === 2) return t('bracket.quarterfinal');
  if (fromFinal === 3) return t('bracket.roundOf16');
  return `${t('bracket.round')} ${roundNumber}`;
}
