import { describe, expect, it } from 'vitest';
import { leaderboardKey } from './leaderboardKey';

describe('leaderboardKey', () => {
  it('joins rank and name so tied players stay apart', () => {
    expect(leaderboardKey(3, 'Max M.')).toBe('3:Max M.');
    expect(leaderboardKey(3, 'Ada L.')).not.toBe(leaderboardKey(3, 'Max M.'));
  });
});
