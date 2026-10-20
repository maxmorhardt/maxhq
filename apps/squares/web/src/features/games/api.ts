import { baseApi } from '../../api/baseApi';
import type { Scoreboard, ScoreboardWeek } from '../../types/contest';

export const gamesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // no week means the current one
    getScoreboard: build.query<Scoreboard, ScoreboardWeek | undefined>({
      query: (week) => ({ url: '/games/scoreboard', params: week }),
    }),
  }),
});

export const { useGetScoreboardQuery } = gamesApi;
