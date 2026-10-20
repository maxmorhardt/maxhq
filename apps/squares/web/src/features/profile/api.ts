import { baseApi } from '../../api/baseApi';
import type {
  UpdateUserProfileRequest,
  UserActiveContest,
  UserProfile,
  UserStats,
} from '../../types/user';

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
      query: () => '/users/me/stats',
      providesTags: ['UserStats'],
    }),

    getMyActiveContests: build.query<UserActiveContest[], void>({
      query: () => '/users/me/active-contests',
      transformResponse: (contests: UserActiveContest[] | null) => contests ?? [],
      providesTags: ['ActiveContests'],
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
  useGetMyActiveContestsQuery,
  useDeleteMyAccountMutation,
} = profileApi;
