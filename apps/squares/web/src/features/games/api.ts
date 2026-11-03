import { baseApi } from '../../api/baseApi';
import type { Game, Scoreboard, ScoreboardQuery } from '../../types/contest';

export const gamesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // no week means the current one
    getScoreboard: build.query<Scoreboard, ScoreboardQuery | undefined>({
      query: (week) => ({ url: '/games/scoreboard', params: week }),
    }),

    getGame: build.query<Game, string>({
      query: (id) => `/games/${encodeURIComponent(id)}`,
    }),
  }),
});

export const { useGetScoreboardQuery, useGetGameQuery } = gamesApi;
