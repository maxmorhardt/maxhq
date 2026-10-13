import { createSlice } from '@reduxjs/toolkit';
import type { LeaderboardEntry, LeaderboardRankResponse } from '../../types/leaderboard';
import { fetchLeaderboard, fetchMyRank } from './leaderboardThunks';

interface LeaderboardState {
  entries: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
  myRank: LeaderboardRankResponse | null;
  myRankLoading: boolean;
  myRankError: string | null;
}

const initialState: LeaderboardState = {
  entries: [],
  loading: false,
  error: null,
  myRank: null,
  myRankLoading: false,
  myRankError: null,
};

const leaderboardSlice = createSlice({
  name: 'leaderboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLeaderboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLeaderboard.fulfilled, (state, action) => {
        state.loading = false;
        state.entries = action.payload.entries ?? [];
      })
      .addCase(fetchLeaderboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message ?? 'Failed to fetch leaderboard';
      })
      .addCase(fetchMyRank.pending, (state) => {
        state.myRankLoading = true;
        state.myRankError = null;
      })
      .addCase(fetchMyRank.fulfilled, (state, action) => {
        state.myRankLoading = false;
        state.myRank = action.payload;
      })
      .addCase(fetchMyRank.rejected, (state, action) => {
        state.myRankLoading = false;
        state.myRankError = action.payload?.message ?? 'Failed to fetch your rank';
      });
  },
});

export const leaderboardReducer = leaderboardSlice.reducer;
