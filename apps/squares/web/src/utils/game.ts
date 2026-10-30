import type { Contest, Game } from '../types/contest';

// matchups always read "away @ home" to match how scoreboards list them
export function formatMatchup(game: Pick<Game, 'awayTeam' | 'homeTeam'>): string {
  return `${game.awayTeam} @ ${game.homeTeam}`;
}

// the kickoff's day and time apart, for places too narrow to put them on one line
export function kickoffParts(gameTime: string): { day: string; time: string } {
  const kickoff = new Date(gameTime);
  return {
    day: kickoff.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    time: kickoff.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  };
}

export function formatKickoff(gameTime: string): string {
  const { day, time } = kickoffParts(gameTime);
  return `${day} · ${time}`;
}

// espn keeps the period at 2 through the break, but the second quarter's score is recorded when it starts
export const isHalftime = (game: Pick<Game, 'status' | 'period' | 'scores'>) =>
  game.status === 'in_progress' &&
  game.period === 2 &&
  !!game.scores?.some((score) => score.quarter === 2);

// what a scoreboard shows in the middle: the kickoff, the quarter being played, or the final
export function gameClock(game: Pick<Game, 'status' | 'period' | 'gameTime' | 'scores'>): string {
  const overtime = game.period > 4;

  if (game.status === 'final') {
    return overtime ? 'Final/OT' : 'Final';
  }
  if (isHalftime(game)) {
    return 'Halftime';
  }
  if (game.status === 'in_progress') {
    return overtime ? 'OT' : `Q${Math.max(game.period, 1)}`;
  }
  if (game.status === 'postponed') {
    return 'Postponed';
  }
  if (game.status === 'canceled') {
    return 'Canceled';
  }
  return formatKickoff(game.gameTime);
}

export const isLive = (game?: Pick<Game, 'status'>) => game?.status === 'in_progress';

export const isGameOver = (game: Pick<Game, 'status'>) =>
  game.status === 'final' || game.status === 'canceled';

// a game postponed before kickoff has no score to show, unlike one stopped partway through
export const hasKickedOff = (game: Pick<Game, 'status' | 'period'>) =>
  game.status !== 'scheduled' && game.period > 0;

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
