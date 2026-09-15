import type { Match, Standing, Team } from '@/types/database';

export function calculateStandings(teams: Team[], matches: Match[]): Standing[] {
  const rows = new Map(teams.map((team) => [team.id, { team, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 }]));
  for (const match of matches.filter((item) => item.status === 'finished' && item.home_score !== null && item.away_score !== null)) {
    const home = rows.get(match.home_team_id); const away = rows.get(match.away_team_id); if (!home || !away) continue;
    home.played++; away.played++; home.goalsFor += match.home_score!; home.goalsAgainst += match.away_score!; away.goalsFor += match.away_score!; away.goalsAgainst += match.home_score!;
    if (match.home_score! > match.away_score!) { home.wins++; home.points += 3; away.losses++; } else if (match.away_score! > match.home_score!) { away.wins++; away.points += 3; home.losses++; } else { home.draws++; away.draws++; home.points++; away.points++; }
  }
  for (const row of rows.values()) row.goalDifference = row.goalsFor - row.goalsAgainst;
  return [...rows.values()].sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.team.name.localeCompare(b.team.name));
}
