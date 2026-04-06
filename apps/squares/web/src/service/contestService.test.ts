import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import api from '../axios/api';
import {
  getContestsByOwner,
  getContestByOwnerAndName,
  createNewContest,
  updateSquareValueById,
  clearSquareById,
  updateContestById,
  startContest,
  recordQuarterResult,
  deleteContestById,
  submitContactForm,
} from './contestService';
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

  it('should throw APIError when getContestsByOwner fails', async () => {
    const apiError = {
      code: 404,
      message: 'Not found',
      timestamp: '2025-01-01T00:00:00Z',
      requestId: 'req-001',
    };
    vi.mocked(api.get).mockRejectedValue(
      new AxiosError('fail', 'ERR_BAD_REQUEST', undefined, {}, {
        data: apiError,
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: { headers: new AxiosHeaders() },
      } as AxiosResponse)
    );

    await expect(getContestsByOwner('user123', { page: 1, limit: 10 })).rejects.toEqual(apiError);
  });

  it('should create a new contest', async () => {
    const mockResponse = { id: 'new-1', name: 'New Contest' };
    vi.mocked(api.put).mockResolvedValue({ data: mockResponse });

    const result = await createNewContest({ name: 'New Contest', owner: 'user1' });

    expect(result).toEqual(mockResponse);
    expect(api.put).toHaveBeenCalledWith('/contests', { name: 'New Contest', owner: 'user1' });
  });

  it('should update a square value', async () => {
    const mockSquare = { id: 'sq-1', value: 'Alice', row: 0, col: 0 };
    vi.mocked(api.patch).mockResolvedValue({ data: mockSquare });

    const result = await updateSquareValueById('c1', 'sq-1', { value: 'Alice', owner: 'o1' });

    expect(result).toEqual(mockSquare);
    expect(api.patch).toHaveBeenCalledWith('/contests/c1/squares/sq-1', {
      value: 'Alice',
      owner: 'o1',
    });
  });

  it('should clear a square', async () => {
    const mockSquare = { id: 'sq-1', value: '', row: 0, col: 0 };
    vi.mocked(api.post).mockResolvedValue({ data: mockSquare });

    const result = await clearSquareById('c1', 'sq-1');

    expect(result).toEqual(mockSquare);
    expect(api.post).toHaveBeenCalledWith('/contests/c1/squares/sq-1/clear');
  });

  it('should update contest details', async () => {
    const mockContest = { id: 'c1', homeTeam: 'Eagles' };
    vi.mocked(api.patch).mockResolvedValue({ data: mockContest });

    const result = await updateContestById('c1', { homeTeam: 'Eagles' });

    expect(result).toEqual(mockContest);
    expect(api.patch).toHaveBeenCalledWith('/contests/c1', { homeTeam: 'Eagles' });
  });

  it('should start a contest', async () => {
    const mockContest = { id: 'c1', status: 'Q1' };
    vi.mocked(api.post).mockResolvedValue({ data: mockContest });

    const result = await startContest('c1');

    expect(result).toEqual(mockContest);
    expect(api.post).toHaveBeenCalledWith('/contests/c1/start');
  });

  it('should record a quarter result', async () => {
    const mockResult = { quarter: 1, homeTeamScore: 14, awayTeamScore: 7 };
    vi.mocked(api.post).mockResolvedValue({ data: mockResult });

    const result = await recordQuarterResult('c1', { homeTeamScore: 14, awayTeamScore: 7 });

    expect(result).toEqual(mockResult);
    expect(api.post).toHaveBeenCalledWith('/contests/c1/quarter-result', {
      homeTeamScore: 14,
      awayTeamScore: 7,
    });
  });

  it('should delete a contest', async () => {
    vi.mocked(api.delete).mockResolvedValue({});

    await expect(deleteContestById('c1')).resolves.toBeUndefined();
    expect(api.delete).toHaveBeenCalledWith('/contests/c1');
  });

  it('should submit a contact form', async () => {
    const mockResponse = { message: 'Success' };
    vi.mocked(api.post).mockResolvedValue({ data: mockResponse });

    const request = {
      name: 'John',
      email: 'john@example.com',
      subject: 'Help',
      message: 'Need help',
      turnstileToken: 'token123',
    };
    const result = await submitContactForm(request);

    expect(result).toEqual(mockResponse);
    expect(api.post).toHaveBeenCalledWith('/contact', request);
  });
});
