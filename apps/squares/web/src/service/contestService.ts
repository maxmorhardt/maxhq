import api from '../axios/api';
import type {
  Contest,
  CreateContestRequest,
  PaginatedContestsResponse,
  PaginationParams,
  QuarterResult,
  QuarterResultRequest,
  Square,
  UpdateContestRequest,
  UpdateSquareRequest,
} from '../types/contest';
import { handleError } from './handleError';

// fetch paginated list of all contests
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

// fetch contests owned by specific user
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

// fetch single contest by id with all details
export async function getContestById(id: string): Promise<Contest> {
  try {
    const res = await api.get<Contest>(`/contests/${id}`);
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

// create new contest
export async function createNewContest(request: CreateContestRequest) {
  try {
    const res = await api.put('/contests', request);
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

// update square with new value and owner
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

// clear square value and remove owner
export async function clearSquareById(contestId: string, squareId: string): Promise<Square> {
  try {
    const res = await api.post<Square>(`/contests/${contestId}/squares/${squareId}/clear`);
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

// update contest details
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

// start contest and lock grid
export async function startContest(id: string): Promise<Contest> {
  try {
    const res = await api.post<Contest>(`/contests/${id}/start`);
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

// record quarter result and determine winner
export async function recordQuarterResult(
  contestId: string,
  request: QuarterResultRequest
): Promise<QuarterResult> {
  try {
    const res = await api.post<QuarterResult>(`/contests/${contestId}/quarter-result`, request);
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

// delete contest by id
export async function deleteContestById(id: string): Promise<void> {
  try {
    await api.delete<void>(`/contests/${id}`);
  } catch (err: unknown) {
    throw handleError(err);
  }
}

// submit contact form
export async function submitContactForm(request: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<{ message: string }> {
  try {
    const res = await api.post<{ message: string }>('/contact', request);
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}
