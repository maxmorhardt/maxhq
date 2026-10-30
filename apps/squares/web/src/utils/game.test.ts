import { describe, expect, it } from 'vitest';
import { makeContest, makeQuarterResult } from '../test/fixtures';
import type { Game, GameScore } from '../types/contest';
import {
  currentScore,
  formatKickoff,
  formatMatchup,
  gameClock,
  hasKickedOff,
  isGameOver,
  isHalftime,
  isLive,
  kickoffParts,
} from './game';

const scored = (...quarters: number[]) => quarters.map((quarter) => ({ quarter }) as GameScore);

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

  it('shows halftime once the second quarter is scored', () => {
    expect(
      gameClock({ status: 'in_progress', period: 2, gameTime: kickoff, scores: scored(1, 2) })
    ).toBe('Halftime');
    expect(
      gameClock({ status: 'in_progress', period: 2, gameTime: kickoff, scores: scored(1) })
    ).toBe('Q2');
  });

  it('shows the final, noting overtime', () => {
    expect(gameClock({ status: 'final', period: 4, gameTime: kickoff })).toBe('Final');
    expect(gameClock({ status: 'final', period: 5, gameTime: kickoff })).toBe('Final/OT');
  });

  it('shows a postponed or canceled game as such', () => {
    expect(gameClock({ status: 'postponed', period: 0, gameTime: kickoff })).toBe('Postponed');
    expect(gameClock({ status: 'canceled', period: 1, gameTime: kickoff })).toBe('Canceled');
  });
});

describe('isHalftime', () => {
  const scores = scored(2);

  it('is true only in the break after the second quarter', () => {
    expect(isHalftime({ status: 'in_progress', period: 2, scores })).toBe(true);
    expect(isHalftime({ status: 'in_progress', period: 2 })).toBe(false);
    expect(isHalftime({ status: 'in_progress', period: 3, scores })).toBe(false);
    expect(isHalftime({ status: 'canceled', period: 2, scores })).toBe(false);
  });
});

describe('isLive', () => {
  it('is true only for a game in progress', () => {
    expect(isLive({ status: 'in_progress' })).toBe(true);
    expect(isLive({ status: 'final' })).toBe(false);
    expect(isLive(undefined)).toBe(false);
  });
});

describe('isGameOver', () => {
  it('is true once the game can no longer change', () => {
    expect(isGameOver({ status: 'final' })).toBe(true);
    expect(isGameOver({ status: 'canceled' })).toBe(true);
    expect(isGameOver({ status: 'in_progress' })).toBe(false);
    expect(isGameOver({ status: 'postponed' })).toBe(false);
  });
});

describe('hasKickedOff', () => {
  it('is true once a period has been played', () => {
    expect(hasKickedOff({ status: 'scheduled', period: 0 })).toBe(false);
    expect(hasKickedOff({ status: 'postponed', period: 0 })).toBe(false);
    expect(hasKickedOff({ status: 'postponed', period: 2 })).toBe(true);
    expect(hasKickedOff({ status: 'in_progress', period: 1 })).toBe(true);
    expect(hasKickedOff({ status: 'canceled', period: 1 })).toBe(true);
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

describe('kickoffParts', () => {
  it('splits the kickoff into the day and the time', () => {
    const { day, time } = kickoffParts('2026-10-25T17:00:00Z');
    expect(formatKickoff('2026-10-25T17:00:00Z')).toBe(`${day} · ${time}`);
    expect(day).not.toContain(':');
    expect(time).toMatch(/\d:\d\d/);
  });
});
