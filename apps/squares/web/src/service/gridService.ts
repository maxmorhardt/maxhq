import api from "../config/axios";
import type { Grid, GridCell } from '../types/grid';
import { handleError } from './handleError';

export async function createGrid(name: string) {
  try {
    const response = await api.post("/grids", { name });
    return response.data;
  } catch (err: unknown) {
    throw handleError(err)
  }
}

export async function getGridsByUser(user: string): Promise<Grid[]> {
  try {
    const response = await api.get<Grid[]>(`/grids/user/${user}`);
    return response.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function getGridById(id: string): Promise<Grid> {
  try {
    const response = await api.get<Grid>(`/grids/${id}`);
    return response.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function updateCell(cell: GridCell, value: string): Promise<GridCell> {
  try {
    const response = await api.patch<GridCell>(`/grids/cell/${cell.id}`, {
      value: value,
    });
    return response.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}