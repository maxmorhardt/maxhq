import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../axios/api';
import { getStats } from './statsService';
import type { StatsResponse } from '../types/stats';

vi.mock('../axios/api');

describe('statsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch stats successfully', async () => {
    const mockStats: StatsResponse = {
      contestsCreatedToday: 5,
      squaresClaimedToday: 120,
      totalActiveContests: 42,
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockStats });

    const result = await getStats();

    expect(result).toEqual(mockStats);
    expect(api.get).toHaveBeenCalledWith('/stats');
  });

  it('should throw APIError on failure', async () => {
    const { AxiosError, AxiosHeaders } = await import('axios');
    type AxiosResponse = import('axios').AxiosResponse;
    const apiError = {
      code: 500,
      message: 'Internal server error',
      timestamp: '2025-01-01T00:00:00Z',
      requestId: 'req-789',
    };
    vi.mocked(api.get).mockRejectedValue(
      new AxiosError('fail', 'ERR_BAD_RESPONSE', undefined, {}, {
        data: apiError,
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config: { headers: new AxiosHeaders() },
      } as AxiosResponse)
    );

    await expect(getStats()).rejects.toEqual(apiError);
  });
});
