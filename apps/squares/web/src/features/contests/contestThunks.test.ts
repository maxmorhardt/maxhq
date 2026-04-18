import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { contestReducer } from './contestSlice';
import {
  fetchContestsByOwner,
  fetchContestByOwnerAndName,
  createContest,
  updateSquare,
  clearSquare,
  startContestThunk,
  updateContest,
  deleteContest,
  updateQuarterResult,
  fetchMyContests,
  createContestInvite,
  fetchInvites,
  deleteContestInvite,
  joinContestByToken,
  previewInviteToken,
  fetchParticipants,
  updateContestParticipant,
  removeContestParticipant,
} from './contestThunks';
import type { Contest, Square } from '../../types/contest';

vi.mock('../../service/contestService', () => ({
  getContestsByOwner: vi.fn(),
  getContestByOwnerAndName: vi.fn(),
  createNewContest: vi.fn(),
  updateSquareValueById: vi.fn(),
  clearSquareById: vi.fn(),
  startContest: vi.fn(),
  updateContestById: vi.fn(),
  deleteContestById: vi.fn(),
  recordQuarterResult: vi.fn(),
  getMyContests: vi.fn(),
  createInvite: vi.fn(),
  getInvites: vi.fn(),
  deleteInvite: vi.fn(),
  joinContest: vi.fn(),
  previewInvite: vi.fn(),
  getParticipants: vi.fn(),
  updateParticipant: vi.fn(),
  removeParticipant: vi.fn(),
}));

import {
  getContestsByOwner,
  getContestByOwnerAndName,
  createNewContest,
  updateSquareValueById,
  clearSquareById,
  startContest,
  updateContestById,
  deleteContestById,
  recordQuarterResult,
  getMyContests,
  createInvite,
  getInvites,
  deleteInvite,
  joinContest,
  previewInvite,
  getParticipants,
  updateParticipant,
  removeParticipant,
} from '../../service/contestService';

const mockContest: Contest = {
  id: 'c1',
  name: 'Test',
  xLabels: [],
  yLabels: [],
  homeTeam: 'H',
  awayTeam: 'A',
  status: 'ACTIVE',
  visibility: 'public',
  squares: [],
  owner: 'u1',
  createdAt: '',
  updatedAt: '',
  createdBy: 'u1',
  updatedBy: 'u1',
};

const mockSquare: Square = {
  id: 's1',
  contestId: 'c1',
  row: 0,
  col: 0,
  value: 'v',
  owner: 'u1',
  ownerName: 'User 1',
  createdAt: '',
  updatedAt: '',
  createdBy: 'u1',
  updatedBy: 'u1',
};

function createTestStore() {
  return configureStore({ reducer: { contest: contestReducer } });
}

beforeEach(() => vi.clearAllMocks());

describe('contestThunks', () => {
  describe('fetchContestsByOwner', () => {
    it('fulfilled: dispatches with paginated response', async () => {
      const response = {
        contests: [mockContest],
        page: 1,
        limit: 5,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      };
      vi.mocked(getContestsByOwner).mockResolvedValue(response);
      const store = createTestStore();
      await store.dispatch(
        fetchContestsByOwner({ owner: 'u1', pagination: { page: 1, limit: 5 } })
      );
      expect(store.getState().contest.contests).toHaveLength(1);
    });

    it('rejected: sets error on failure', async () => {
      vi.mocked(getContestsByOwner).mockRejectedValue({
        code: 500,
        message: 'fail',
        timestamp: '',
        requestId: '',
      });
      const store = createTestStore();
      await store.dispatch(
        fetchContestsByOwner({ owner: 'u1', pagination: { page: 1, limit: 5 } })
      );
      expect(store.getState().contest.error).toBe('fail');
    });
  });

  describe('fetchContestByOwnerAndName', () => {
    it('fulfilled: sets current contest', async () => {
      vi.mocked(getContestByOwnerAndName).mockResolvedValue(mockContest);
      const store = createTestStore();
      await store.dispatch(fetchContestByOwnerAndName({ owner: 'u1', name: 'Test' }));
      expect(store.getState().contest.currentContest).toEqual(mockContest);
    });

    it('rejected: sets error', async () => {
      vi.mocked(getContestByOwnerAndName).mockRejectedValue({
        code: 404,
        message: 'not found',
        timestamp: '',
        requestId: '',
      });
      const store = createTestStore();
      await store.dispatch(fetchContestByOwnerAndName({ owner: 'u1', name: 'nope' }));
      expect(store.getState().contest.error).toBe('not found');
    });
  });

  describe('createContest', () => {
    it('fulfilled: adds contest', async () => {
      vi.mocked(createNewContest).mockResolvedValue(mockContest);
      const store = createTestStore();
      await store.dispatch(createContest({ name: 'Test', owner: 'u1' }));
      expect(store.getState().contest.contests).toHaveLength(1);
    });

    it('rejected: sets error', async () => {
      vi.mocked(createNewContest).mockRejectedValue({
        code: 400,
        message: 'bad',
        timestamp: '',
        requestId: '',
      });
      const store = createTestStore();
      await store.dispatch(createContest({ name: 'Test', owner: 'u1' }));
      expect(store.getState().contest.error).toBe('bad');
    });
  });

  describe('updateSquare', () => {
    it('fulfilled: updates square', async () => {
      vi.mocked(updateSquareValueById).mockResolvedValue(mockSquare);
      const store = createTestStore();
      await store.dispatch(
        updateSquare({ contestId: 'c1', squareId: 's1', value: 'v', owner: 'u1' })
      );
      expect(store.getState().contest.squareLoading).toBe(false);
    });

    it('rejected: sets error', async () => {
      vi.mocked(updateSquareValueById).mockRejectedValue({
        code: 400,
        message: 'square fail',
        timestamp: '',
        requestId: '',
      });
      const store = createTestStore();
      await store.dispatch(
        updateSquare({ contestId: 'c1', squareId: 's1', value: 'v', owner: 'u1' })
      );
      expect(store.getState().contest.error).toBe('square fail');
    });
  });

  describe('clearSquare', () => {
    it('fulfilled: clears square', async () => {
      vi.mocked(clearSquareById).mockResolvedValue({ ...mockSquare, value: '', owner: '' });
      const store = createTestStore();
      await store.dispatch(clearSquare({ contestId: 'c1', squareId: 's1' }));
      expect(store.getState().contest.squareLoading).toBe(false);
    });

    it('rejected: sets error', async () => {
      vi.mocked(clearSquareById).mockRejectedValue({
        code: 500,
        message: 'clear fail',
        timestamp: '',
        requestId: '',
      });
      const store = createTestStore();
      await store.dispatch(clearSquare({ contestId: 'c1', squareId: 's1' }));
      expect(store.getState().contest.error).toBe('clear fail');
    });
  });

  describe('startContestThunk', () => {
    it('fulfilled: starts contest', async () => {
      const started = { ...mockContest, status: 'Q1' as const };
      vi.mocked(startContest).mockResolvedValue(started);
      const store = createTestStore();
      await store.dispatch(startContestThunk('c1'));
      expect(store.getState().contest.error).toBeNull();
    });

    it('rejected: sets error', async () => {
      vi.mocked(startContest).mockRejectedValue({
        code: 500,
        message: 'start fail',
        timestamp: '',
        requestId: '',
      });
      const store = createTestStore();
      await store.dispatch(startContestThunk('c1'));
      expect(store.getState().contest.error).toBe('start fail');
    });
  });

  describe('updateContest', () => {
    it('fulfilled: updates contest', async () => {
      const updated = { ...mockContest, homeTeam: 'New' };
      vi.mocked(updateContestById).mockResolvedValue(updated);
      const store = createTestStore();
      await store.dispatch(updateContest({ id: 'c1', updates: { homeTeam: 'New' } }));
      expect(store.getState().contest.error).toBeNull();
    });

    it('rejected: sets error', async () => {
      vi.mocked(updateContestById).mockRejectedValue({
        code: 400,
        message: 'update fail',
        timestamp: '',
        requestId: '',
      });
      const store = createTestStore();
      await store.dispatch(updateContest({ id: 'c1', updates: { homeTeam: 'New' } }));
      expect(store.getState().contest.error).toBe('update fail');
    });
  });

  describe('deleteContest', () => {
    it('fulfilled: deletes contest', async () => {
      vi.mocked(deleteContestById).mockResolvedValue(undefined);
      const store = createTestStore();
      await store.dispatch(deleteContest('c1'));
      expect(store.getState().contest.deleteContestLoading).toBe(false);
    });

    it('rejected: sets error', async () => {
      vi.mocked(deleteContestById).mockRejectedValue({
        code: 500,
        message: 'delete fail',
        timestamp: '',
        requestId: '',
      });
      const store = createTestStore();
      await store.dispatch(deleteContest('c1'));
      expect(store.getState().contest.error).toBe('delete fail');
    });
  });

  describe('updateQuarterResult', () => {
    it('fulfilled: records result', async () => {
      const qr = {
        id: 'qr1',
        contestId: 'c1',
        quarter: 1,
        homeTeamScore: 14,
        awayTeamScore: 7,
        winnerRow: 4,
        winnerCol: 7,
        winner: 'u1',
        winnerName: 'User 1',
        createdAt: '',
        updatedAt: '',
        createdBy: '',
        updatedBy: '',
      };
      vi.mocked(recordQuarterResult).mockResolvedValue(qr);
      const store = createTestStore();
      await store.dispatch(
        updateQuarterResult({ contestId: 'c1', request: { homeTeamScore: 14, awayTeamScore: 7 } })
      );
      expect(store.getState().contest.error).toBeNull();
    });

    it('rejected: sets error', async () => {
      vi.mocked(recordQuarterResult).mockRejectedValue({
        code: 400,
        message: 'qr fail',
        timestamp: '',
        requestId: '',
      });
      const store = createTestStore();
      await store.dispatch(
        updateQuarterResult({ contestId: 'c1', request: { homeTeamScore: 14, awayTeamScore: 7 } })
      );
      expect(store.getState().contest.error).toBe('qr fail');
    });
  });

  describe('fetchMyContests', () => {
    it('fulfilled: sets myContests', async () => {
      vi.mocked(getMyContests).mockResolvedValue([mockContest]);
      const store = createTestStore();
      await store.dispatch(fetchMyContests());
      expect(store.getState().contest.myContests).toHaveLength(1);
    });

    it('rejected: sets error', async () => {
      vi.mocked(getMyContests).mockRejectedValue({
        code: 500,
        message: 'my fail',
        timestamp: '',
        requestId: '',
      });
      const store = createTestStore();
      await store.dispatch(fetchMyContests());
      expect(store.getState().contest.error).toBe('my fail');
    });
  });

  describe('createContestInvite', () => {
    it('fulfilled: returns invite response', async () => {
      vi.mocked(createInvite).mockResolvedValue({ inviteUrl: 'url', token: 'tok' });
      const store = createTestStore();
      const result = await store.dispatch(
        createContestInvite({ contestId: 'c1', request: { maxSquares: 10, role: 'participant' } })
      );
      expect(result.type).toContain('fulfilled');
    });

    it('rejected: sets error', async () => {
      vi.mocked(createInvite).mockRejectedValue({
        code: 400,
        message: 'invite fail',
        timestamp: '',
        requestId: '',
      });
      const store = createTestStore();
      await store.dispatch(
        createContestInvite({ contestId: 'c1', request: { maxSquares: 10, role: 'participant' } })
      );
      expect(store.getState().contest.error).toBe('invite fail');
    });
  });

  describe('fetchInvites', () => {
    it('fulfilled: sets invites', async () => {
      const invite = {
        id: 'i1',
        contestId: 'c1',
        token: 'tok',
        maxSquares: 10,
        role: 'participant' as const,
        uses: 0,
        createdAt: '',
        createdBy: '',
        updatedAt: '',
      };
      vi.mocked(getInvites).mockResolvedValue([invite]);
      const store = createTestStore();
      await store.dispatch(fetchInvites('c1'));
      expect(store.getState().contest.invites).toHaveLength(1);
    });

    it('rejected: sets error', async () => {
      vi.mocked(getInvites).mockRejectedValue({
        code: 500,
        message: 'invites fail',
        timestamp: '',
        requestId: '',
      });
      const store = createTestStore();
      await store.dispatch(fetchInvites('c1'));
      expect(store.getState().contest.error).toBe('invites fail');
    });
  });

  describe('deleteContestInvite', () => {
    it('fulfilled: removes invite', async () => {
      vi.mocked(deleteInvite).mockResolvedValue(undefined);
      const store = createTestStore();
      const result = await store.dispatch(deleteContestInvite({ contestId: 'c1', inviteId: 'i1' }));
      expect(result.type).toContain('fulfilled');
    });

    it('rejected: sets error', async () => {
      vi.mocked(deleteInvite).mockRejectedValue({
        code: 500,
        message: 'del invite fail',
        timestamp: '',
        requestId: '',
      });
      const store = createTestStore();
      await store.dispatch(deleteContestInvite({ contestId: 'c1', inviteId: 'i1' }));
      expect(store.getState().contest.error).toBe('del invite fail');
    });
  });

  describe('joinContestByToken', () => {
    it('fulfilled: returns participant', async () => {
      const participant = {
        id: 'p1',
        contestId: 'c1',
        userId: 'u1',
        inviteId: 'i1',
        role: 'participant' as const,
        maxSquares: 10,
        joinedAt: '',
        createdAt: '',
        updatedAt: '',
      };
      vi.mocked(joinContest).mockResolvedValue(participant);
      const store = createTestStore();
      const result = await store.dispatch(joinContestByToken('tok'));
      expect(result.type).toContain('fulfilled');
    });

    it('rejected: rejects with error', async () => {
      vi.mocked(joinContest).mockRejectedValue({
        code: 400,
        message: 'join fail',
        timestamp: '',
        requestId: '',
      });
      const store = createTestStore();
      const result = await store.dispatch(joinContestByToken('tok'));
      expect(result.type).toContain('rejected');
    });
  });

  describe('previewInviteToken', () => {
    it('fulfilled: returns preview', async () => {
      vi.mocked(previewInvite).mockResolvedValue({
        contestName: 'Test',
        maxSquares: 10,
        owner: 'u1',
        role: 'participant',
      });
      const store = createTestStore();
      const result = await store.dispatch(previewInviteToken('tok'));
      expect(result.type).toContain('fulfilled');
    });

    it('rejected: rejects with error', async () => {
      vi.mocked(previewInvite).mockRejectedValue({
        code: 404,
        message: 'preview fail',
        timestamp: '',
        requestId: '',
      });
      const store = createTestStore();
      const result = await store.dispatch(previewInviteToken('tok'));
      expect(result.type).toContain('rejected');
    });
  });

  describe('fetchParticipants', () => {
    it('fulfilled: sets participants', async () => {
      const participant = {
        id: 'p1',
        contestId: 'c1',
        userId: 'u1',
        inviteId: 'i1',
        role: 'participant' as const,
        maxSquares: 10,
        joinedAt: '',
        createdAt: '',
        updatedAt: '',
      };
      vi.mocked(getParticipants).mockResolvedValue([participant]);
      const store = createTestStore();
      await store.dispatch(fetchParticipants('c1'));
      expect(store.getState().contest.participants).toHaveLength(1);
    });

    it('rejected: sets error', async () => {
      vi.mocked(getParticipants).mockRejectedValue({
        code: 500,
        message: 'participants fail',
        timestamp: '',
        requestId: '',
      });
      const store = createTestStore();
      await store.dispatch(fetchParticipants('c1'));
      expect(store.getState().contest.error).toBe('participants fail');
    });
  });

  describe('updateContestParticipant', () => {
    it('fulfilled: updates participant', async () => {
      const participant = {
        id: 'p1',
        contestId: 'c1',
        userId: 'u1',
        inviteId: 'i1',
        role: 'participant' as const,
        maxSquares: 20,
        joinedAt: '',
        createdAt: '',
        updatedAt: '',
      };
      vi.mocked(updateParticipant).mockResolvedValue(participant);
      const store = createTestStore();
      const result = await store.dispatch(
        updateContestParticipant({ contestId: 'c1', userId: 'u1', request: { maxSquares: 20 } })
      );
      expect(result.type).toContain('fulfilled');
    });

    it('rejected: sets error', async () => {
      vi.mocked(updateParticipant).mockRejectedValue({
        code: 400,
        message: 'update p fail',
        timestamp: '',
        requestId: '',
      });
      const store = createTestStore();
      await store.dispatch(
        updateContestParticipant({ contestId: 'c1', userId: 'u1', request: { maxSquares: 20 } })
      );
      expect(store.getState().contest.error).toBe('update p fail');
    });
  });

  describe('removeContestParticipant', () => {
    it('fulfilled: removes participant', async () => {
      vi.mocked(removeParticipant).mockResolvedValue(undefined);
      const store = createTestStore();
      const result = await store.dispatch(
        removeContestParticipant({ contestId: 'c1', userId: 'u1' })
      );
      expect(result.type).toContain('fulfilled');
    });

    it('rejected: sets error', async () => {
      vi.mocked(removeParticipant).mockRejectedValue({
        code: 500,
        message: 'remove fail',
        timestamp: '',
        requestId: '',
      });
      const store = createTestStore();
      await store.dispatch(removeContestParticipant({ contestId: 'c1', userId: 'u1' }));
      expect(store.getState().contest.error).toBe('remove fail');
    });
  });
});
