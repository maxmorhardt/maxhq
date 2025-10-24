import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  createNewContest,
  deleteContestById,
  getContestById,
  getContests,
  getContestsByUser,
  randomizeContestLabels,
  updateContestById,
  updateSquareValueById,
} from '../../service/contestService';
import type {
  Contest,
  CreateContestRequest,
  PaginatedContestsResponse,
  PaginationParams,
  Square,
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
  { id: string; value: string },
  { rejectValue: APIError }
>('contests/updateSquare', async ({ id, value }, { rejectWithValue }) => {
  try {
    const square = await updateSquareValueById(id, value);
    return square;
  } catch (err: unknown) {
    return rejectWithValue(err as APIError);
  }
});

export const randomizeLabels = createAsyncThunk<Contest, string, { rejectValue: APIError }>(
  'contests/randomizeLabels',
  async (id, { rejectWithValue }) => {
    try {
      const contest = await randomizeContestLabels(id);
      return contest;
    } catch (err: unknown) {
      return rejectWithValue(err as APIError);
    }
  }
);

export const updateContest = createAsyncThunk<
  Contest,
  { id: string; updates: Partial<Contest> },
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
