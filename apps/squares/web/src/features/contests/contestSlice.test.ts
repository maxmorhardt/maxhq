import { describe, it, expect } from 'vitest';
import {
  contestReducer,
  clearError,
  setCurrentContest,
  setCurrentSquare,
  updateContestFromWebSocket,
  updateSquareFromWebSocket,
  updateQuarterResultFromWebSocket,
} from './contestSlice';
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
  fetchParticipants,
  updateContestParticipant,
  removeContestParticipant,
  fetchInvites,
  createContestInvite,
  deleteContestInvite,
} from './contestThunks';
import type {
  Contest,
  Square,
  Participant,
  Invite,
  PaginatedContestsResponse,
  QuarterResult,
} from '../../types/contest';

const initialState = {
  contests: [] as Contest[],
  myContests: [] as Contest[],
  currentContest: undefined as Contest | null | undefined,
  currentSquare: undefined as Square | null | undefined,
  participants: [] as Participant[],
  invites: [] as Invite[],
  contestLoading: false,
  deleteContestLoading: false,
  squareLoading: false,
  participantsLoading: false,
  invitesLoading: false,
  error: null as string | null,
  pagination: { page: 1, limit: 5, total: 0, totalPages: 0, hasNext: false, hasPrevious: false },
};

const mockContest: Contest = {
  id: 'c1',
  name: 'Test Contest',
  xLabels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  yLabels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  homeTeam: 'Home',
  awayTeam: 'Away',
  status: 'ACTIVE',
  visibility: 'public',
  squares: [],
  owner: 'user1',
  createdAt: '',
  updatedAt: '',
  createdBy: 'user1',
  updatedBy: 'user1',
};

const mockSquare: Square = {
  id: 's1',
  contestId: 'c1',
  row: 0,
  col: 0,
  value: 'test',
  owner: 'user1',
  ownerName: 'User 1',
  createdAt: '',
  updatedAt: '',
  createdBy: 'user1',
  updatedBy: 'user1',
};

describe('contestSlice reducers', () => {
  it('should return initial state', () => {
    const state = contestReducer(undefined, { type: 'unknown' });
    expect(state.contests).toEqual([]);
    expect(state.error).toBeNull();
    expect(state.contestLoading).toBe(false);
  });

  it('clearError should set error to null', () => {
    const state = contestReducer({ ...initialState, error: 'some error' }, clearError());
    expect(state.error).toBeNull();
  });

  it('setCurrentContest should set the current contest', () => {
    const state = contestReducer(initialState, setCurrentContest(mockContest));
    expect(state.currentContest).toEqual(mockContest);
  });

  it('setCurrentContest should allow null', () => {
    const state = contestReducer(
      { ...initialState, currentContest: mockContest },
      setCurrentContest(null)
    );
    expect(state.currentContest).toBeNull();
  });

  it('setCurrentSquare should set the current square', () => {
    const state = contestReducer(initialState, setCurrentSquare(mockSquare));
    expect(state.currentSquare).toEqual(mockSquare);
  });

  describe('updateContestFromWebSocket', () => {
    it('should do nothing if no current contest', () => {
      const state = contestReducer(
        initialState,
        updateContestFromWebSocket({ homeTeam: 'New Home' })
      );
      expect(state.currentContest).toBeUndefined();
    });

    it('should update homeTeam', () => {
      const state = contestReducer(
        { ...initialState, currentContest: { ...mockContest } },
        updateContestFromWebSocket({ homeTeam: 'New Home' })
      );
      expect(state.currentContest?.homeTeam).toBe('New Home');
    });

    it('should update awayTeam', () => {
      const state = contestReducer(
        { ...initialState, currentContest: { ...mockContest } },
        updateContestFromWebSocket({ awayTeam: 'New Away' })
      );
      expect(state.currentContest?.awayTeam).toBe('New Away');
    });

    it('should update xLabels and yLabels', () => {
      const state = contestReducer(
        { ...initialState, currentContest: { ...mockContest } },
        updateContestFromWebSocket({ xLabels: [9, 8, 7], yLabels: [6, 5, 4] })
      );
      expect(state.currentContest?.xLabels).toEqual([9, 8, 7]);
      expect(state.currentContest?.yLabels).toEqual([6, 5, 4]);
    });

    it('should update status', () => {
      const state = contestReducer(
        { ...initialState, currentContest: { ...mockContest } },
        updateContestFromWebSocket({ status: 'Q1' })
      );
      expect(state.currentContest?.status).toBe('Q1');
    });
  });

  describe('updateSquareFromWebSocket', () => {
    it('should do nothing if no current contest', () => {
      const state = contestReducer(initialState, updateSquareFromWebSocket(mockSquare));
      expect(state.currentContest).toBeUndefined();
    });

    it('should update existing square by id', () => {
      const contestWithSquare = { ...mockContest, squares: [mockSquare] };
      const updatedSquare = { ...mockSquare, value: 'updated' };
      const state = contestReducer(
        { ...initialState, currentContest: contestWithSquare },
        updateSquareFromWebSocket(updatedSquare)
      );
      expect(state.currentContest?.squares[0].value).toBe('updated');
    });

    it('should not add square if id not found', () => {
      const contestWithSquare = { ...mockContest, squares: [mockSquare] };
      const newSquare = { ...mockSquare, id: 'unknown' };
      const state = contestReducer(
        { ...initialState, currentContest: contestWithSquare },
        updateSquareFromWebSocket(newSquare)
      );
      expect(state.currentContest?.squares).toHaveLength(1);
      expect(state.currentContest?.squares[0].id).toBe('s1');
    });
  });

  describe('updateQuarterResultFromWebSocket', () => {
    const qrPayload = {
      quarter: 1,
      homeTeamScore: 14,
      awayTeamScore: 7,
      winnerRow: 4,
      winnerCol: 7,
      winner: 'user1',
      winnerName: 'User 1',
    };

    it('should do nothing if no current contest', () => {
      const state = contestReducer(initialState, updateQuarterResultFromWebSocket(qrPayload));
      expect(state.currentContest).toBeUndefined();
    });

    it('should add quarter result and advance status to Q2', () => {
      const state = contestReducer(
        { ...initialState, currentContest: { ...mockContest, status: 'Q1', quarterResults: [] } },
        updateQuarterResultFromWebSocket(qrPayload)
      );
      expect(state.currentContest?.quarterResults).toHaveLength(1);
      expect(state.currentContest?.quarterResults?.[0].quarter).toBe(1);
      expect(state.currentContest?.status).toBe('Q2');
    });

    it('should advance status through quarters to FINISHED', () => {
      let state: ReturnType<typeof contestReducer> = {
        ...initialState,
        currentContest: {
          ...mockContest,
          status: 'Q1' as const,
          quarterResults: [] as QuarterResult[],
        },
      };
      for (let q = 1; q <= 4; q++) {
        state = contestReducer(
          state,
          updateQuarterResultFromWebSocket({ ...qrPayload, quarter: q })
        );
      }
      expect(state.currentContest?.quarterResults).toHaveLength(4);
      expect(state.currentContest?.status).toBe('FINISHED');
    });

    it('should initialize quarterResults if undefined', () => {
      const state = contestReducer(
        { ...initialState, currentContest: { ...mockContest, quarterResults: undefined } },
        updateQuarterResultFromWebSocket(qrPayload)
      );
      expect(state.currentContest?.quarterResults).toHaveLength(1);
    });

    it('should not add duplicate quarter result', () => {
      const existing: QuarterResult = {
        id: '',
        contestId: 'c1',
        quarter: 1,
        homeTeamScore: 14,
        awayTeamScore: 7,
        winnerRow: 4,
        winnerCol: 7,
        winner: 'user1',
        winnerName: 'User 1',
        createdAt: '',
        updatedAt: '',
        createdBy: '',
        updatedBy: '',
      };
      const state = contestReducer(
        { ...initialState, currentContest: { ...mockContest, quarterResults: [existing] } },
        updateQuarterResultFromWebSocket(qrPayload)
      );
      expect(state.currentContest?.quarterResults).toHaveLength(1);
    });
  });
});

describe('contestSlice extraReducers', () => {
  describe('fetchContestsByOwner', () => {
    it('pending: sets loading, clears error', () => {
      const state = contestReducer(
        { ...initialState, error: 'old' },
        { type: fetchContestsByOwner.pending.type }
      );
      expect(state.contestLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('fulfilled: sets contests and pagination', () => {
      const payload: PaginatedContestsResponse = {
        contests: [mockContest],
        page: 1,
        limit: 5,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      };
      const state = contestReducer(initialState, {
        type: fetchContestsByOwner.fulfilled.type,
        payload,
      });
      expect(state.contestLoading).toBe(false);
      expect(state.contests).toHaveLength(1);
      expect(state.pagination.total).toBe(1);
    });

    it('rejected: clears contests, sets error', () => {
      const state = contestReducer(initialState, {
        type: fetchContestsByOwner.rejected.type,
        payload: { message: 'fail' },
      });
      expect(state.contestLoading).toBe(false);
      expect(state.contests).toEqual([]);
      expect(state.error).toBe('fail');
    });

    it('rejected: uses default error message', () => {
      const state = contestReducer(initialState, {
        type: fetchContestsByOwner.rejected.type,
        payload: undefined,
      });
      expect(state.error).toBe('Error fetching contests');
    });
  });

  describe('fetchContestByOwnerAndName', () => {
    it('pending: sets loading, clears current contest and error', () => {
      const state = contestReducer(
        { ...initialState, currentContest: mockContest, error: 'old' },
        { type: fetchContestByOwnerAndName.pending.type }
      );
      expect(state.contestLoading).toBe(true);
      expect(state.currentContest).toBeNull();
      expect(state.error).toBeNull();
    });

    it('fulfilled: sets current contest', () => {
      const state = contestReducer(initialState, {
        type: fetchContestByOwnerAndName.fulfilled.type,
        payload: mockContest,
      });
      expect(state.contestLoading).toBe(false);
      expect(state.currentContest).toEqual(mockContest);
    });

    it('rejected: sets error', () => {
      const state = contestReducer(initialState, {
        type: fetchContestByOwnerAndName.rejected.type,
        payload: { message: 'not found' },
      });
      expect(state.error).toBe('not found');
    });
  });

  describe('createContest', () => {
    it('pending: sets loading', () => {
      const state = contestReducer(initialState, {
        type: createContest.pending.type,
      });
      expect(state.contestLoading).toBe(true);
    });

    it('fulfilled: adds contest to list', () => {
      const state = contestReducer(initialState, {
        type: createContest.fulfilled.type,
        payload: mockContest,
      });
      expect(state.contests).toHaveLength(1);
      expect(state.contestLoading).toBe(false);
    });

    it('rejected: sets error', () => {
      const state = contestReducer(initialState, {
        type: createContest.rejected.type,
        payload: { message: 'create fail' },
      });
      expect(state.error).toBe('create fail');
    });
  });

  describe('updateSquare', () => {
    it('pending: sets squareLoading', () => {
      const state = contestReducer(initialState, {
        type: updateSquare.pending.type,
      });
      expect(state.squareLoading).toBe(true);
    });

    it('fulfilled: updates existing square by row/col', () => {
      const contestWithSquare = { ...mockContest, squares: [mockSquare] };
      const updated = { ...mockSquare, value: 'new' };
      const state = contestReducer(
        { ...initialState, currentContest: contestWithSquare },
        { type: updateSquare.fulfilled.type, payload: updated }
      );
      expect(state.currentContest?.squares[0].value).toBe('new');
      expect(state.squareLoading).toBe(false);
    });

    it('fulfilled: pushes new square if not found', () => {
      const state = contestReducer(
        { ...initialState, currentContest: { ...mockContest, squares: [] } },
        { type: updateSquare.fulfilled.type, payload: mockSquare }
      );
      expect(state.currentContest?.squares).toHaveLength(1);
    });

    it('fulfilled: does nothing if no current contest', () => {
      const state = contestReducer(initialState, {
        type: updateSquare.fulfilled.type,
        payload: mockSquare,
      });
      expect(state.currentContest).toBeUndefined();
    });

    it('rejected: sets error', () => {
      const state = contestReducer(initialState, {
        type: updateSquare.rejected.type,
        payload: { message: 'square error' },
      });
      expect(state.error).toBe('square error');
      expect(state.squareLoading).toBe(false);
    });
  });

  describe('clearSquare', () => {
    it('fulfilled: updates existing square', () => {
      const cleared = { ...mockSquare, value: '', owner: '' };
      const state = contestReducer(
        { ...initialState, currentContest: { ...mockContest, squares: [mockSquare] } },
        { type: clearSquare.fulfilled.type, payload: cleared }
      );
      expect(state.currentContest?.squares[0].value).toBe('');
      expect(state.squareLoading).toBe(false);
    });

    it('fulfilled: does nothing if square not found', () => {
      const cleared = { ...mockSquare, row: 9, col: 9 };
      const state = contestReducer(
        { ...initialState, currentContest: { ...mockContest, squares: [mockSquare] } },
        { type: clearSquare.fulfilled.type, payload: cleared }
      );
      expect(state.currentContest?.squares[0].value).toBe('test');
    });
  });

  describe('startContestThunk', () => {
    it('fulfilled: updates current contest', () => {
      const started = { ...mockContest, status: 'Q1' as const };
      const state = contestReducer(
        { ...initialState, currentContest: mockContest },
        { type: startContestThunk.fulfilled.type, payload: started }
      );
      expect(state.currentContest?.status).toBe('Q1');
    });

    it('fulfilled: does nothing if no current contest', () => {
      const state = contestReducer(initialState, {
        type: startContestThunk.fulfilled.type,
        payload: mockContest,
      });
      expect(state.currentContest).toBeUndefined();
    });

    it('rejected: sets error', () => {
      const state = contestReducer(initialState, {
        type: startContestThunk.rejected.type,
        payload: { message: 'start fail' },
      });
      expect(state.error).toBe('start fail');
    });
  });

  describe('updateContest', () => {
    it('fulfilled: updates currentContest if same id', () => {
      const updated = { ...mockContest, homeTeam: 'Updated Home' };
      const state = contestReducer(
        { ...initialState, currentContest: mockContest },
        { type: updateContest.fulfilled.type, payload: updated }
      );
      expect(state.currentContest?.homeTeam).toBe('Updated Home');
    });

    it('fulfilled: updates contest in list', () => {
      const updated = { ...mockContest, homeTeam: 'Updated Home' };
      const state = contestReducer(
        { ...initialState, contests: [mockContest] },
        { type: updateContest.fulfilled.type, payload: updated }
      );
      expect(state.contests[0].homeTeam).toBe('Updated Home');
    });
  });

  describe('deleteContest', () => {
    it('pending: sets deleteContestLoading', () => {
      const state = contestReducer(initialState, {
        type: deleteContest.pending.type,
      });
      expect(state.deleteContestLoading).toBe(true);
    });

    it('fulfilled: removes contest and clears current', () => {
      const state = contestReducer(
        { ...initialState, contests: [mockContest], currentContest: mockContest },
        { type: deleteContest.fulfilled.type }
      );
      expect(state.contests).toHaveLength(0);
      expect(state.currentContest).toBeNull();
      expect(state.deleteContestLoading).toBe(false);
    });

    it('rejected: sets error', () => {
      const state = contestReducer(initialState, {
        type: deleteContest.rejected.type,
        payload: { message: 'delete fail' },
      });
      expect(state.error).toBe('delete fail');
      expect(state.deleteContestLoading).toBe(false);
    });
  });

  describe('updateQuarterResult', () => {
    const qr: QuarterResult = {
      id: 'qr1',
      contestId: 'c1',
      quarter: 1,
      homeTeamScore: 14,
      awayTeamScore: 7,
      winnerRow: 4,
      winnerCol: 7,
      winner: 'user1',
      winnerName: 'User 1',
      createdAt: '',
      updatedAt: '',
      createdBy: '',
      updatedBy: '',
    };

    it('fulfilled: adds quarter result and advances status', () => {
      const state = contestReducer(
        { ...initialState, currentContest: { ...mockContest, status: 'Q1', quarterResults: [] } },
        { type: updateQuarterResult.fulfilled.type, payload: qr }
      );
      expect(state.currentContest?.quarterResults).toHaveLength(1);
      expect(state.currentContest?.status).toBe('Q2');
    });

    it('fulfilled: does not add duplicate quarter', () => {
      const state = contestReducer(
        { ...initialState, currentContest: { ...mockContest, quarterResults: [qr] } },
        { type: updateQuarterResult.fulfilled.type, payload: qr }
      );
      expect(state.currentContest?.quarterResults).toHaveLength(1);
    });

    it('fulfilled: does nothing if no current contest', () => {
      const state = contestReducer(initialState, {
        type: updateQuarterResult.fulfilled.type,
        payload: qr,
      });
      expect(state.currentContest).toBeUndefined();
    });

    it('rejected: sets error', () => {
      const state = contestReducer(initialState, {
        type: updateQuarterResult.rejected.type,
        payload: { message: 'qr fail' },
      });
      expect(state.error).toBe('qr fail');
    });
  });

  describe('fetchMyContests', () => {
    it('pending: sets loading', () => {
      const state = contestReducer(initialState, {
        type: fetchMyContests.pending.type,
      });
      expect(state.contestLoading).toBe(true);
    });

    it('fulfilled: sets myContests', () => {
      const state = contestReducer(initialState, {
        type: fetchMyContests.fulfilled.type,
        payload: [mockContest],
      });
      expect(state.myContests).toHaveLength(1);
      expect(state.contestLoading).toBe(false);
    });

    it('rejected: sets error', () => {
      const state = contestReducer(initialState, {
        type: fetchMyContests.rejected.type,
        payload: { message: 'fetch fail' },
      });
      expect(state.error).toBe('fetch fail');
    });
  });

  describe('fetchParticipants', () => {
    const mockParticipant: Participant = {
      id: 'p1',
      contestId: 'c1',
      userId: 'u1',
      inviteId: 'i1',
      role: 'participant',
      maxSquares: 10,
      joinedAt: '',
      createdAt: '',
      updatedAt: '',
    };

    it('pending: sets participantsLoading', () => {
      const state = contestReducer(initialState, {
        type: fetchParticipants.pending.type,
      });
      expect(state.participantsLoading).toBe(true);
    });

    it('fulfilled: sets participants', () => {
      const state = contestReducer(initialState, {
        type: fetchParticipants.fulfilled.type,
        payload: [mockParticipant],
      });
      expect(state.participants).toHaveLength(1);
      expect(state.participantsLoading).toBe(false);
    });

    it('rejected: sets error', () => {
      const state = contestReducer(initialState, {
        type: fetchParticipants.rejected.type,
        payload: { message: 'participants fail' },
      });
      expect(state.error).toBe('participants fail');
    });
  });

  describe('updateContestParticipant', () => {
    const mockParticipant: Participant = {
      id: 'p1',
      contestId: 'c1',
      userId: 'u1',
      inviteId: 'i1',
      role: 'participant',
      maxSquares: 10,
      joinedAt: '',
      createdAt: '',
      updatedAt: '',
    };

    it('fulfilled: updates participant in list', () => {
      const updated = { ...mockParticipant, maxSquares: 20 };
      const state = contestReducer(
        { ...initialState, participants: [mockParticipant] },
        { type: updateContestParticipant.fulfilled.type, payload: updated }
      );
      expect(state.participants[0].maxSquares).toBe(20);
    });

    it('rejected: sets error', () => {
      const state = contestReducer(initialState, {
        type: updateContestParticipant.rejected.type,
        payload: { message: 'update participant fail' },
      });
      expect(state.error).toBe('update participant fail');
    });
  });

  describe('removeContestParticipant', () => {
    const mockParticipant: Participant = {
      id: 'p1',
      contestId: 'c1',
      userId: 'u1',
      inviteId: 'i1',
      role: 'participant',
      maxSquares: 10,
      joinedAt: '',
      createdAt: '',
      updatedAt: '',
    };

    it('fulfilled: removes participant by userId', () => {
      const state = contestReducer(
        { ...initialState, participants: [mockParticipant] },
        { type: removeContestParticipant.fulfilled.type, payload: 'u1' }
      );
      expect(state.participants).toHaveLength(0);
    });

    it('rejected: sets error', () => {
      const state = contestReducer(initialState, {
        type: removeContestParticipant.rejected.type,
        payload: { message: 'remove fail' },
      });
      expect(state.error).toBe('remove fail');
    });
  });

  describe('fetchInvites', () => {
    const mockInvite: Invite = {
      id: 'i1',
      contestId: 'c1',
      token: 'tok',
      maxSquares: 10,
      role: 'participant',
      uses: 0,
      createdAt: '',
      createdBy: '',
      updatedAt: '',
    };

    it('pending: sets invitesLoading', () => {
      const state = contestReducer(initialState, {
        type: fetchInvites.pending.type,
      });
      expect(state.invitesLoading).toBe(true);
    });

    it('fulfilled: sets invites', () => {
      const state = contestReducer(initialState, {
        type: fetchInvites.fulfilled.type,
        payload: [mockInvite],
      });
      expect(state.invites).toHaveLength(1);
      expect(state.invitesLoading).toBe(false);
    });

    it('rejected: sets error', () => {
      const state = contestReducer(initialState, {
        type: fetchInvites.rejected.type,
        payload: { message: 'invites fail' },
      });
      expect(state.error).toBe('invites fail');
    });
  });

  describe('createContestInvite', () => {
    it('rejected: sets error', () => {
      const state = contestReducer(initialState, {
        type: createContestInvite.rejected.type,
        payload: { message: 'invite create fail' },
      });
      expect(state.error).toBe('invite create fail');
    });
  });

  describe('deleteContestInvite', () => {
    const mockInvite: Invite = {
      id: 'i1',
      contestId: 'c1',
      token: 'tok',
      maxSquares: 10,
      role: 'participant',
      uses: 0,
      createdAt: '',
      createdBy: '',
      updatedAt: '',
    };

    it('fulfilled: removes invite by id', () => {
      const state = contestReducer(
        { ...initialState, invites: [mockInvite] },
        { type: deleteContestInvite.fulfilled.type, payload: 'i1' }
      );
      expect(state.invites).toHaveLength(0);
    });

    it('rejected: sets error', () => {
      const state = contestReducer(initialState, {
        type: deleteContestInvite.rejected.type,
        payload: { message: 'invite delete fail' },
      });
      expect(state.error).toBe('invite delete fail');
    });
  });
});
