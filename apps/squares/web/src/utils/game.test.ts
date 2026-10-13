import { describe, it, expect } from 'vitest';
import { formatMatchup } from './game';

describe('formatMatchup', () => {
  it('should format as "away @ home"', () => {
    expect(formatMatchup({ awayTeam: 'Jets', homeTeam: 'Bills' })).toBe('Jets @ Bills');
  });
});
