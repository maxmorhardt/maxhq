import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  clearSquareById,
  createNewContest,
  deleteContestById,
  getContestByOwnerAndName,
  getContestsByOwner,
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

// fetch single contest by id with all squares and details
export const fetchContestByOwnerAndName = createAsyncThunk<
  Contest,
  { owner: string; name: string },
  { rejectValue: APIError }
>('contests/fetchContestByOwnerAndName', async ({ owner, name }, { rejectWithValue }) => {
  try {
    const response = await getContestByOwnerAndName(owner, name);
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
