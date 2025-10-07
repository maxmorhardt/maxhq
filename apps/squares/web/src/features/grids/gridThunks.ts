import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  createGridByName,
  getGridById,
  getGridsByUser,
  updateCellValueById,
} from '../../service/gridService';
import type { APIError } from '../../types/error';
import type { Grid, GridCell } from '../../types/grid';

export const fetchGridsByUser = createAsyncThunk<Grid[], string, { rejectValue: APIError }>(
  'grids/fetchByUser',
  async (username, { rejectWithValue }) => {
    try {
      const grids = await getGridsByUser(username);
      return grids;
    } catch (err: unknown) {
      return rejectWithValue(err as APIError);
    }
  }
);

export const fetchGridById = createAsyncThunk<Grid, string, { rejectValue: APIError }>(
  'grids/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const grid = await getGridById(id);
      return grid;
    } catch (err: unknown) {
      return rejectWithValue(err as APIError);
    }
  }
);

export const createGrid = createAsyncThunk<Grid, string, { rejectValue: APIError }>(
  'grids/create',
  async (name, { rejectWithValue }) => {
    try {
      const grid = await createGridByName(name);
      return grid;
    } catch (err: unknown) {
      return rejectWithValue(err as APIError);
    }
  }
);

export const setCurrentCell = createAsyncThunk<GridCell, GridCell>(
  'grids/setCurrentCell',
  async (cell) => {
    return cell;
  }
);

export const updateCell = createAsyncThunk<
  GridCell,
  { id: string; value: string },
  { rejectValue: APIError }
>('grids/updateCell', async ({ id, value }, { rejectWithValue }) => {
  try {
    const cell = await updateCellValueById(id, value);
    return cell;
  } catch (err: unknown) {
    return rejectWithValue(err as APIError);
  }
});
