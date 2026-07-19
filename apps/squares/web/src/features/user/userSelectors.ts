import type { RootState } from '../../app/store';
import type { UserProfile, UserStats } from '../../types/user';

export const selectUserProfile = (state: RootState): UserProfile | null => state.user.profile;
export const selectUserProfileLoading = (state: RootState): boolean => state.user.loading;
export const selectUserProfileError = (state: RootState): string | null => state.user.error;
export const selectDefaultInitials = (state: RootState): string =>
  state.user.profile?.defaultInitials ?? '';
export const selectUserStats = (state: RootState): UserStats | null => state.user.stats;
export const selectUserStatsLoading = (state: RootState): boolean => state.user.statsLoading;
export const selectUserStatsError = (state: RootState): boolean => state.user.statsError;
