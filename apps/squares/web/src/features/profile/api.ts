import { baseApi } from '../../api/baseApi';
import type { UpdateUserProfileRequest, UserProfile, UserStats } from '../../types/user';

export const profileApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMyProfile: build.query<UserProfile, void>({
      query: () => '/users/me',
      providesTags: ['Profile'],
    }),

    updateMyProfile: build.mutation<UserProfile, UpdateUserProfileRequest>({
      query: (body) => ({ url: '/users/me', method: 'PATCH', body }),
      invalidatesTags: ['Profile'],
    }),

    getMyStats: build.query<UserStats, void>({
      query: () => '/stats/me',
      providesTags: ['UserStats'],
    }),

    deleteMyAccount: build.mutation<void, void>({
      query: () => ({ url: '/users/me', method: 'DELETE' }),
    }),
  }),
});

export const {
  useGetMyProfileQuery,
  useUpdateMyProfileMutation,
  useGetMyStatsQuery,
  useDeleteMyAccountMutation,
} = profileApi;
