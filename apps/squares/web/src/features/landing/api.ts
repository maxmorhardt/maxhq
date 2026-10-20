import { baseApi } from '../../api/baseApi';
import type { StatsResponse } from '../../types/stats';

export const landingApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSiteStats: build.query<StatsResponse, void>({
      query: () => '/stats',
      providesTags: ['SiteStats'],
    }),
  }),
});

export const { useGetSiteStatsQuery } = landingApi;
