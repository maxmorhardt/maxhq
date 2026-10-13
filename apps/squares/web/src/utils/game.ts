import type { Game } from '../types/contest';

// matchups always read "away @ home" to match how scoreboards list them
export function formatMatchup(game: Pick<Game, 'awayTeam' | 'homeTeam'>): string {
  return `${game.awayTeam} @ ${game.homeTeam}`;
}
