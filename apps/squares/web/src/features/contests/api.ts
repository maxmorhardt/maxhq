import { baseApi } from '../../api/baseApi';
import type {
  Contest,
  ContestBan,
  ContestFeedParams,
  ContestFeedResponse,
  ContestSnapshot,
  ContestSummary,
  CreateContestRequest,
  InviteLink,
  InvitePreviewResponse,
  Player,
  PlayerIdentity,
  RandomClaimResponse,
  Square,
} from '../../types/contest';

const FEED_PAGE_SIZE = 20;

type FeedFilters = Omit<ContestFeedParams, 'cursor' | 'limit'>;

interface SquareArgs {
  contestId: string;
  squareId: string;
}

interface PlayerArgs {
  contestId: string;
  userId: string;
}

export const contestsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getContestFeed: build.infiniteQuery<ContestFeedResponse, FeedFilters, string>({
      infiniteQueryOptions: {
        initialPageParam: '',
        getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
      },
      query: ({ queryArg, pageParam }) => ({
        url: '/contests',
        params: { ...queryArg, limit: FEED_PAGE_SIZE, cursor: pageParam || undefined },
      }),
      providesTags: ['ContestFeed'],
    }),

    // the contests that block account deletion until they are deleted or left
    getActiveContests: build.query<ContestSummary[], void>({
      query: () => ({ url: '/contests', params: { status: 'active', limit: 50 } }),
      transformResponse: (feed: ContestFeedResponse) => feed.contests,
      providesTags: ['ActiveContests'],
    }),

    hasFinishedOwnContest: build.query<boolean, void>({
      query: () => ({ url: '/contests', params: { role: 'owned', status: 'finished', limit: 1 } }),
      transformResponse: (feed: ContestFeedResponse) => feed.contests.length > 0,
      providesTags: ['ContestFeed'],
    }),

    // a finished contest has nothing left to stream, so it is read once instead
    getContest: build.query<ContestSnapshot, string>({
      query: (id) => `/contests/${id}`,
    }),

    createContest: build.mutation<Contest, CreateContestRequest>({
      query: (body) => ({ url: '/contests', method: 'POST', body }),
      invalidatesTags: ['ContestFeed', 'UserStats'],
    }),

    deleteContest: build.mutation<void, string>({
      query: (id) => ({ url: `/contests/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ContestFeed', 'ActiveContests', 'UserStats'],
    }),

    claimSquare: build.mutation<Square, SquareArgs>({
      query: ({ contestId, squareId }) => ({
        url: `/contests/${contestId}/squares/${squareId}/claim`,
        method: 'PUT',
      }),
    }),

    clearSquare: build.mutation<Square, SquareArgs>({
      query: ({ contestId, squareId }) => ({
        url: `/contests/${contestId}/squares/${squareId}/claim`,
        method: 'DELETE',
      }),
    }),

    claimRandomSquares: build.mutation<RandomClaimResponse, { contestId: string; count: number }>({
      query: ({ contestId, count }) => ({
        url: `/contests/${contestId}/squares/random`,
        method: 'POST',
        body: { count },
      }),
    }),

    clearMySquares: build.mutation<Square[], string>({
      query: (contestId) => ({ url: `/contests/${contestId}/squares/claims`, method: 'DELETE' }),
    }),

    getInviteLink: build.query<InviteLink, string>({
      query: (contestId) => `/contests/${contestId}/invite`,
      providesTags: (_result, _error, contestId) => [{ type: 'InviteLink', id: contestId }],
    }),

    resetInviteLink: build.mutation<InviteLink, string>({
      query: (contestId) => ({ url: `/contests/${contestId}/invite/reset`, method: 'POST' }),
      async onQueryStarted(contestId, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            contestsApi.util.updateQueryData('getInviteLink', contestId, (link) => {
              link.token = data.token;
            })
          );
        } catch {
          // the dialog shows the failure
        }
      },
    }),

    previewInvite: build.query<InvitePreviewResponse, string>({
      query: (token) => `/invites/${token}`,
    }),

    joinContest: build.mutation<Player, string>({
      query: (token) => ({ url: `/invites/${token}/join`, method: 'POST' }),
      invalidatesTags: ['ContestFeed', 'ActiveContests', 'UserStats'],
    }),

    getRoster: build.query<PlayerIdentity[], string>({
      query: (contestId) => `/contests/${contestId}/roster`,
      providesTags: (_result, _error, contestId) => [{ type: 'Roster', id: contestId }],
    }),

    updatePlayer: build.mutation<Player, PlayerArgs & { maxSquares: number }>({
      query: ({ contestId, userId, maxSquares }) => ({
        url: `/contests/${contestId}/players/${userId}`,
        method: 'PATCH',
        body: { maxSquares },
      }),
    }),

    allotSquares: build.mutation<Player[], { contestId: string; maxSquares: number }>({
      query: ({ contestId, maxSquares }) => ({
        url: `/contests/${contestId}/players/allot`,
        method: 'POST',
        body: { maxSquares },
      }),
    }),

    removePlayer: build.mutation<void, PlayerArgs>({
      query: ({ contestId, userId }) => ({
        url: `/contests/${contestId}/players/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { contestId }) => [
        'ContestFeed',
        'ActiveContests',
        { type: 'Bans', id: contestId },
      ],
    }),

    getBans: build.query<ContestBan[], string>({
      query: (contestId) => `/contests/${contestId}/bans`,
      providesTags: (_result, _error, contestId) => [{ type: 'Bans', id: contestId }],
    }),

    unbanPlayer: build.mutation<void, PlayerArgs>({
      query: ({ contestId, userId }) => ({
        url: `/contests/${contestId}/bans/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { contestId }) => [{ type: 'Bans', id: contestId }],
    }),
  }),
});

export const {
  useGetContestFeedInfiniteQuery,
  useGetActiveContestsQuery,
  useHasFinishedOwnContestQuery,
  useCreateContestMutation,
  useDeleteContestMutation,
  useClaimSquareMutation,
  useClearSquareMutation,
  useClaimRandomSquaresMutation,
  useClearMySquaresMutation,
  useGetInviteLinkQuery,
  useResetInviteLinkMutation,
  usePreviewInviteQuery,
  useJoinContestMutation,
  useGetRosterQuery,
  useUpdatePlayerMutation,
  useAllotSquaresMutation,
  useRemovePlayerMutation,
  useGetBansQuery,
  useUnbanPlayerMutation,
} = contestsApi;
