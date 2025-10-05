import api from "../config/axios";
import type { APIError } from "../types/error";

export async function createGrid(name: string) {
  try {
    const response = await api.post("/grids", { name });
    return response.data;
  } catch (err: unknown) {
    const apiError: APIError = err as APIError;
    console.error("grid creation failed:", apiError);
    throw apiError;
  }
}