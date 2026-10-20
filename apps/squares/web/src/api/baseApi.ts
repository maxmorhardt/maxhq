import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from './baseQuery';

// features add their endpoints with injectEndpoints, so this stays the one cache for server data
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery,
  refetchOnReconnect: true,
  tagTypes: [
    'ActiveContests',
    'ContestFeed',
    'Invites',
    'Leaderboard',
    'MyRank',
    'Profile',
    'SiteStats',
    'UserStats',
  ],
  endpoints: () => ({}),
});
