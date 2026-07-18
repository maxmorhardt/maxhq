import type { RootState } from '../../app/store';
import type { UserProfile } from '../../types/user';

export const selectUserProfile = (state: RootState): UserProfile | null => state.user.profile;
export const selectUserProfileLoading = (state: RootState): boolean => state.user.loading;
export const selectUserProfileError = (state: RootState): string | null => state.user.error;
export const selectDefaultInitials = (state: RootState): string =>
  state.user.profile?.defaultInitials ?? '';
