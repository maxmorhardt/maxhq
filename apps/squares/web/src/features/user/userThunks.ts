import { createAsyncThunk } from '@reduxjs/toolkit';
import { getMyProfile, updateMyProfile } from '../../service/userService';
import type { APIError } from '../../types/error';
import type { UserProfile } from '../../types/user';

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
