import api from "../config/axios";
import { handleError } from './handleError';

export async function createGrid(name: string) {
  try {
    const response = await api.post("/grids", { name });
    return response.data;
  } catch (err: unknown) {
    throw handleError(err)
  }
}
