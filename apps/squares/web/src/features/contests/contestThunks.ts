import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  createContestByName,
  getContestById,
  getContestsByUser,
  updateSquareValueById,
} from '../../service/contestService';
import type { Contest, Square } from '../../types/contest';
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
  'contests/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const contest = await getContestById(id);
      return contest;
    } catch (err: unknown) {
      return rejectWithValue(err as APIError);
    }
  }
);

export const createContest = createAsyncThunk<Contest, string, { rejectValue: APIError }>(
  'contests/create',
  async (name, { rejectWithValue }) => {
    try {
      const contest = await createContestByName(name);
      return contest;
    } catch (err: unknown) {
      return rejectWithValue(err as APIError);
    }
  }
);

export const setCurrentSquare = createAsyncThunk<Square, Square>(
  'contests/setCurrentSquare',
  async (square) => {
    return square;
  }
);

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
