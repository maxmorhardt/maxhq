import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../axios/api';
import { getContestsByOwner, getContestByOwnerAndName } from './contestService';
import type { Contest, PaginatedContestsResponse } from '../types/contest';

// Mock the axios api module
vi.mock('../axios/api');

describe('contestService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch paginated contests for owner successfully', async () => {
    const mockResponse: PaginatedContestsResponse = {
      contests: [
        {
          id: '1',
          name: 'Test Contest',
          owner: 'user123',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
          createdBy: 'user123',
          updatedBy: 'user123',
          xLabels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
          yLabels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
          status: 'ACTIVE',
          squares: [],
          quarterResults: [],
        },
      ],
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockResponse });

    const result = await getContestsByOwner('user123', { page: 1, limit: 10 });

    expect(result).toEqual(mockResponse);
    expect(result.contests).toHaveLength(1);
    expect(result.contests[0].name).toBe('Test Contest');
    expect(api.get).toHaveBeenCalledWith('/contests/owner/user123', {
      params: { page: 1, limit: 10 },
    });
  });

  it('should fetch a single contest by owner and name', async () => {
    const mockContest: Contest = {
      id: '123',
      name: 'Super Bowl Contest',
      owner: 'user456',
      createdAt: '2025-01-15T00:00:00Z',
      updatedAt: '2025-01-15T00:00:00Z',
      createdBy: 'user456',
      updatedBy: 'user456',
      xLabels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      yLabels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      status: 'ACTIVE',
      squares: [],
      quarterResults: [],
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockContest });

    const result = await getContestByOwnerAndName('user456', 'Super Bowl Contest');

    expect(result).toEqual(mockContest);
    expect(result.id).toBe('123');
    expect(result.name).toBe('Super Bowl Contest');
    expect(api.get).toHaveBeenCalledWith('/contests/owner/user456/name/Super Bowl Contest');
  });
});
