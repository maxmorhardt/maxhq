import type { RootState } from '../../app/store';
import type { LeaderboardEntry, LeaderboardRankResponse } from '../../types/leaderboard';

export const selectLeaderboard = (state: RootState): LeaderboardEntry[] =>
  state.leaderboard.entries;
export const selectLeaderboardLoading = (state: RootState): boolean => state.leaderboard.loading;
export const selectLeaderboardError = (state: RootState): string | null => state.leaderboard.error;

export const selectMyRank = (state: RootState): LeaderboardRankResponse | null =>
  state.leaderboard.myRank;
export const selectMyRankLoading = (state: RootState): boolean => state.leaderboard.myRankLoading;
export const selectMyRankError = (state: RootState): string | null => state.leaderboard.myRankError;
