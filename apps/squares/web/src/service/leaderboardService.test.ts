import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../axios/api';
import { getLeaderboard, getMyRank } from './leaderboardService';
import type { LeaderboardRankResponse, LeaderboardResponse } from '../types/leaderboard';

vi.mock('../axios/api');

const mockLeaderboard: LeaderboardResponse = {
  entries: [
    { rank: 1, displayName: 'Max', quarterWins: 12, squaresClaimed: 48, quartersPlayed: 48 },
  ],
};

describe('leaderboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch the leaderboard without a limit', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockLeaderboard });

    const result = await getLeaderboard();

    expect(result).toEqual(mockLeaderboard);
    expect(api.get).toHaveBeenCalledWith('/leaderboard', { params: undefined });
  });

  it('should pass the limit through as a query param', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockLeaderboard });

    await getLeaderboard(5);

    expect(api.get).toHaveBeenCalledWith('/leaderboard', { params: { limit: 5 } });
  });

  it('should throw APIError when the leaderboard fails', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('fail'));

    await expect(getLeaderboard()).rejects.toBeDefined();
  });

  it('should fetch the current user rank', async () => {
    const rank: LeaderboardRankResponse = {
      rank: 7,
      totalRanked: 143,
      quarterWins: 5,
      ranked: true,
    };
    vi.mocked(api.get).mockResolvedValue({ data: rank });

    const result = await getMyRank();

    expect(result).toEqual(rank);
    expect(api.get).toHaveBeenCalledWith('/leaderboard/me');
  });

  it('should throw APIError when the rank fails', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('fail'));

    await expect(getMyRank()).rejects.toBeDefined();
  });
});
