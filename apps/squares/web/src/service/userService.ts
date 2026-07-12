import api from '../axios/api';
import type { UserProfile, UserStats } from '../types/user';
import { handleError } from './handleError';

export async function getMyProfile(): Promise<UserProfile> {
  try {
    const res = await api.get<UserProfile>('/users/me');
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

export async function deleteMyAccount(): Promise<void> {
  try {
    await api.delete('/users/me');
  } catch (err: unknown) {
    throw handleError(err);
  }
}
