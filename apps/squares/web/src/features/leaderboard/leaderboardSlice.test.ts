import { describe, it, expect } from 'vitest';
import { leaderboardReducer } from './leaderboardSlice';
import { fetchLeaderboard, fetchMyRank } from './leaderboardThunks';
import type { LeaderboardEntry } from '../../types/leaderboard';

const entries: LeaderboardEntry[] = [
  { rank: 1, displayName: 'Max', quarterWins: 12, squaresClaimed: 48, quartersPlayed: 48 },
  { rank: 2, displayName: 'Jordan', quarterWins: 9, squaresClaimed: 40, quartersPlayed: 40 },
];

describe('leaderboardSlice', () => {
  it('should return initial state', () => {
    const state = leaderboardReducer(undefined, { type: 'unknown' });
    expect(state.entries).toEqual([]);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.myRank).toBeNull();
  });

  describe('fetchLeaderboard', () => {
    it('pending: sets loading, clears error', () => {
      const state = leaderboardReducer(undefined, { type: fetchLeaderboard.pending.type });
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('fulfilled: sets entries', () => {
      const state = leaderboardReducer(undefined, {
        type: fetchLeaderboard.fulfilled.type,
        payload: { entries },
      });
      expect(state.loading).toBe(false);
      expect(state.entries).toEqual(entries);
    });

    it('fulfilled: tolerates a null entries list', () => {
      const state = leaderboardReducer(undefined, {
        type: fetchLeaderboard.fulfilled.type,
        payload: { entries: null },
      });
      expect(state.entries).toEqual([]);
    });

    it('rejected: sets error with payload message', () => {
      const state = leaderboardReducer(undefined, {
        type: fetchLeaderboard.rejected.type,
        payload: { message: 'boom' },
      });
      expect(state.error).toBe('boom');
      expect(state.loading).toBe(false);
    });

    it('rejected: uses default error message', () => {
      const state = leaderboardReducer(undefined, {
        type: fetchLeaderboard.rejected.type,
        payload: undefined,
      });
      expect(state.error).toBe('Failed to fetch leaderboard');
    });
  });

  describe('fetchMyRank', () => {
    it('pending: sets loading, clears error', () => {
      const state = leaderboardReducer(undefined, { type: fetchMyRank.pending.type });
      expect(state.myRankLoading).toBe(true);
      expect(state.myRankError).toBeNull();
    });

    it('fulfilled: sets the rank', () => {
      const rank = { rank: 7, totalRanked: 143, quarterWins: 5, ranked: true };
      const state = leaderboardReducer(undefined, {
        type: fetchMyRank.fulfilled.type,
        payload: rank,
      });
      expect(state.myRankLoading).toBe(false);
      expect(state.myRank).toEqual(rank);
    });

    it('rejected: sets error with payload message', () => {
      const state = leaderboardReducer(undefined, {
        type: fetchMyRank.rejected.type,
        payload: { message: 'nope' },
      });
      expect(state.myRankError).toBe('nope');
    });

    it('rejected: uses default error message', () => {
      const state = leaderboardReducer(undefined, {
        type: fetchMyRank.rejected.type,
        payload: undefined,
      });
      expect(state.myRankError).toBe('Failed to fetch your rank');
    });
  });
});
