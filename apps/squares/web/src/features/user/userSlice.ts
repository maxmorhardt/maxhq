import { createSlice } from '@reduxjs/toolkit';
import type { UserProfile } from '../../types/user';
import { loadUserProfile, updateUserInitials } from './userThunks';

interface UserState {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  profile: null,
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(loadUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message ?? 'Failed to load profile';
      })
      .addCase(updateUserInitials.fulfilled, (state, action) => {
        state.profile = action.payload;
      });
  },
});

export const userReducer = userSlice.reducer;
