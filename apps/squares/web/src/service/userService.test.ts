import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../axios/api';
import {
  deleteMyAccount,
  getMyActiveContests,
  getMyProfile,
  getMyStats,
  updateMyProfile,
} from './userService';
import type { UserActiveContest, UserProfile, UserStats } from '../types/user';

vi.mock('../axios/api');

describe('userService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch the profile successfully', async () => {
    const mockProfile: UserProfile = {
      email: 'a@b.com',
      displayName: 'Max',
      defaultInitials: 'MM',
      createdAt: '2026-07-11T00:00:00Z',
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockProfile });

    const result = await getMyProfile();

    expect(result).toEqual(mockProfile);
    expect(api.get).toHaveBeenCalledWith('/users/me');
  });

  it('should update the profile initials successfully', async () => {
    const mockProfile: UserProfile = {
      email: 'a@b.com',
      displayName: 'Max',
      defaultInitials: 'MM',
      createdAt: '2026-07-11T00:00:00Z',
    };

    vi.mocked(api.patch).mockResolvedValue({ data: mockProfile });

    const result = await updateMyProfile({ defaultInitials: 'MM' });

    expect(result).toEqual(mockProfile);
    expect(api.patch).toHaveBeenCalledWith('/users/me', { defaultInitials: 'MM' });
  });

  it('should fetch stats successfully', async () => {
    const mockStats: UserStats = {
      contestsCreated: 3,
      contestsJoined: 7,
      squaresClaimed: 42,
      quarterWins: 5,
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockStats });

    const result = await getMyStats();

    expect(result).toEqual(mockStats);
    expect(api.get).toHaveBeenCalledWith('/users/me/stats');
  });

  it('should fetch active contests successfully', async () => {
    const contests: UserActiveContest[] = [
      { id: 'c1', name: 'pool', owner: 'a@b.com', role: 'owner' },
    ];
    vi.mocked(api.get).mockResolvedValue({ data: contests });

    const result = await getMyActiveContests();

    expect(result).toEqual(contests);
    expect(api.get).toHaveBeenCalledWith('/users/me/active-contests');
  });

  it('should normalize a null active-contests response to an empty array', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: null });

    const result = await getMyActiveContests();

    expect(result).toEqual([]);
  });

  it('should delete the account successfully', async () => {
    vi.mocked(api.delete).mockResolvedValue({});

    await deleteMyAccount();

    expect(api.delete).toHaveBeenCalledWith('/users/me');
  });

  it('should throw APIError on failure', async () => {
    const { AxiosError, AxiosHeaders } = await import('axios');
    type AxiosResponse = import('axios').AxiosResponse;
    const apiError = {
      code: 503,
      message: 'Service temporarily unavailable, please try again later',
      timestamp: '2026-07-11T00:00:00Z',
      requestId: 'req-1',
    };
    vi.mocked(api.get).mockRejectedValue(
      new AxiosError('fail', 'ERR_BAD_RESPONSE', undefined, {}, {
        data: apiError,
        status: 503,
        statusText: 'Service Unavailable',
        headers: {},
        config: { headers: new AxiosHeaders() },
      } as AxiosResponse)
    );

    await expect(getMyProfile()).rejects.toEqual(apiError);
  });
});
