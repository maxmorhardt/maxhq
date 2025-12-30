import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../axios/api';
import { getContests, getContestById } from './contestService';
import type { Contest, PaginatedContestsResponse } from '../types/contest';

// Mock the axios api module
vi.mock('../axios/api');

describe('contestService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch paginated contests successfully', async () => {
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

    const result = await getContests({ page: 1, limit: 10 });

    expect(result).toEqual(mockResponse);
    expect(result.contests).toHaveLength(1);
    expect(result.contests[0].name).toBe('Test Contest');
    expect(api.get).toHaveBeenCalledWith('/contests', {
      params: { page: 1, limit: 10 },
    });
  });

  it('should fetch a single contest by id', async () => {
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

    const result = await getContestById('123');

    expect(result).toEqual(mockContest);
    expect(result.id).toBe('123');
    expect(result.name).toBe('Super Bowl Contest');
    expect(api.get).toHaveBeenCalledWith('/contests/123');
  });
});
