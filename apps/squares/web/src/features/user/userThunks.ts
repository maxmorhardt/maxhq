import { createAsyncThunk } from '@reduxjs/toolkit';
import { getMyProfile, getMyStats, updateMyProfile } from '../../service/userService';
import type { APIError } from '../../types/error';
import type { UserProfile, UserStats } from '../../types/user';

export const loadUserProfile = createAsyncThunk<UserProfile, void, { rejectValue: APIError }>(
  'user/loadProfile',
  async (_, { rejectWithValue }) => {
    try {
      return await getMyProfile();
    } catch (err: unknown) {
      return rejectWithValue(err as APIError);
    }
  }
);

export const loadUserStats = createAsyncThunk<UserStats, void, { rejectValue: APIError }>(
  'user/loadStats',
  async (_, { rejectWithValue }) => {
    try {
      return await getMyStats();
    } catch (err: unknown) {
      return rejectWithValue(err as APIError);
    }
  }
);

export const updateUserInitials = createAsyncThunk<UserProfile, string, { rejectValue: APIError }>(
  'user/updateInitials',
  async (defaultInitials, { rejectWithValue }) => {
    try {
      return await updateMyProfile({ defaultInitials });
    } catch (err: unknown) {
      return rejectWithValue(err as APIError);
    }
  }
);
