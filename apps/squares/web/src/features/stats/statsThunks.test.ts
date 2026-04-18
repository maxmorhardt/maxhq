import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { statsReducer } from './statsSlice';
import { fetchStats } from './statsThunks';

vi.mock('../../service/statsService', () => ({
  getStats: vi.fn(),
}));

import { getStats } from '../../service/statsService';

function createTestStore() {
  return configureStore({ reducer: { stats: statsReducer } });
}

beforeEach(() => vi.clearAllMocks());

describe('statsThunks', () => {
  describe('fetchStats', () => {
    it('fulfilled: sets stats in store', async () => {
      const stats = { contestsCreatedToday: 5, squaresClaimedToday: 50, totalActiveContests: 10 };
      vi.mocked(getStats).mockResolvedValue(stats);
      const store = createTestStore();
      await store.dispatch(fetchStats());
      expect(store.getState().stats.stats).toEqual(stats);
      expect(store.getState().stats.loading).toBe(false);
    });

    it('rejected: sets error in store', async () => {
      vi.mocked(getStats).mockRejectedValue({
        code: 500,
        message: 'fail',
        timestamp: '',
        requestId: '',
      });
      const store = createTestStore();
      await store.dispatch(fetchStats());
      expect(store.getState().stats.error).toBe('fail');
      expect(store.getState().stats.loading).toBe(false);
    });
  });
});
