import api from '../axios/api';
import type {
  Contest,
  CreateContestRequest,
  PaginatedContestsResponse,
  PaginationParams,
  Square,
} from '../types/contest';
import { handleError } from './handleError';

export async function getContests(
  pagination: PaginationParams
): Promise<PaginatedContestsResponse> {
  try {
    const res = await api.get<PaginatedContestsResponse>('/contests', {
      params: {
        page: pagination.page,
        limit: pagination.limit,
      },
    });
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function getContestsByUser(
  user: string,
  pagination: PaginationParams
): Promise<PaginatedContestsResponse> {
  try {
    const res = await api.get<PaginatedContestsResponse>(`/contests/user/${user}`, {
      params: {
        page: pagination.page,
        limit: pagination.limit,
      },
    });
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

export async function createNewContest(request: CreateContestRequest) {
  try {
    const res = await api.put('/contests', request);
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function updateSquareValueById(id: string, value: string): Promise<Square> {
  try {
    const res = await api.patch<Square>(`/contests/square/${id}`, { value: value });
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function randomizeContestLabels(id: string): Promise<Contest> {
  try {
    const res = await api.post<Contest>(`/contests/${id}/randomize-labels`);
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function deleteContestById(id: string): Promise<void> {
  try {
    await api.delete<void>(`/contests/${id}`);
  } catch (err: unknown) {
    throw handleError(err);
  }
}
