import { baseApi } from '../../api/baseApi';
import type { Game, Scoreboard, ScoreboardWeek } from '../../types/contest';

export const gamesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // no week means the current one
    getScoreboard: build.query<Scoreboard, ScoreboardWeek | undefined>({
      query: (week) => ({ url: '/games/scoreboard', params: week }),
    }),

    // the games a new contest can be played on
    getUpcomingGames: build.query<Game[], void>({
      query: () => '/games/upcoming',
    }),

    getGame: build.query<Game, string>({
      query: (id) => `/games/${id}`,
    }),
  }),
});

export const { useGetScoreboardQuery, useGetUpcomingGamesQuery, useGetGameQuery } = gamesApi;
