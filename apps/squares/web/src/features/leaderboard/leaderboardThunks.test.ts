import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { leaderboardReducer } from './leaderboardSlice';
import { fetchLeaderboard, fetchMyRank } from './leaderboardThunks';

vi.mock('../../service/leaderboardService', () => ({
  getLeaderboard: vi.fn(),
  getMyRank: vi.fn(),
}));

import { getLeaderboard, getMyRank } from '../../service/leaderboardService';

function createTestStore() {
  return configureStore({ reducer: { leaderboard: leaderboardReducer } });
}

beforeEach(() => vi.clearAllMocks());

describe('leaderboardThunks', () => {
  describe('fetchLeaderboard', () => {
    it('fulfilled: sets entries in store', async () => {
      const entries = [
        { rank: 1, displayName: 'Max', quarterWins: 12, squaresClaimed: 48, quartersPlayed: 48 },
      ];
      vi.mocked(getLeaderboard).mockResolvedValue({ entries });

      const store = createTestStore();
      await store.dispatch(fetchLeaderboard(undefined));

      expect(store.getState().leaderboard.entries).toEqual(entries);
      expect(store.getState().leaderboard.loading).toBe(false);
    });

    it('passes the limit to the service', async () => {
      vi.mocked(getLeaderboard).mockResolvedValue({ entries: [] });

      const store = createTestStore();
      await store.dispatch(fetchLeaderboard(5));

      expect(getLeaderboard).toHaveBeenCalledWith(5);
    });

    it('rejected: sets error in store', async () => {
      vi.mocked(getLeaderboard).mockRejectedValue({
        code: 500,
        message: 'fail',
        timestamp: '',
        requestId: '',
      });

      const store = createTestStore();
      await store.dispatch(fetchLeaderboard(undefined));

      expect(store.getState().leaderboard.error).toBe('fail');
    });
  });

  describe('fetchMyRank', () => {
    it('fulfilled: sets rank in store', async () => {
      const rank = { rank: 7, totalRanked: 143, quarterWins: 5, ranked: true };
      vi.mocked(getMyRank).mockResolvedValue(rank);

      const store = createTestStore();
      await store.dispatch(fetchMyRank());

      expect(store.getState().leaderboard.myRank).toEqual(rank);
    });

    it('rejected: sets error in store', async () => {
      vi.mocked(getMyRank).mockRejectedValue({
        code: 500,
        message: 'rank fail',
        timestamp: '',
        requestId: '',
      });

      const store = createTestStore();
      await store.dispatch(fetchMyRank());

      expect(store.getState().leaderboard.myRankError).toBe('rank fail');
    });
  });
});
