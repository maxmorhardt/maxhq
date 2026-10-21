import type { Contest, Game } from '../types/contest';

// matchups always read "away @ home" to match how scoreboards list them
export function formatMatchup(game: Pick<Game, 'awayTeam' | 'homeTeam'>): string {
  return `${game.awayTeam} @ ${game.homeTeam}`;
}

export function formatKickoff(gameTime: string): string {
  const kickoff = new Date(gameTime);
  const day = kickoff.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const time = kickoff.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}

// what a scoreboard shows in the middle: the kickoff, the quarter being played, or the final
export function gameClock(game: Pick<Game, 'status' | 'period' | 'gameTime'>): string {
  const overtime = game.period > 4;

  if (game.status === 'final') {
    return overtime ? 'Final/OT' : 'Final';
  }
  if (game.status === 'in_progress') {
    return overtime ? 'OT' : `Q${Math.max(game.period, 1)}`;
  }
  return formatKickoff(game.gameTime);
}

export const isLive = (game?: Pick<Game, 'status'>) => game?.status === 'in_progress';

// the regular season has 18 weeks and the postseason 5, so stepping stays within real weeks
const lastWeek: Record<number, number> = { 1: 4, 2: 18, 3: 5 };

export function weekLabel(seasonType: number, week: number): string {
  if (seasonType === 1) {
    return `Preseason Week ${week}`;
  }
  if (seasonType === 3) {
    return (
      ['Wild Card', 'Divisional Round', 'Conference Championships', 'Pro Bowl', 'Super Bowl'][
        week - 1
      ] ?? `Postseason Week ${week}`
    );
  }
  return `Week ${week}`;
}

export function hasWeek(seasonType: number, week: number): boolean {
  return week >= 1 && week <= (lastWeek[seasonType] ?? 18);
}

// the score as the scoreboard should show it: the live game, else the last recorded quarter
export function currentScore(
  contest: Contest,
  game: Game | undefined
): { away: number; home: number } | null {
  if (game) {
    return { away: game.awayScore, home: game.homeScore };
  }

  const results = contest.quarterResults ?? [];
  const latest = results.reduce<(typeof results)[number] | undefined>(
    (best, qr) => (!best || qr.quarter > best.quarter ? qr : best),
    undefined
  );
  return latest ? { away: latest.awayTeamScore, home: latest.homeTeamScore } : null;
}
