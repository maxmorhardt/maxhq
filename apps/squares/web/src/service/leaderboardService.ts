import api from '../axios/api';
import type { LeaderboardRankResponse, LeaderboardResponse } from '../types/leaderboard';
import { handleError } from './handleError';

export async function getLeaderboard(limit?: number): Promise<LeaderboardResponse> {
  try {
    const res = await api.get<LeaderboardResponse>('/leaderboard', {
      params: limit ? { limit } : undefined,
    });
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}

export async function getMyRank(): Promise<LeaderboardRankResponse> {
  try {
    const res = await api.get<LeaderboardRankResponse>('/leaderboard/me');
    return res.data;
  } catch (err: unknown) {
    throw handleError(err);
  }
}
