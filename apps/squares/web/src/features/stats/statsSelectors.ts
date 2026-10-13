import type { RootState } from '../../app/store';
import type { StatsResponse } from '../../types/stats';

export const selectStats = (state: RootState): StatsResponse | null => state.stats.stats;
export const selectStatsLoading = (state: RootState): boolean => state.stats.loading;
export const selectStatsError = (state: RootState): string | null => state.stats.error;
