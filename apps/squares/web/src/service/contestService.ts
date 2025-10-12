import api from '../axios/api';
import type { Contest, CreateContestRequest, Square } from '../types/contest';
import { handleError } from './handleError';

export async function getContestsByUser(user: string): Promise<Contest[]> {
  try {
    const res = await api.get<Contest[]>(`/contests/user/${user}`);
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function getContestById(id: string): Promise<Contest> {
  try {
    const res = await api.get<Contest>(`/contests/${id}`);
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function createContestByName(request: CreateContestRequest) {
  try {
    const res = await api.post('/contests', request);
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function updateSquareValueById(id: string, value: string): Promise<Square> {
  try {
    const res = await api.post<Square>(`/contests/square/${id}`, { value: value });
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}
