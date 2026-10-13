import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  claimSquareById,
  clearMySquaresByContest,
  clearSquareById,
  createInvite,
  createNewContest,
  deleteContestById,
  deleteInvite,
  getContestsByOwner,
  getInvites,
  getMyContests,
  getParticipants,
  getUpcomingGames,
  joinContest,
  previewInvite,
  recordQuarterResult,
  removeParticipant,
  rollbackQuarterResult,
  startContest,
  updateContestById,
  updateParticipant,
} from '../../service/contestService';
import type {
  Contest,
  CreateContestRequest,
  CreateInviteRequest,
  Game,
  Invite,
  InvitePreviewResponse,
  PaginatedContestsResponse,
  PaginationParams,
  Participant,
  QuarterResult,
  QuarterResultRequest,
  Square,
  UpdateContestRequest,
  UpdateParticipantRequest,
} from '../../types/contest';
import type { APIError } from '../../types/error';

export const fetchContestsByOwner = createAsyncThunk<
  PaginatedContestsResponse,
  { owner: string; pagination: PaginationParams },
  { rejectValue: APIError }
>('contests/fetchByUser', async ({ owner, pagination }, { rejectWithValue }) => {
  try {
    const response = await getContestsByOwner(owner, pagination);
    return response;
  } catch (err: unknown) {
    return rejectWithValue(err as APIError);
  }
});

export const createContest = createAsyncThunk<
  Contest,
  CreateContestRequest,
  { rejectValue: APIError }
>('contests/create', async (params, { rejectWithValue }) => {
  try {
    const contest = await createNewContest(params);
    return contest;
  } catch (err: unknown) {
    return rejectWithValue(err as APIError);
  }
});

export const claimSquare = createAsyncThunk<
  Square,
  { contestId: string; squareId: string },
  { rejectValue: APIError }
>('contests/claimSquare', async ({ contestId, squareId }, { rejectWithValue }) => {
  try {
    const square = await claimSquareById(contestId, squareId);
    return square;
  } catch (err: unknown) {
    return rejectWithValue(err as APIError);
  }
});

export const clearSquare = createAsyncThunk<
  Square,
  { contestId: string; squareId: string },
  { rejectValue: APIError }
>('contests/clearSquare', async ({ contestId, squareId }, { rejectWithValue }) => {
  try {
    const square = await clearSquareById(contestId, squareId);
    return square;
  } catch (err: unknown) {
    return rejectWithValue(err as APIError);
  }
});

export const clearMySquares = createAsyncThunk<
  Square[],
  { contestId: string },
  { rejectValue: APIError }
>('contests/clearMySquares', async ({ contestId }, { rejectWithValue }) => {
  try {
    const squares = await clearMySquaresByContest(contestId);
    return squares;
  } catch (err: unknown) {
    return rejectWithValue(err as APIError);
  }
});

export const startContestThunk = createAsyncThunk<Contest, string, { rejectValue: APIError }>(
  'contests/startContest',
  async (id, { rejectWithValue }) => {
    try {
      const contest = await startContest(id);
      return contest;
    } catch (err: unknown) {
      return rejectWithValue(err as APIError);
    }
  }
);

export const updateContest = createAsyncThunk<
  Contest,
  { id: string; updates: UpdateContestRequest },
  { rejectValue: APIError }
>('contests/updateContest', async ({ id, updates }, { rejectWithValue }) => {
  try {
    const contest = await updateContestById(id, updates);
    return contest;
  } catch (err: unknown) {
    return rejectWithValue(err as APIError);
  }
});

export const deleteContest = createAsyncThunk<void, string, { rejectValue: APIError }>(
  'contests/deleteContest',
  async (id, { rejectWithValue }) => {
    try {
      await deleteContestById(id);
    } catch (err: unknown) {
      return rejectWithValue(err as APIError);
    }
  }
);

export const updateQuarterResult = createAsyncThunk<
  QuarterResult,
  { contestId: string; request: QuarterResultRequest },
  { rejectValue: APIError }
>('contests/recordQuarterResult', async ({ contestId, request }, { rejectWithValue }) => {
  try {
    const result = await recordQuarterResult(contestId, request);
    return result;
  } catch (err: unknown) {
    return rejectWithValue(err as APIError);
  }
});

export const rollbackLastQuarterResult = createAsyncThunk<
  QuarterResult,
  { contestId: string },
  { rejectValue: APIError }
>('contests/rollbackQuarterResult', async ({ contestId }, { rejectWithValue }) => {
  try {
    const result = await rollbackQuarterResult(contestId);
    return result;
  } catch (err: unknown) {
    return rejectWithValue(err as APIError);
  }
});

export const fetchUpcomingGames = createAsyncThunk<Game[], void, { rejectValue: APIError }>(
  'contests/fetchUpcomingGames',
  async (_, { rejectWithValue }) => {
    try {
      return await getUpcomingGames();
    } catch (err: unknown) {
      return rejectWithValue(err as APIError);
    }
  }
);

export const fetchMyContests = createAsyncThunk<
  Contest[],
  string | void,
  { rejectValue: APIError }
>('contests/fetchMyContests', async (search, { rejectWithValue }) => {
  try {
    const response = await getMyContests(typeof search === 'string' ? search : undefined);
    return response;
  } catch (err: unknown) {
    return rejectWithValue(err as APIError);
  }
});

export const createContestInvite = createAsyncThunk<
  Invite,
  { contestId: string; request: CreateInviteRequest },
  { rejectValue: APIError }
>('contests/createInvite', async ({ contestId, request }, { rejectWithValue }) => {
  try {
    const invite = await createInvite(contestId, request);
    return invite;
  } catch (err: unknown) {
    return rejectWithValue(err as APIError);
  }
});

export const fetchInvites = createAsyncThunk<Invite[], string, { rejectValue: APIError }>(
  'contests/fetchInvites',
  async (contestId, { rejectWithValue }) => {
    try {
      const invites = await getInvites(contestId);
      return invites;
    } catch (err: unknown) {
      return rejectWithValue(err as APIError);
    }
  }
);

export const deleteContestInvite = createAsyncThunk<
  string,
  { contestId: string; inviteId: string },
  { rejectValue: APIError }
>('contests/deleteInvite', async ({ contestId, inviteId }, { rejectWithValue }) => {
  try {
    await deleteInvite(contestId, inviteId);
    return inviteId;
  } catch (err: unknown) {
    return rejectWithValue(err as APIError);
  }
});

export const joinContestByToken = createAsyncThunk<Participant, string, { rejectValue: APIError }>(
  'contests/joinByToken',
  async (token, { rejectWithValue }) => {
    try {
      const response = await joinContest(token);
      return response;
    } catch (err: unknown) {
      return rejectWithValue(err as APIError);
    }
  }
);

export const previewInviteToken = createAsyncThunk<
  InvitePreviewResponse,
  string,
  { rejectValue: APIError }
>('contests/previewInvite', async (token, { rejectWithValue }) => {
  try {
    const response = await previewInvite(token);
    return response;
  } catch (err: unknown) {
    return rejectWithValue(err as APIError);
  }
});

export const fetchParticipants = createAsyncThunk<Participant[], string, { rejectValue: APIError }>(
  'contests/fetchParticipants',
  async (contestId, { rejectWithValue }) => {
    try {
      const participants = await getParticipants(contestId);
      return participants;
    } catch (err: unknown) {
      return rejectWithValue(err as APIError);
    }
  }
);

export const updateContestParticipant = createAsyncThunk<
  Participant,
  { contestId: string; userId: string; request: UpdateParticipantRequest },
  { rejectValue: APIError }
>('contests/updateParticipant', async ({ contestId, userId, request }, { rejectWithValue }) => {
  try {
    const participant = await updateParticipant(contestId, userId, request);
    return participant;
  } catch (err: unknown) {
    return rejectWithValue(err as APIError);
  }
});

export const removeContestParticipant = createAsyncThunk<
  string,
  { contestId: string; userId: string },
  { rejectValue: APIError }
>('contests/removeParticipant', async ({ contestId, userId }, { rejectWithValue }) => {
  try {
    await removeParticipant(contestId, userId);
    return userId;
  } catch (err: unknown) {
    return rejectWithValue(err as APIError);
  }
});
