import api from '../axios/api';
import type { StatsResponse } from '../types/stats';
import { handleError } from './handleError';

export async function getStats(): Promise<StatsResponse> {
  try {
    const res = await api.get<StatsResponse>('/stats');
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}
