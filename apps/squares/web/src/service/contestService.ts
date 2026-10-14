import api from '../axios/api';
import { idempotentRequest } from '../axios/idempotency';
import type {
  Contest,
  ContestFeedParams,
  ContestFeedResponse,
  CreateContestRequest,
  CreateInviteRequest,
  Game,
  Invite,
  InvitePreviewResponse,
  Participant,
  QuarterResult,
  QuarterResultRequest,
  RandomClaimResponse,
  Square,
  UpdateContestRequest,
  UpdateParticipantRequest,
} from '../types/contest';
import { handleError } from './handleError';

export async function getContestFeed(params: ContestFeedParams = {}): Promise<ContestFeedResponse> {
  try {
    const res = await api.get<ContestFeedResponse>('/contests', { params });
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function createNewContest(request: CreateContestRequest) {
  try {
    const res = await idempotentRequest<Contest>({
      method: 'POST',
      url: '/contests',
      data: request,
    });
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function claimSquareById(contestId: string, squareId: string): Promise<Square> {
  try {
    const res = await idempotentRequest<Square>({
      method: 'PUT',
      url: `/contests/${contestId}/squares/${squareId}/claim`,
    });
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function claimRandomSquares(
  contestId: string,
  count: number
): Promise<RandomClaimResponse> {
  try {
    const res = await idempotentRequest<RandomClaimResponse>({
      method: 'POST',
      url: `/contests/${contestId}/squares/random`,
      data: { count },
    });
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function clearSquareById(contestId: string, squareId: string): Promise<Square> {
  try {
    const res = await idempotentRequest<Square>({
      method: 'DELETE',
      url: `/contests/${contestId}/squares/${squareId}/claim`,
    });
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function clearMySquaresByContest(contestId: string): Promise<Square[]> {
  try {
    const res = await idempotentRequest<Square[]>({
      method: 'DELETE',
      url: `/contests/${contestId}/squares/claims`,
    });
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function updateContestById(
  id: string,
  updates: UpdateContestRequest,
  version?: number
): Promise<Contest> {
  try {
    const res = await idempotentRequest<Contest>({
      method: 'PATCH',
      url: `/contests/${id}`,
      data: updates,
      headers: version ? { 'If-Match': `"${version}"` } : undefined,
    });
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function startContest(id: string): Promise<Contest> {
  try {
    const res = await idempotentRequest<Contest>({ method: 'POST', url: `/contests/${id}/start` });
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
    const res = await idempotentRequest<QuarterResult>({
      method: 'POST',
      url: `/contests/${contestId}/quarter-results`,
      data: request,
    });
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function rollbackQuarterResult(contestId: string): Promise<QuarterResult> {
  try {
    const res = await idempotentRequest<QuarterResult>({
      method: 'DELETE',
      url: `/contests/${contestId}/quarter-results/latest`,
    });
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function deleteContestById(id: string): Promise<void> {
  try {
    await idempotentRequest<void>({ method: 'DELETE', url: `/contests/${id}` });
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
    const res = await idempotentRequest<{ message: string }>({
      method: 'POST',
      url: '/contact',
      data: request,
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
    const res = await idempotentRequest<Invite>({
      method: 'POST',
      url: `/contests/${contestId}/invites`,
      data: request,
    });
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
    await idempotentRequest<void>({
      method: 'DELETE',
      url: `/contests/${contestId}/invites/${inviteId}`,
    });
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function getUpcomingGames(): Promise<Game[]> {
  try {
    const res = await api.get<Game[]>('/games/upcoming');
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function joinContest(token: string): Promise<Participant> {
  try {
    const res = await idempotentRequest<Participant>({
      method: 'POST',
      url: `/invites/${token}/redeem`,
    });
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
    const res = await idempotentRequest<Participant>({
      method: 'PATCH',
      url: `/contests/${contestId}/participants/${userId}`,
      data: request,
    });
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function removeParticipant(contestId: string, userId: string): Promise<void> {
  try {
    await idempotentRequest<void>({
      method: 'DELETE',
      url: `/contests/${contestId}/participants/${userId}`,
    });
  } catch (err: unknown) {
    throw handleError(err);
  }
}
