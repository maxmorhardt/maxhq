import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import api from '../axios/api';
import {
  getContestFeed,
  createNewContest,
  claimRandomSquares,
  claimSquareById,
  clearSquareById,
  clearMySquaresByContest,
  updateContestById,
  startContest,
  recordQuarterResult,
  rollbackQuarterResult,
  deleteContestById,
  submitContactForm,
  getUpcomingGames,
  createInvite,
  getInvites,
  deleteInvite,
  joinContest,
  previewInvite,
  getParticipants,
  updateParticipant,
  removeParticipant,
} from './contestService';
import type { Participant } from '../types/contest';

// mock the axios api module
vi.mock('../axios/api');

describe('contestService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch the contest feed', async () => {
    const mockResponse = { contests: [{ id: 'c1', name: 'Test Contest' }], nextCursor: 'next' };
    vi.mocked(api.get).mockResolvedValue({ data: mockResponse });

    const result = await getContestFeed({
      cursor: 'abc',
      limit: 10,
      role: 'joined',
      status: 'live',
    });

    expect(result).toEqual(mockResponse);
    expect(api.get).toHaveBeenCalledWith('/contests', {
      params: { cursor: 'abc', limit: 10, role: 'joined', status: 'live' },
    });
  });

  it('should throw APIError when getContestFeed fails', async () => {
    const apiError = {
      code: 400,
      message: 'Invalid cursor parameter',
      timestamp: '2025-01-01T00:00:00Z',
      requestId: 'req-001',
    };
    vi.mocked(api.get).mockRejectedValue(
      new AxiosError('fail', 'ERR_BAD_REQUEST', undefined, {}, {
        data: apiError,
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: { headers: new AxiosHeaders() },
      } as AxiosResponse)
    );

    await expect(getContestFeed({ cursor: 'abc' })).rejects.toEqual(apiError);
  });

  it('should create a new contest', async () => {
    const mockResponse = { id: 'new-1', name: 'New Contest' };
    vi.mocked(api.request).mockResolvedValue({ data: mockResponse });

    const result = await createNewContest({ name: 'New Contest', owner: 'user1' });

    expect(result).toEqual(mockResponse);
    expect(api.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: '/contests',
        data: { name: 'New Contest', owner: 'user1' },
      })
    );
  });

  it('should claim a square', async () => {
    const mockSquare = { id: 'sq-1', value: 'AB', row: 0, col: 0 };
    vi.mocked(api.request).mockResolvedValue({ data: mockSquare });

    const result = await claimSquareById('c1', 'sq-1');

    expect(result).toEqual(mockSquare);
    expect(api.request).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'PUT', url: '/contests/c1/squares/sq-1/claim' })
    );
  });

  it('should claim random squares in one request', async () => {
    const mockResponse = { squares: [{ id: 'sq-1' }], requested: 2 };
    vi.mocked(api.request).mockResolvedValue({ data: mockResponse });

    const result = await claimRandomSquares('c1', 2);

    expect(result).toEqual(mockResponse);
    expect(api.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: '/contests/c1/squares/random',
        data: { count: 2 },
      })
    );
  });

  it('should clear a square', async () => {
    const mockSquare = { id: 'sq-1', value: '', row: 0, col: 0 };
    vi.mocked(api.request).mockResolvedValue({ data: mockSquare });

    const result = await clearSquareById('c1', 'sq-1');

    expect(result).toEqual(mockSquare);
    expect(api.request).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'DELETE', url: '/contests/c1/squares/sq-1/claim' })
    );
  });

  it("should clear all of the caller's squares", async () => {
    const mockSquares = [
      { id: 'sq-1', value: '', row: 0, col: 0 },
      { id: 'sq-2', value: '', row: 1, col: 1 },
    ];
    vi.mocked(api.request).mockResolvedValue({ data: mockSquares });

    const result = await clearMySquaresByContest('c1');

    expect(result).toEqual(mockSquares);
    expect(api.request).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'DELETE', url: '/contests/c1/squares/claims' })
    );
  });

  it('should update contest details', async () => {
    const mockContest = { id: 'c1', homeTeam: 'Eagles' };
    vi.mocked(api.request).mockResolvedValue({ data: mockContest });

    const result = await updateContestById('c1', { homeTeam: 'Eagles' });

    expect(result).toEqual(mockContest);
    expect(api.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'PATCH',
        url: '/contests/c1',
        data: { homeTeam: 'Eagles' },
      })
    );
  });

  it('should start a contest', async () => {
    const mockContest = { id: 'c1', status: 'Q1' };
    vi.mocked(api.request).mockResolvedValue({ data: mockContest });

    const result = await startContest('c1');

    expect(result).toEqual(mockContest);
    expect(api.request).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST', url: '/contests/c1/start' })
    );
  });

  it('should record a quarter result', async () => {
    const mockResult = { quarter: 1, homeTeamScore: 14, awayTeamScore: 7 };
    vi.mocked(api.request).mockResolvedValue({ data: mockResult });

    const result = await recordQuarterResult('c1', { homeTeamScore: 14, awayTeamScore: 7 });

    expect(result).toEqual(mockResult);
    expect(api.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: '/contests/c1/quarter-results',
        data: {
          homeTeamScore: 14,
          awayTeamScore: 7,
        },
      })
    );
  });

  it('should roll back a quarter result', async () => {
    const mockResult = { quarter: 2, homeTeamScore: 21, awayTeamScore: 10 };
    vi.mocked(api.request).mockResolvedValue({ data: mockResult });

    const result = await rollbackQuarterResult('c1');

    expect(result).toEqual(mockResult);
    expect(api.request).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'DELETE', url: '/contests/c1/quarter-results/latest' })
    );
  });

  it('should delete a contest', async () => {
    vi.mocked(api.request).mockResolvedValue({});

    await expect(deleteContestById('c1')).resolves.toBeUndefined();
    expect(api.request).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'DELETE', url: '/contests/c1' })
    );
  });

  it('should submit a contact form', async () => {
    const mockResponse = { message: 'Success' };
    vi.mocked(api.request).mockResolvedValue({ data: mockResponse });

    const request = {
      name: 'John',
      email: 'john@example.com',
      subject: 'Help',
      message: 'Need help',
      turnstileToken: 'token123',
    };
    const result = await submitContactForm(request);

    expect(result).toEqual(mockResponse);
    expect(api.request).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST', url: '/contact', data: request })
    );
  });

  it('should fetch upcoming games', async () => {
    const mockGames = [{ id: 'g1', homeTeam: 'Bills', awayTeam: 'Jets' }];
    vi.mocked(api.get).mockResolvedValue({ data: mockGames });

    const result = await getUpcomingGames();

    expect(result).toEqual(mockGames);
    expect(api.get).toHaveBeenCalledWith('/games/upcoming');
  });

  it('should throw APIError when getUpcomingGames fails', async () => {
    const apiError = {
      code: 500,
      message: 'Failed to get upcoming games',
      timestamp: '2025-01-01T00:00:00Z',
      requestId: 'req-games',
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

    await expect(getUpcomingGames()).rejects.toEqual(apiError);
  });

  it('should create an invite', async () => {
    const mockResponse = {
      id: 'i1',
      contestId: 'c1',
      token: 'tok',
      maxSquares: 10,
      role: 'participant',
      uses: 0,
      createdAt: '2025-01-01T00:00:00Z',
      createdBy: 'owner1',
      updatedAt: '2025-01-01T00:00:00Z',
    };
    vi.mocked(api.request).mockResolvedValue({ data: mockResponse });

    const result = await createInvite('c1', { maxSquares: 10, role: 'participant' });

    expect(result).toEqual(mockResponse);
    expect(api.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: '/contests/c1/invites',
        data: {
          maxSquares: 10,
          role: 'participant',
        },
      })
    );
  });

  it('should throw APIError when createInvite fails', async () => {
    const apiError = {
      code: 400,
      message: 'Bad request',
      timestamp: '2025-01-01T00:00:00Z',
      requestId: 'req-003',
    };
    vi.mocked(api.request).mockRejectedValue(
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
    vi.mocked(api.request).mockResolvedValue({});

    await expect(deleteInvite('c1', 'i1')).resolves.toBeUndefined();
    expect(api.request).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'DELETE', url: '/contests/c1/invites/i1' })
    );
  });

  it('should throw APIError when deleteInvite fails', async () => {
    const apiError = {
      code: 404,
      message: 'Invite not found',
      timestamp: '2025-01-01T00:00:00Z',
      requestId: 'req-005',
    };
    vi.mocked(api.request).mockRejectedValue(
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
    vi.mocked(api.request).mockResolvedValue({ data: mockParticipant });

    const result = await joinContest('tok123');

    expect(result).toEqual(mockParticipant);
    expect(api.request).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST', url: '/invites/tok123/redeem' })
    );
  });

  it('should throw APIError when joinContest fails', async () => {
    const apiError = {
      code: 409,
      message: 'Already joined',
      timestamp: '2025-01-01T00:00:00Z',
      requestId: 'req-006',
    };
    vi.mocked(api.request).mockRejectedValue(
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
    vi.mocked(api.request).mockResolvedValue({ data: mockParticipant });

    const result = await updateParticipant('c1', 'u1', { role: 'viewer', maxSquares: 5 });

    expect(result).toEqual(mockParticipant);
    expect(api.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'PATCH',
        url: '/contests/c1/participants/u1',
        data: {
          role: 'viewer',
          maxSquares: 5,
        },
      })
    );
  });

  it('should throw APIError when updateParticipant fails', async () => {
    const apiError = {
      code: 400,
      message: 'Invalid role',
      timestamp: '2025-01-01T00:00:00Z',
      requestId: 'req-009',
    };
    vi.mocked(api.request).mockRejectedValue(
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
    vi.mocked(api.request).mockResolvedValue({});

    await expect(removeParticipant('c1', 'u1')).resolves.toBeUndefined();
    expect(api.request).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'DELETE', url: '/contests/c1/participants/u1' })
    );
  });

  it('should throw APIError when removeParticipant fails', async () => {
    const apiError = {
      code: 404,
      message: 'Participant not found',
      timestamp: '2025-01-01T00:00:00Z',
      requestId: 'req-010',
    };
    vi.mocked(api.request).mockRejectedValue(
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
