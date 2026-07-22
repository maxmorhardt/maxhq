import { createAsyncThunk } from '@reduxjs/toolkit';
import { getLeaderboard, getMyRank } from '../../service/leaderboardService';
import type { APIError } from '../../types/error';
import type { LeaderboardRankResponse, LeaderboardResponse } from '../../types/leaderboard';

export const fetchLeaderboard = createAsyncThunk<
  LeaderboardResponse,
  number | undefined,
  { rejectValue: APIError }
>('leaderboard/fetch', async (limit, { rejectWithValue }) => {
  try {
    return await getLeaderboard(limit);
  } catch (err: unknown) {
    return rejectWithValue(err as APIError);
  }
});

export const fetchMyRank = createAsyncThunk<
  LeaderboardRankResponse,
  void,
  { rejectValue: APIError }
>('leaderboard/fetchMyRank', async (_, { rejectWithValue }) => {
  try {
    return await getMyRank();
  } catch (err: unknown) {
    return rejectWithValue(err as APIError);
  }
});
