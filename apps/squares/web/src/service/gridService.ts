import api from "../config/axios";
import type { Grid } from '../types/grid';
import { handleError } from './handleError';

export async function createGrid(name: string) {
  try {
    const response = await api.post("/grids", { name });
    return response.data;
  } catch (err: unknown) {
    throw handleError(err)
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