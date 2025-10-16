import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  createNewContest,
  getContestById,
  getContestsByUser,
  randomizeContestLabels,
  updateSquareValueById,
} from '../../service/contestService';
import type { Contest, CreateContestRequest, Square } from '../../types/contest';
import type { APIError } from '../../types/error';

export const fetchContestsByUser = createAsyncThunk<Contest[], string, { rejectValue: APIError }>(
  'contests/fetchByUser',
  async (username, { rejectWithValue }) => {
    try {
      const contests = await getContestsByUser(username);
      return contests;
    } catch (err: unknown) {
      return rejectWithValue(err as APIError);
    }
  }
);

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
