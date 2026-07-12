import api from '../axios/api';
import type {
  Contest,
  CreateContestRequest,
  CreateInviteRequest,
  Invite,
  InvitePreviewResponse,
  PaginatedContestsResponse,
  PaginationParams,
  Participant,
  QuarterResult,
  QuarterResultRequest,
  Square,
  UpdateContestRequest,
  UpdateParticipantRequest,
  UpdateSquareRequest,
} from '../types/contest';
import { handleError } from './handleError';

export async function getContestsByOwner(
  owner: string,
  pagination: PaginationParams
): Promise<PaginatedContestsResponse> {
  try {
    const res = await api.get<PaginatedContestsResponse>(`/contests/owner/${owner}`, {
      params: {
        page: pagination.page,
        limit: pagination.limit,
        ...(pagination.search ? { search: pagination.search } : {}),
      },
    });
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
  request: QuarterResultRequest
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

export async function submitContactForm(request: {
  name: string;
  email: string;
  subject: string;
  message: string;
  turnstileToken: string;
}): Promise<{ message: string }> {
  try {
    const res = await api.post<{ message: string }>('/contact', request);
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function getMyContests(search?: string): Promise<Contest[]> {
  try {
    const res = await api.get<Contest[]>('/contests/me', {
      params: search ? { search } : undefined,
    });
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function createInvite(
  contestId: string,
  request: CreateInviteRequest
): Promise<Invite> {
  try {
    const res = await api.post<Invite>(`/contests/${contestId}/invites`, request);
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function getInvites(contestId: string): Promise<Invite[]> {
  try {
    const res = await api.get<Invite[]>(`/contests/${contestId}/invites`);
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function deleteInvite(contestId: string, inviteId: string): Promise<void> {
  try {
    await api.delete<void>(`/contests/${contestId}/invites/${inviteId}`);
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function joinContest(token: string): Promise<Participant> {
  try {
    const res = await api.post<Participant>(`/invites/${token}/redeem`);
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function previewInvite(token: string): Promise<InvitePreviewResponse> {
  try {
    const res = await api.get<InvitePreviewResponse>(`/invites/${token}`);
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function getParticipants(contestId: string): Promise<Participant[]> {
  try {
    const res = await api.get<Participant[]>(`/contests/${contestId}/participants`);
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function updateParticipant(
  contestId: string,
  userId: string,
  request: UpdateParticipantRequest
): Promise<Participant> {
  try {
    const res = await api.patch<Participant>(
      `/contests/${contestId}/participants/${userId}`,
      request
    );
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function removeParticipant(contestId: string, userId: string): Promise<void> {
  try {
    await api.delete<void>(`/contests/${contestId}/participants/${userId}`);
  } catch (err: unknown) {
    throw handleError(err);
  }
}
