import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import api from '../axios/api';
import {
  getContestsByOwner,
  createNewContest,
  updateSquareValueById,
  clearSquareById,
  updateContestById,
  startContest,
  recordQuarterResult,
  deleteContestById,
  submitContactForm,
  getMyContests,
  createInvite,
  getInvites,
  deleteInvite,
  joinContest,
  previewInvite,
  getParticipants,
  updateParticipant,
  removeParticipant,
} from './contestService';
import type { PaginatedContestsResponse, Participant } from '../types/contest';

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
          visibility: 'public',
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

  it('should fetch contests by owner with a search query', async () => {
    const mockResponse = {
      contests: [],
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false,
    };

    vi.mocked(api.get).mockResolvedValue({ data: mockResponse });

    await getContestsByOwner('user123', { page: 1, limit: 10, search: 'foo' });

    expect(api.get).toHaveBeenCalledWith('/contests/owner/user123', {
      params: { page: 1, limit: 10, search: 'foo' },
    });
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

  it('should fetch my contests', async () => {
    const mockContests = [{ id: 'c1', name: 'My Contest' }];
    vi.mocked(api.get).mockResolvedValue({ data: mockContests });

    const result = await getMyContests();

    expect(result).toEqual(mockContests);
    expect(api.get).toHaveBeenCalledWith('/contests/me', { params: undefined });
  });

  it('should fetch my contests with search query', async () => {
    const mockContests = [{ id: 'c1', name: 'Foo Contest' }];
    vi.mocked(api.get).mockResolvedValue({ data: mockContests });

    const result = await getMyContests('foo');

    expect(result).toEqual(mockContests);
    expect(api.get).toHaveBeenCalledWith('/contests/me', { params: { search: 'foo' } });
  });

  it('should throw APIError when getMyContests fails', async () => {
    const apiError = {
      code: 401,
      message: 'Unauthorized',
      timestamp: '2025-01-01T00:00:00Z',
      requestId: 'req-002',
    };
    vi.mocked(api.get).mockRejectedValue(
      new AxiosError('fail', 'ERR_BAD_REQUEST', undefined, {}, {
        data: apiError,
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: { headers: new AxiosHeaders() },
      } as AxiosResponse)
    );

    await expect(getMyContests()).rejects.toEqual(apiError);
  });

  it('should create an invite', async () => {
    const mockResponse = { inviteUrl: 'http://test/join/tok', token: 'tok' };
    vi.mocked(api.post).mockResolvedValue({ data: mockResponse });

    const result = await createInvite('c1', { maxSquares: 10, role: 'participant' });

    expect(result).toEqual(mockResponse);
    expect(api.post).toHaveBeenCalledWith('/contests/c1/invites', {
      maxSquares: 10,
      role: 'participant',
    });
  });

  it('should throw APIError when createInvite fails', async () => {
    const apiError = {
      code: 400,
      message: 'Bad request',
      timestamp: '2025-01-01T00:00:00Z',
      requestId: 'req-003',
    };
    vi.mocked(api.post).mockRejectedValue(
      new AxiosError('fail', 'ERR_BAD_REQUEST', undefined, {}, {
        data: apiError,
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: { headers: new AxiosHeaders() },
      } as AxiosResponse)
    );

    await expect(createInvite('c1', { maxSquares: 10, role: 'participant' })).rejects.toEqual(
      apiError
    );
  });

  it('should fetch invites for a contest', async () => {
    const mockInvites = [{ id: 'i1', token: 'tok', maxSquares: 10 }];
    vi.mocked(api.get).mockResolvedValue({ data: mockInvites });

    const result = await getInvites('c1');

    expect(result).toEqual(mockInvites);
    expect(api.get).toHaveBeenCalledWith('/contests/c1/invites');
  });

  it('should throw APIError when getInvites fails', async () => {
    const apiError = {
      code: 500,
      message: 'Server error',
      timestamp: '2025-01-01T00:00:00Z',
      requestId: 'req-004',
    };
    vi.mocked(api.get).mockRejectedValue(
      new AxiosError('fail', 'ERR_BAD_REQUEST', undefined, {}, {
        data: apiError,
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config: { headers: new AxiosHeaders() },
      } as AxiosResponse)
    );

    await expect(getInvites('c1')).rejects.toEqual(apiError);
  });

  it('should delete an invite', async () => {
    vi.mocked(api.delete).mockResolvedValue({});

    await expect(deleteInvite('c1', 'i1')).resolves.toBeUndefined();
    expect(api.delete).toHaveBeenCalledWith('/contests/c1/invites/i1');
  });

  it('should throw APIError when deleteInvite fails', async () => {
    const apiError = {
      code: 404,
      message: 'Invite not found',
      timestamp: '2025-01-01T00:00:00Z',
      requestId: 'req-005',
    };
    vi.mocked(api.delete).mockRejectedValue(
      new AxiosError('fail', 'ERR_BAD_REQUEST', undefined, {}, {
        data: apiError,
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: { headers: new AxiosHeaders() },
      } as AxiosResponse)
    );

    await expect(deleteInvite('c1', 'i1')).rejects.toEqual(apiError);
  });

  it('should join a contest via invite token', async () => {
    const mockParticipant = { id: 'p1', userId: 'u1', role: 'participant' };
    vi.mocked(api.post).mockResolvedValue({ data: mockParticipant });

    const result = await joinContest('tok123');

    expect(result).toEqual(mockParticipant);
    expect(api.post).toHaveBeenCalledWith('/invites/tok123/redeem');
  });

  it('should throw APIError when joinContest fails', async () => {
    const apiError = {
      code: 409,
      message: 'Already joined',
      timestamp: '2025-01-01T00:00:00Z',
      requestId: 'req-006',
    };
    vi.mocked(api.post).mockRejectedValue(
      new AxiosError('fail', 'ERR_BAD_REQUEST', undefined, {}, {
        data: apiError,
        status: 409,
        statusText: 'Conflict',
        headers: {},
        config: { headers: new AxiosHeaders() },
      } as AxiosResponse)
    );

    await expect(joinContest('tok123')).rejects.toEqual(apiError);
  });

  it('should preview an invite', async () => {
    const mockPreview = { contestName: 'Test', ownerName: 'user1', maxSquares: 10 };
    vi.mocked(api.get).mockResolvedValue({ data: mockPreview });

    const result = await previewInvite('tok123');

    expect(result).toEqual(mockPreview);
    expect(api.get).toHaveBeenCalledWith('/invites/tok123');
  });

  it('should throw APIError when previewInvite fails', async () => {
    const apiError = {
      code: 404,
      message: 'Invite not found',
      timestamp: '2025-01-01T00:00:00Z',
      requestId: 'req-007',
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

    await expect(previewInvite('tok123')).rejects.toEqual(apiError);
  });

  it('should fetch participants for a contest', async () => {
    const mockParticipants = [{ id: 'p1', userId: 'u1', role: 'participant' }] as Participant[];
    vi.mocked(api.get).mockResolvedValue({ data: mockParticipants });

    const result = await getParticipants('c1');

    expect(result).toEqual(mockParticipants);
    expect(api.get).toHaveBeenCalledWith('/contests/c1/participants');
  });

  it('should throw APIError when getParticipants fails', async () => {
    const apiError = {
      code: 403,
      message: 'Forbidden',
      timestamp: '2025-01-01T00:00:00Z',
      requestId: 'req-008',
    };
    vi.mocked(api.get).mockRejectedValue(
      new AxiosError('fail', 'ERR_BAD_REQUEST', undefined, {}, {
        data: apiError,
        status: 403,
        statusText: 'Forbidden',
        headers: {},
        config: { headers: new AxiosHeaders() },
      } as AxiosResponse)
    );

    await expect(getParticipants('c1')).rejects.toEqual(apiError);
  });

  it('should update a participant', async () => {
    const mockParticipant = { id: 'p1', userId: 'u1', role: 'viewer', maxSquares: 5 };
    vi.mocked(api.patch).mockResolvedValue({ data: mockParticipant });

    const result = await updateParticipant('c1', 'u1', { role: 'viewer', maxSquares: 5 });

    expect(result).toEqual(mockParticipant);
    expect(api.patch).toHaveBeenCalledWith('/contests/c1/participants/u1', {
      role: 'viewer',
      maxSquares: 5,
    });
  });

  it('should throw APIError when updateParticipant fails', async () => {
    const apiError = {
      code: 400,
      message: 'Invalid role',
      timestamp: '2025-01-01T00:00:00Z',
      requestId: 'req-009',
    };
    vi.mocked(api.patch).mockRejectedValue(
      new AxiosError('fail', 'ERR_BAD_REQUEST', undefined, {}, {
        data: apiError,
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: { headers: new AxiosHeaders() },
      } as AxiosResponse)
    );

    await expect(updateParticipant('c1', 'u1', { role: 'viewer', maxSquares: 5 })).rejects.toEqual(
      apiError
    );
  });

  it('should remove a participant', async () => {
    vi.mocked(api.delete).mockResolvedValue({});

    await expect(removeParticipant('c1', 'u1')).resolves.toBeUndefined();
    expect(api.delete).toHaveBeenCalledWith('/contests/c1/participants/u1');
  });

  it('should throw APIError when removeParticipant fails', async () => {
    const apiError = {
      code: 404,
      message: 'Participant not found',
      timestamp: '2025-01-01T00:00:00Z',
      requestId: 'req-010',
    };
    vi.mocked(api.delete).mockRejectedValue(
      new AxiosError('fail', 'ERR_BAD_REQUEST', undefined, {}, {
        data: apiError,
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: { headers: new AxiosHeaders() },
      } as AxiosResponse)
    );

    await expect(removeParticipant('c1', 'u1')).rejects.toEqual(apiError);
  });
});
