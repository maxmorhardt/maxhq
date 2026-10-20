import { baseApi } from '../../api/baseApi';
import type {
  LeaderboardEntry,
  LeaderboardRankResponse,
  LeaderboardResponse,
} from '../../types/leaderboard';

export const leaderboardApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getLeaderboard: build.query<LeaderboardEntry[], void>({
      query: () => '/leaderboard',
      transformResponse: (response: LeaderboardResponse) => response.entries ?? [],
      providesTags: ['Leaderboard'],
    }),

    getMyRank: build.query<LeaderboardRankResponse, void>({
      query: () => '/leaderboard/me',
      providesTags: ['MyRank'],
    }),
  }),
});

export const { useGetLeaderboardQuery, useGetMyRankQuery } = leaderboardApi;
