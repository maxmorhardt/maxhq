import { describe, it, expect } from 'vitest';
import { leaderboardKey, toPublicName } from './publicName';

describe('toPublicName', () => {
  it('abbreviates the surname', () => {
    expect(toPublicName('Max Morhardt')).toBe('Max M.');
  });

  it('uses only the final token as the surname', () => {
    expect(toPublicName('Mary Jane Watson')).toBe('Mary W.');
  });

  it('leaves a single name alone', () => {
    expect(toPublicName('Jordan')).toBe('Jordan');
  });

  it('uppercases the surname initial', () => {
    expect(toPublicName('ada lovelace')).toBe('ada L.');
  });

  it('drops the domain from an email', () => {
    expect(toPublicName('max.morhardt@example.com')).toBe('max.morhardt');
  });

  it('falls back for a blank name', () => {
    expect(toPublicName('   ')).toBe('Player');
  });

  it('falls back when the name is only a domain', () => {
    expect(toPublicName('@handle')).toBe('Player');
  });

  it('collapses extra whitespace', () => {
    expect(toPublicName('  Max   Morhardt  ')).toBe('Max M.');
  });
});

describe('leaderboardKey', () => {
  it('combines rank and name', () => {
    expect(leaderboardKey(3, 'Max M.')).toBe('3:Max M.');
  });

  it('distinguishes tied players with the same abbreviated name', () => {
    expect(leaderboardKey(2, 'Max M.')).not.toBe(leaderboardKey(3, 'Max M.'));
  });
});
