import { describe, expect, it } from 'vitest';
import { makeContest, makeQuarterResult } from '../test/fixtures';
import type { Game } from '../types/contest';
import {
  currentScore,
  formatKickoff,
  formatMatchup,
  gameClock,
  hasWeek,
  isLive,
  weekLabel,
} from './game';

describe('formatMatchup', () => {
  it('should format as "away @ home"', () => {
    expect(formatMatchup({ awayTeam: 'Jets', homeTeam: 'Bills' })).toBe('Jets @ Bills');
  });
});

describe('gameClock', () => {
  const kickoff = '2026-10-25T17:00:00Z';

  it('shows the kickoff before the game', () => {
    expect(gameClock({ status: 'scheduled', period: 0, gameTime: kickoff })).toBe(
      formatKickoff(kickoff)
    );
  });

  it('shows the quarter while it is played', () => {
    expect(gameClock({ status: 'in_progress', period: 3, gameTime: kickoff })).toBe('Q3');
    expect(gameClock({ status: 'in_progress', period: 0, gameTime: kickoff })).toBe('Q1');
    expect(gameClock({ status: 'in_progress', period: 5, gameTime: kickoff })).toBe('OT');
  });

  it('shows the final, noting overtime', () => {
    expect(gameClock({ status: 'final', period: 4, gameTime: kickoff })).toBe('Final');
    expect(gameClock({ status: 'final', period: 5, gameTime: kickoff })).toBe('Final/OT');
  });
});

describe('isLive', () => {
  it('is true only for a game in progress', () => {
    expect(isLive({ status: 'in_progress' })).toBe(true);
    expect(isLive({ status: 'final' })).toBe(false);
    expect(isLive(undefined)).toBe(false);
  });
});

describe('weeks', () => {
  it('names regular, preseason, and postseason weeks', () => {
    expect(weekLabel(2, 7)).toBe('Week 7');
    expect(weekLabel(1, 2)).toBe('Preseason Week 2');
    expect(weekLabel(3, 5)).toBe('Super Bowl');
    expect(weekLabel(3, 9)).toBe('Postseason Week 9');
  });

  it('knows which weeks exist', () => {
    expect(hasWeek(2, 18)).toBe(true);
    expect(hasWeek(2, 19)).toBe(false);
    expect(hasWeek(3, 0)).toBe(false);
    expect(hasWeek(9, 3)).toBe(true);
  });
});

describe('currentScore', () => {
  it('reads the game when there is one', () => {
    const game = { homeScore: 17, awayScore: 10 } as Game;
    expect(currentScore(makeContest(), game)).toEqual({ away: 10, home: 17 });
  });

  it('otherwise reads the latest recorded quarter', () => {
    const quarterResults = [
      makeQuarterResult({ quarter: 1, homeTeamScore: 7, awayTeamScore: 3 }),
      makeQuarterResult({ id: 'qr-2', quarter: 2, homeTeamScore: 14, awayTeamScore: 10 }),
    ];
    expect(currentScore(makeContest({ quarterResults }), undefined)).toEqual({
      away: 10,
      home: 14,
    });
    expect(currentScore(makeContest(), undefined)).toBeNull();
  });
});
