import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  clearSquareById,
  createInvite,
  createNewContest,
  deleteContestById,
  deleteInvite,
  getContestsByOwner,
  getInvites,
  getMyContests,
  getParticipants,
  joinContest,
  previewInvite,
  recordQuarterResult,
  removeParticipant,
  startContest,
  updateContestById,
  updateParticipant,
  updateSquareValueById,
} from '../../service/contestService';
import type {
  Contest,
  CreateContestRequest,
  CreateInviteRequest,
  Invite,
  InvitePreviewResponse,
  InviteResponse,
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

// fetch contests owned by specific user
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

// create new contest with name, owner, and optional team names
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

// update square with new value and owner
export const updateSquare = createAsyncThunk<
  Square,
  { contestId: string; squareId: string; value: string; owner: string },
  { rejectValue: APIError }
>('contests/updateSquare', async ({ contestId, squareId, value, owner }, { rejectWithValue }) => {
  try {
    const square = await updateSquareValueById(contestId, squareId, { value, owner });
    return square;
  } catch (err: unknown) {
    return rejectWithValue(err as APIError);
  }
});

// clear square value and remove owner
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

// start contest and lock grid for play
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

// update contest details (name, teams, status)
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

// delete contest by id
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

// record quarter result with scores and determine winner
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

// fetch contests where current user is a participant
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

// create invite link for a contest
export const createContestInvite = createAsyncThunk<
  InviteResponse,
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

// fetch all invites for a contest
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

// delete an invite
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

// join a contest via invite token
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

// preview an invite link (no auth required)
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

// fetch participants for a contest
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

// update a participant's role or max squares
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

// remove a participant from a contest
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
