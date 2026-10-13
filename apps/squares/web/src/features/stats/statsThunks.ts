import { createAsyncThunk } from '@reduxjs/toolkit';
import { getStats } from '../../service/statsService';
import type { StatsResponse } from '../../types/stats';
import type { APIError } from '../../types/error';

export const fetchStats = createAsyncThunk<StatsResponse, void, { rejectValue: APIError }>(
  'stats/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getStats();
      return response;
    } catch (err: unknown) {
      return rejectWithValue(err as APIError);
    }
  }
);
