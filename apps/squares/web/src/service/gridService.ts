import api from "../axios/api";
import type { Grid, GridCell } from "../types/grid";
import { handleError } from "./handleError";

export async function getGridsByUser(user: string): Promise<Grid[]> {
  try {
    const res = await api.get<Grid[]>(`/grids/user/${user}`);
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function getGridById(id: string): Promise<Grid> {
  try {
    const res = await api.get<Grid>(`/grids/${id}`);
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function createGridByName(name: string) {
  try {
    const res = await api.post("/grids", { name: name });
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function updateCellValueById(id: string, value: string): Promise<GridCell> {
  try {
    const res = await api.patch<GridCell>(`/grids/cell/${id}`, { value: value });
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}
