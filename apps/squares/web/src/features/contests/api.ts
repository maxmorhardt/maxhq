import { baseApi } from '../../api/baseApi';
import type {
  Contest,
  ContestFeedParams,
  ContestFeedResponse,
  CreateContestRequest,
  CreateInviteRequest,
  Game,
  Invite,
  InvitePreviewResponse,
  Participant,
  QuarterResult,
  QuarterResultRequest,
  RandomClaimResponse,
  Square,
  UpdateContestRequest,
  UpdateParticipantRequest,
} from '../../types/contest';

export const FEED_PAGE_SIZE = 20;

type FeedFilters = Omit<ContestFeedParams, 'cursor' | 'limit'>;

interface SquareArgs {
  contestId: string;
  squareId: string;
}

interface ParticipantArgs {
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

    createContest: build.mutation<Contest, CreateContestRequest>({
      query: (body) => ({ url: '/contests', method: 'POST', body }),
      invalidatesTags: ['ContestFeed', 'UserStats'],
    }),

    // the version guards against overwriting someone else's change; a 412 means it is stale
    updateContest: build.mutation<
      Contest,
      { id: string; updates: UpdateContestRequest; version?: number }
    >({
      query: ({ id, updates, version }) => ({
        url: `/contests/${id}`,
        method: 'PATCH',
        body: updates,
        headers: version ? { 'If-Match': `"${version}"` } : undefined,
      }),
      invalidatesTags: ['ContestFeed'],
    }),

    deleteContest: build.mutation<void, string>({
      query: (id) => ({ url: `/contests/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ContestFeed', 'ActiveContests', 'UserStats'],
    }),

    startContest: build.mutation<Contest, string>({
      query: (id) => ({ url: `/contests/${id}/start`, method: 'POST' }),
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

    recordQuarterResult: build.mutation<
      QuarterResult,
      { contestId: string; request: QuarterResultRequest }
    >({
      query: ({ contestId, request }) => ({
        url: `/contests/${contestId}/quarter-results`,
        method: 'POST',
        body: request,
      }),
    }),

    rollbackQuarterResult: build.mutation<QuarterResult, string>({
      query: (contestId) => ({
        url: `/contests/${contestId}/quarter-results/latest`,
        method: 'DELETE',
      }),
    }),

    getUpcomingGames: build.query<Game[], void>({
      query: () => '/games/upcoming',
    }),

    getInvites: build.query<Invite[], string>({
      query: (contestId) => `/contests/${contestId}/invites`,
      providesTags: ['Invites'],
    }),

    createInvite: build.mutation<Invite, { contestId: string; request: CreateInviteRequest }>({
      query: ({ contestId, request }) => ({
        url: `/contests/${contestId}/invites`,
        method: 'POST',
        body: request,
      }),
      invalidatesTags: ['Invites'],
    }),

    deleteInvite: build.mutation<void, { contestId: string; inviteId: string }>({
      query: ({ contestId, inviteId }) => ({
        url: `/contests/${contestId}/invites/${inviteId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Invites'],
    }),

    previewInvite: build.query<InvitePreviewResponse, string>({
      query: (token) => `/invites/${token}`,
    }),

    redeemInvite: build.mutation<Participant, string>({
      query: (token) => ({ url: `/invites/${token}/redeem`, method: 'POST' }),
      invalidatesTags: ['ContestFeed', 'ActiveContests', 'UserStats'],
    }),

    updateParticipant: build.mutation<
      Participant,
      ParticipantArgs & { request: UpdateParticipantRequest }
    >({
      query: ({ contestId, userId, request }) => ({
        url: `/contests/${contestId}/participants/${userId}`,
        method: 'PATCH',
        body: request,
      }),
    }),

    removeParticipant: build.mutation<void, ParticipantArgs>({
      query: ({ contestId, userId }) => ({
        url: `/contests/${contestId}/participants/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ContestFeed', 'ActiveContests'],
    }),
  }),
});

export const {
  useGetContestFeedInfiniteQuery,
  useCreateContestMutation,
  useUpdateContestMutation,
  useDeleteContestMutation,
  useStartContestMutation,
  useClaimSquareMutation,
  useClearSquareMutation,
  useClaimRandomSquaresMutation,
  useClearMySquaresMutation,
  useRecordQuarterResultMutation,
  useRollbackQuarterResultMutation,
  useGetUpcomingGamesQuery,
  useGetInvitesQuery,
  useCreateInviteMutation,
  useDeleteInviteMutation,
  usePreviewInviteQuery,
  useRedeemInviteMutation,
  useUpdateParticipantMutation,
  useRemoveParticipantMutation,
} = contestsApi;
