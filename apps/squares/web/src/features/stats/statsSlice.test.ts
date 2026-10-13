import { describe, it, expect } from 'vitest';
import { statsReducer } from './statsSlice';
import { fetchStats } from './statsThunks';
import type { StatsResponse } from '../../types/stats';

const initialState = {
  stats: null as StatsResponse | null,
  loading: false,
  error: null as string | null,
};

describe('statsSlice', () => {
  it('should return initial state', () => {
    const state = statsReducer(undefined, { type: 'unknown' });
    expect(state.stats).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  describe('fetchStats', () => {
    it('pending: sets loading, clears error', () => {
      const state = statsReducer(
        { ...initialState, error: 'old error' },
        { type: fetchStats.pending.type }
      );
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('fulfilled: sets stats', () => {
      const stats: StatsResponse = {
        contestsCreatedToday: 5,
        squaresClaimedToday: 50,
        totalActiveContests: 10,
      };
      const state = statsReducer(initialState, {
        type: fetchStats.fulfilled.type,
        payload: stats,
      });
      expect(state.loading).toBe(false);
      expect(state.stats).toEqual(stats);
    });

    it('rejected: sets error with payload message', () => {
      const state = statsReducer(initialState, {
        type: fetchStats.rejected.type,
        payload: { message: 'stats fail' },
      });
      expect(state.loading).toBe(false);
      expect(state.error).toBe('stats fail');
    });

    it('rejected: uses default error message', () => {
      const state = statsReducer(initialState, {
        type: fetchStats.rejected.type,
        payload: undefined,
      });
      expect(state.error).toBe('Failed to fetch stats');
    });
  });
});
