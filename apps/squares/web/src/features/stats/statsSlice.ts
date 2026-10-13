import { createSlice } from '@reduxjs/toolkit';
import type { StatsResponse } from '../../types/stats';
import { fetchStats } from './statsThunks';

interface StatsState {
  stats: StatsResponse | null;
  loading: boolean;
  error: string | null;
}

const initialState: StatsState = {
  stats: null,
  loading: false,
  error: null,
};

const statsSlice = createSlice({
  name: 'stats',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message ?? 'Failed to fetch stats';
      });
  },
});

export const statsReducer = statsSlice.reducer;
