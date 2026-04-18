import api from '../axios/api';
import type {
  Contest,
  CreateContestRequest,
  CreateInviteRequest,
  Invite,
  InvitePreviewResponse,
  InviteResponse,
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

// fetch contests owned by specific owner
export async function getContestsByOwner(
  owner: string,
  pagination: PaginationParams
): Promise<PaginatedContestsResponse> {
  try {
    const res = await api.get<PaginatedContestsResponse>(`/contests/owner/${owner}`, {
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
export async function getContestByOwnerAndName(owner: string, name: string): Promise<Contest> {
  try {
    const res = await api.get<Contest>(`/contests/owner/${owner}/name/${name}`);
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
  turnstileToken: string;
}): Promise<{ message: string }> {
  try {
    const res = await api.post<{ message: string }>('/contact', request);
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

// fetch contests where the current user is a participant
export async function getMyContests(): Promise<Contest[]> {
  try {
    const res = await api.get<Contest[]>('/contests/me');
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

// create invite link for a contest
export async function createInvite(
  contestId: string,
  request: CreateInviteRequest
): Promise<InviteResponse> {
  try {
    const res = await api.post<InviteResponse>(`/contests/${contestId}/invites`, request);
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

// get all invites for a contest
export async function getInvites(contestId: string): Promise<Invite[]> {
  try {
    const res = await api.get<Invite[]>(`/contests/${contestId}/invites`);
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

// delete an invite
export async function deleteInvite(contestId: string, inviteId: string): Promise<void> {
  try {
    await api.delete<void>(`/contests/${contestId}/invites/${inviteId}`);
  } catch (err: unknown) {
    throw handleError(err);
  }
}

// join a contest via invite token
export async function joinContest(token: string): Promise<Participant> {
  try {
    const res = await api.post<Participant>(`/invites/${token}/redeem`);
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

// preview an invite link (no auth required)
export async function previewInvite(token: string): Promise<InvitePreviewResponse> {
  try {
    const res = await api.get<InvitePreviewResponse>(`/invites/${token}`);
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

// get participants for a contest
export async function getParticipants(contestId: string): Promise<Participant[]> {
  try {
    const res = await api.get<Participant[]>(`/contests/${contestId}/participants`);
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

// update a participant's role or max squares
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

// remove a participant from a contest
export async function removeParticipant(contestId: string, userId: string): Promise<void> {
  try {
    await api.delete<void>(`/contests/${contestId}/participants/${userId}`);
  } catch (err: unknown) {
    throw handleError(err);
  }
}
