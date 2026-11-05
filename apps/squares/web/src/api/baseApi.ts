import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from './baseQuery';

// features add their endpoints with injectEndpoints, so this stays the one cache for server data
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery,
  refetchOnReconnect: true,
  tagTypes: [
    'ActiveContests',
    'Bans',
    'ContestFeed',
    'InviteLink',
    'Leaderboard',
    'MyRank',
    'Profile',
    'Roster',
    'SiteStats',
    'UserStats',
  ],
  endpoints: () => ({}),
});
