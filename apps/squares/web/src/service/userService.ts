import api from '../axios/api';
import { idempotentRequest } from '../axios/idempotency';
import type {
  UpdateUserProfileRequest,
  UserActiveContest,
  UserProfile,
  UserStats,
} from '../types/user';
import { handleError } from './handleError';

export async function getMyProfile(): Promise<UserProfile> {
  try {
    const res = await api.get<UserProfile>('/users/me');
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function updateMyProfile(request: UpdateUserProfileRequest): Promise<UserProfile> {
  try {
    const res = await idempotentRequest<UserProfile>({
      method: 'PATCH',
      url: '/users/me',
      data: request,
    });
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function getMyStats(): Promise<UserStats> {
  try {
    const res = await api.get<UserStats>('/users/me/stats');
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function getMyActiveContests(): Promise<UserActiveContest[]> {
  try {
    const res = await api.get<UserActiveContest[]>('/users/me/active-contests');
    return res.data ?? [];
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function deleteMyAccount(): Promise<void> {
  try {
    await idempotentRequest<void>({ method: 'DELETE', url: '/users/me' });
  } catch (err: unknown) {
    throw handleError(err);
  }
}
