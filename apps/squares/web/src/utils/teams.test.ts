import { describe, expect, it } from 'vitest';
import { teamAbbr, teamColors } from './teams';

describe('teamColors', () => {
  it('returns a team primary color with light text', () => {
    expect(teamColors('kc')).toEqual({ bg: '#E31837', fg: '#ffffff' });
  });

  it('puts dark text on light team colors', () => {
    expect(teamColors('PIT').fg).toBe('#0b1222');
  });

  it('falls back to the field color for unknown teams', () => {
    expect(teamColors(undefined).bg).toBe('#16223a');
    expect(teamColors('XYZ').bg).toBe('#16223a');
  });
});

describe('teamAbbr', () => {
  it('prefers the feed abbreviation', () => {
    expect(teamAbbr('buf', 'Buffalo Bills')).toBe('BUF');
  });

  it('derives one from the name otherwise', () => {
    expect(teamAbbr(undefined, 'Lions')).toBe('LIO');
    expect(teamAbbr('', undefined)).toBe('?');
  });
});
