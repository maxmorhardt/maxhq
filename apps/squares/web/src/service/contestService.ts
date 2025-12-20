import api from '../axios/api';
import type {
  Contest,
  CreateContestRequest,
  PaginatedContestsResponse,
  PaginationParams,
  QuarterResult,
  RecordQuarterResultRequest,
  Square,
  UpdateContestRequest,
  UpdateSquareRequest,
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

export async function updateSquareValueById(
  contestId: string,
  squareId: string,
  request: UpdateSquareRequest
): Promise<Square> {
  try {
    const res = await api.patch<Square>(`/contests/${contestId}/squares/${squareId}`, request);
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function clearSquareById(contestId: string, squareId: string): Promise<Square> {
  try {
    const res = await api.post<Square>(`/contests/${contestId}/squares/${squareId}/clear`);
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function updateContestById(
  id: string,
  updates: UpdateContestRequest
): Promise<Contest> {
  try {
    const res = await api.patch<Contest>(`/contests/${id}`, updates);
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function startContest(id: string): Promise<Contest> {
  try {
    const res = await api.post<Contest>(`/contests/${id}/start`);
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function recordQuarterResult(
  contestId: string,
  request: RecordQuarterResultRequest
): Promise<QuarterResult> {
  try {
    const res = await api.post<QuarterResult>(`/contests/${contestId}/quarter-result`, request);
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

export async function submitContactForm(
  request: { name: string; email: string; subject: string; message: string }
): Promise<{ message: string }> {
  try {
    const res = await api.post<{ message: string }>('/contact', request);
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}
