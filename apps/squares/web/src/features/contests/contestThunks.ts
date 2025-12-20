import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  clearSquareById,
  createNewContest,
  deleteContestById,
  getContestById,
  getContests,
  getContestsByUser,
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
  RecordQuarterResultRequest,
  Square,
  UpdateContestRequest,
} from '../../types/contest';
import type { APIError } from '../../types/error';

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

export const recordQuarterResultThunk = createAsyncThunk<
  QuarterResult,
  { contestId: string; request: RecordQuarterResultRequest },
  { rejectValue: APIError }
>('contests/recordQuarterResult', async ({ contestId, request }, { rejectWithValue }) => {
  try {
    const result = await recordQuarterResult(contestId, request);
    return result;
  } catch (err: unknown) {
    return rejectWithValue(err as APIError);
  }
});
