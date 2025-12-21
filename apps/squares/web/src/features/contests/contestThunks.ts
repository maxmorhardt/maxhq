import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  clearSquareById,
  createNewContest,
  deleteContestById,
  getContestById,
  getContests,
  getContestsByUser,
  getParticipatingContests,
  recordQuarterResult,
  startContest,
  updateContestById,
  updateSquareValueById,
} from '../../service/contestService';
import type {
  Contest,
  CreateContestRequest,
  PaginatedContestsResponse,
  PaginationParams,
  QuarterResult,
  QuarterResultRequest,
  Square,
  UpdateContestRequest,
} from '../../types/contest';
import type { APIError } from '../../types/error';

// fetch paginated list of all contests
export const fetchContests = createAsyncThunk<
  PaginatedContestsResponse,
  PaginationParams,
  { rejectValue: APIError }
>('contests/fetchContests', async (pagination, { rejectWithValue }) => {
  try {
    const response = await getContests(pagination);
    return response;
  } catch (err: unknown) {
    return rejectWithValue(err as APIError);
  }
});

// fetch contests owned by specific user
export const fetchContestsByUser = createAsyncThunk<
  PaginatedContestsResponse,
  { username: string; pagination: PaginationParams },
  { rejectValue: APIError }
>('contests/fetchByUser', async ({ username, pagination }, { rejectWithValue }) => {
  try {
    const response = await getContestsByUser(username, pagination);
    return response;
  } catch (err: unknown) {
    return rejectWithValue(err as APIError);
  }
});

// fetch contests user is participating in
export const fetchParticipatingContests = createAsyncThunk<
  PaginatedContestsResponse,
  PaginationParams,
  { rejectValue: APIError }
>('contests/fetchParticipating', async (pagination, { rejectWithValue }) => {
  try {
    const response = await getParticipatingContests(pagination);
    return response;
  } catch (err: unknown) {
    return rejectWithValue(err as APIError);
  }
});

// fetch single contest by id with all squares and details
export const fetchContestById = createAsyncThunk<Contest, string, { rejectValue: APIError }>(
  'contests/fetchContestById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await getContestById(id);
      return response;
    } catch (err: unknown) {
      return rejectWithValue(err as APIError);
    }
  }
);

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
